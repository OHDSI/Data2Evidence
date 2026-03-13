/**
 * OHDSI Phenotype Library Helpers
 * Utility functions for fetching data from OHDSI Phenotype Library
 */

import Papa from "papaparse";
import { readFileSync } from "node:fs";
import {
  PHENOTYPE_LIBRARY_COHORT_TEMPLATE,
  PHENOTYPE_LIBRARY_COHORTS,
} from "../env";
import type { PhenotypeData } from "../types/tool-schemas";
import {
  loadEmbeddingCache,
  semanticSearch,
  type PhenotypeWithEmbedding,
} from "./embedding-helpers";

/**
 * Fetch all phenotypes from OHDSI Phenotype Library
 */
export async function fetchPhenotypeData(): Promise<PhenotypeData[]> {
  const file = readFileSync(PHENOTYPE_LIBRARY_COHORTS, "utf-8");
  const parsed = Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
  });

  return (parsed.data as any[]).map((row) => ({
    cohortId: String(row.cohortId || ""),
    cohortName: String(row.cohortName || ""),
    // cohortNameFormatted: String(row.cohortNameFormatted || ""),
    // cohortNameLong: String(row.cohortNameLong || ""),
    // logicDescription: String(row.logicDescription || ""),
  }));
}

/**
 * Fetch cohort definition template by phenotype ID from local submodule
 */
export function fetchCohortDefinitionTemplate(
  phenotypeId: number
): any {
  const filePath = `${PHENOTYPE_LIBRARY_COHORT_TEMPLATE}/${phenotypeId}.json`;
  const file = readFileSync(filePath, "utf-8");
  return JSON.parse(file);
}

export async function searchPhenotypes(
  searchTerm?: string,
  useSemanticSearch: boolean = false,
  topK: number = 10,
): Promise<PhenotypeData[]> {
  // If no search term, return all phenotypes
  if (!searchTerm) {
    return fetchPhenotypeData();
  }

  // Semantic search using embeddings
  if (useSemanticSearch) {
    const cache = loadEmbeddingCache();
    if (!cache) {
      console.warn(
        "Embedding cache not available, falling back to substring search",
      );
      // Fallback to substring search
      const allPhenotypes = await fetchPhenotypeData();
      const lowerSearch = searchTerm.toLowerCase();
      return allPhenotypes.filter((p) =>
        p.cohortName.toLowerCase().includes(lowerSearch),
      );
    }
    return semanticSearch(searchTerm, cache, topK);
  }

  // Fallback: Simple substring search
  const allPhenotypes = await fetchPhenotypeData();
  const lowerSearch = searchTerm.toLowerCase();
  return allPhenotypes.filter((p) =>
    p.cohortName.toLowerCase().includes(lowerSearch),
  );
}
