/**
 * OHDSI Phenotype Library Helpers
 * Utility functions for fetching data from OHDSI Phenotype Library
 */

import Papa from "papaparse";
import { readFileSync } from "node:fs";
import {
  PHENOTYPE_LIBRARY_COHORT_TEMPLATE,
  PHENOTYPE_LIBRARY_COHORTS,
} from "../config/server.config";
import type { PhenotypeData } from "../types/tool-schemas";

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
    cohortNameFormatted: String(row.cohortNameFormatted || ""),
    cohortNameLong: String(row.cohortNameLong || ""),
    logicDescription: String(row.logicDescription || ""),
  }));
}

/**
 * Fetch cohort definition template by phenotype ID
 */
export async function fetchCohortDefinitionTemplate(
  phenotypeId: number
): Promise<any> {
  const url = PHENOTYPE_LIBRARY_COHORT_TEMPLATE(phenotypeId);
  const response = await fetch(url);

  try {
    return await response.json();
  } catch (e) {
    return await response.text();
  }
}
