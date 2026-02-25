/**
 * Embedding utilities for semantic search
 * Uses Supabase.ai GTE-small model (requires Supabase/Trex runtime)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "npm:papaparse@^5.4.1";
import type { PhenotypeData } from "../types/tool-schemas";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Calculate cache path directly (same logic as env.ts but without validation)
const PHENOTYPE_LIBRARY_BASE_PATH = join(__dirname, "..", "..", "data").replace(
  /\/var\/tmp\/sb-compile-trex/,
  Deno.env.get("TREX_FUNCTION_PATH") || "",
);

const PHENOTYPE_EMBEDDINGS_CACHE = join(
  PHENOTYPE_LIBRARY_BASE_PATH,
  "phenotype-embeddings.json",
);

const COHORTS_CSV = join(PHENOTYPE_LIBRARY_BASE_PATH, "Cohorts.csv");

export interface PhenotypeWithEmbedding extends PhenotypeData {
  embedding?: number[];
}

/**
 * Initialize embeddings: load from cache or auto-generate if missing
 * @param autoGenerate - If true, generates embeddings if cache doesn't exist
 * @returns true if embeddings are available, false otherwise
 */
export async function initializeEmbeddings(
  autoGenerate: boolean = true,
): Promise<boolean> {
  // Check if cache exists
  if (existsSync(PHENOTYPE_EMBEDDINGS_CACHE)) {
    console.log("Embedding cache found, using cached embeddings");
    return true;
  }

  if (!autoGenerate) {
    console.log("Embedding cache not found and auto-generation disabled");
    return false;
  }

  // Auto-generate embeddings
  console.log("Embedding cache not found, generating embeddings...");
  try {
    await generateEmbeddingsFromCSV(COHORTS_CSV, PHENOTYPE_EMBEDDINGS_CACHE);
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

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between 0 and 1 (1 = identical, 0 = orthogonal)
 */
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

/**
 * Generate embeddings for all phenotypes from CSV file
 * NOTE: Must run in Supabase/Trex environment (requires Supabase.ai global)
 */
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
  console.log(
    `Generating embeddings for ${phenotypes.length} phenotypes (estimated 2-5 minutes)...`,
  );

  const withEmbeddings: PhenotypeWithEmbedding[] = [];
  const batchSize = 10;
  const totalBatches = Math.ceil(phenotypes.length / batchSize);

  for (let i = 0; i < phenotypes.length; i += batchSize) {
    const batch = phenotypes.slice(
      i,
      Math.min(i + batchSize, phenotypes.length),
    );
    const currentBatch = Math.floor(i / batchSize) + 1;

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

  // Save to file
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
  console.log("\nEmbedding generation complete.");
}
