import { WebAPIAPI } from "../api/WebAPIAPI";

interface CohortData {
  cohortId: string;
  cohortName: string;
  cohortDescription: string;
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
