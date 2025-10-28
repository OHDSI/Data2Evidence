import Papa from "papaparse";

interface CohortData {
  cohortId: string;
  cohortName: string;
  cohortNameFormatted: string;
  cohortNameLong: string;
  logicDescription: string;
}

export async function fetchCohortData(): Promise<CohortData[]> {
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
