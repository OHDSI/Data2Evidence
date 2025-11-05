import { WebAPIAPI } from "../api/WebAPIAPI";

interface CohortData {
  cohortId: string;
  cohortName: string;
  cohortDescription: string;
}

export async function fetchCohortData(
  authToken: string,
  datasetID: string
): Promise<CohortData[]> {
  const webapi = new WebAPIAPI(authToken, datasetID);
  const data = await webapi.getAtlasCohortDefinitionList();

  // Data is already JSON array, map to correct field names
  return (data as any[]).map((cohort) => ({
    cohortId: String(cohort.id), // Field is 'id', not 'cohortId'
    cohortName: cohort.name, // Field is 'name', not 'cohortName'
    cohortDescription: cohort.description || "", // Field is 'description', not 'logicDescription'
  }));
}
