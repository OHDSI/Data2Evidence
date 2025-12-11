/**
 * OHDSI Phenotype Library Helpers
 * Utility functions for fetching data from OHDSI Phenotype Library
 */

import Papa from "papaparse";
import { EXTERNAL_APIS } from "../config/server.config";
import type { PhenotypeData } from "../types/tool-schemas";

/**
 * Fetch all phenotypes from OHDSI Phenotype Library
 */
export async function fetchPhenotypeData(): Promise<PhenotypeData[]> {
  const response = await fetch(EXTERNAL_APIS.PHENOTYPE_LIBRARY_COHORTS);
  const csvText = await response.text();

  const { data } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return (data as any[]).map((row) => ({
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
  const url = EXTERNAL_APIS.PHENOTYPE_LIBRARY_COHORT_TEMPLATE(phenotypeId);
  const response = await fetch(url);

  try {
    return await response.json();
  } catch (e) {
    return await response.text();
  }
}
