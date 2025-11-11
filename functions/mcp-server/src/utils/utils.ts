import { WebAPIAPI } from "../api/WebAPIAPI";
import Papa from "papaparse";

interface CohortData {
  cohortId: string;
  cohortName: string;
  cohortDescription: string;
}

interface PhenotypeData {
  cohortId: string;
  cohortName: string;
  cohortNameFormatted: string;
  cohortNameLong: string;
  logicDescription: string;
}

export async function fetchPhenotypeData(): Promise<PhenotypeData[]> {
  const url =
    "https://raw.githubusercontent.com/OHDSI/PhenotypeLibrary/main/inst/Cohorts.csv";
  const response = await fetch(url);
  const csvText = await response.text();

  const { data } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  // Extract only the columns we need and ensure type safety
  return (data as any[]).map((row) => ({
    cohortId: String(row.cohortId || ""),
    cohortName: String(row.cohortName || ""),
    cohortNameFormatted: String(row.cohortNameFormatted || ""),
    cohortNameLong: String(row.cohortNameLong || ""),
    logicDescription: String(row.logicDescription || ""),
  }));
}

export async function fetchCohortData(): Promise<CohortData[]> {
  // Fetch cohort data from d2e-webapi service
  const webapi = new WebAPIAPI();
  const data = await webapi.getAtlasCohortDefinitionList();

  // Map to correct field names
  return (data as any[]).map((cohort) => ({
    cohortId: String(cohort.id),
    cohortName: cohort.name,
    cohortDescription: cohort.description || "",
  }));
}

export async function fetchCohortDefinitionTemplate(
  phenotypeId: number
): Promise<void> {
  const url = `https://raw.githubusercontent.com/OHDSI/PhenotypeLibrary/main/inst/cohorts/${phenotypeId}.json`;
  const response = await fetch(url);
  let result = (await response.json()) || undefined;
  if (result === undefined) {
    result = response.text();
  }
  return result;
}
