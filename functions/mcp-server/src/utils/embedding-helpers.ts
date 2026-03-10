import { readFileSync, writeFileSync, existsSync } from "node:fs";
import Papa from "npm:papaparse@^5.4.1";
import type { PhenotypeData } from "../types/tool-schemas";
import { PHENOTYPE_LIBRARY_COHORTS, PHENOTYPE_EMBEDDINGS_CACHE } from "../env";

export interface PhenotypeWithEmbedding extends PhenotypeData {
  embedding?: number[];
}

export async function initializeEmbeddings(
  autoGenerate: boolean = true,
): Promise<boolean> {
  if (existsSync(PHENOTYPE_EMBEDDINGS_CACHE)) {
    return true;
  }

  if (!autoGenerate) {
    return false;
  }

  console.log("Embedding cache not found, generating embeddings...");
  try {
    await generateEmbeddingsFromCSV(
      PHENOTYPE_LIBRARY_COHORTS,
      PHENOTYPE_EMBEDDINGS_CACHE,
    );
    return true;
  } catch (error) {
    console.error("Failed to generate embeddings:", error);
    return false;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // @ts-ignore - Supabase global available in Deno/Trex environment
    const session = new Supabase.ai.Session("gte-small");
    const embedding = await session.run(text, {
      mean_pool: true,
      normalize: true,
    });
    return embedding as number[];
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(
      `Error in embedding generation: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export function loadEmbeddingCache(): PhenotypeWithEmbedding[] | null {
  try {
    if (!existsSync(PHENOTYPE_EMBEDDINGS_CACHE)) {
      return null;
    }
    const content = readFileSync(PHENOTYPE_EMBEDDINGS_CACHE, "utf-8");
    const data = JSON.parse(content);
    return data;
  } catch (error) {
    console.error("Error loading embedding cache:", error);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

export async function semanticSearch(
  query: string,
  phenotypes: PhenotypeWithEmbedding[],
  topK: number = 10,
): Promise<Array<PhenotypeData & { similarity: number }>> {
  // Load or generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Calculate similarities
  const results = phenotypes
    .filter((p) => p.embedding && p.embedding.length > 0)
    .map((p) => ({
      cohortId: p.cohortId,
      cohortName: p.cohortName,
      similarity: cosineSimilarity(queryEmbedding, p.embedding!),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

// ============================================================================
// Batch Embedding Generation (for use in Supabase/Trex runtime only)
// ============================================================================

export async function generateEmbeddingsFromCSV(
  csvPath: string,
  outputPath: string,
): Promise<void> {
  console.log("Phenotype Library Embedding Generation\n");

  // Load phenotypes
  const file = readFileSync(csvPath, "utf-8");
  const parsed = Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
  });

  const phenotypes = (parsed.data as any[]).map((row) => ({
    cohortId: String(row.cohortId || ""),
    cohortName: String(row.cohortName || ""),
  }));

  console.log(`Loaded ${phenotypes.length} phenotypes from CSV`);

  // Generate embeddings in batches
  const withEmbeddings: PhenotypeWithEmbedding[] = [];
  const batchSize = 10;
  const totalBatches = Math.ceil(phenotypes.length / batchSize);

  for (let i = 0; i < phenotypes.length; i += batchSize) {
    const batch = phenotypes.slice(
      i,
      Math.min(i + batchSize, phenotypes.length),
    );
    const currentBatch = Math.floor(i / batchSize) + 1;

    // Generate embeddings for the batch in parallel
    const batchPromises = batch.map(async (phenotype) => {
      try {
        const embedding = await generateEmbedding(phenotype.cohortName);
        return { ...phenotype, embedding };
      } catch (error) {
        console.error(
          `Failed to generate embedding for ${phenotype.cohortId}: ${phenotype.cohortName}`,
        );
        return phenotype;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    withEmbeddings.push(...batchResults);

    const progress = Math.min(i + batchSize, phenotypes.length);
    const percentage = Math.round((progress / phenotypes.length) * 100);
    console.log(
      `Batch ${currentBatch}/${totalBatches} - ${progress}/${phenotypes.length} (${percentage}%)`,
    );

    if (i + batchSize < phenotypes.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Save to file, current size is around 12MB for 1100+ phenotypes
  const content = JSON.stringify(withEmbeddings, null, 2);
  writeFileSync(outputPath, content, "utf-8");

  const successCount = withEmbeddings.filter((p) => p.embedding).length;
  const failCount = withEmbeddings.length - successCount;
  const stats = Deno.statSync(outputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(
    `Saved ${successCount}/${withEmbeddings.length} embeddings to ${outputPath} (${sizeMB} MB)`,
  );
  if (failCount > 0) {
    console.warn(`Failed to generate ${failCount} embeddings`);
  }
}
