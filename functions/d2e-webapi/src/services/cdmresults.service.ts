import { TrexDAO } from "../dao/trex.dao.ts";
import { ICdmresultsConceptRecordCountResponseDto } from "../dto/cdmresults.ts";
import { JobPluginsAPI } from "../api/JobPluginsAPI.ts";
import { IConceptRecordCount } from "../dao/types.ts";

export const getConceptRecordCount = async (
  token: string,
  datasetId: string,
  conceptIds: number[]
): Promise<ICdmresultsConceptRecordCountResponseDto> => {
  const jobPluginsApi = new JobPluginsAPI(token);
  const dcResultSchemaName =
    await jobPluginsApi.getConceptRecordsCountResultsSchemaName(datasetId);

  let results: IConceptRecordCount[] = [];
  try {
    const trexDao = await TrexDAO.getTrexDao(token, datasetId);
    results = await trexDao.getConceptRecordCount(
      conceptIds,
      dcResultSchemaName
    );
  } catch (error) {
    // HOTFIX:
    // If there is an issue with db connection or query to get concept count,
    // dont throw error, instead log error message and set results to empty array
    console.error(`Error querying for concept record count: ${error}`);
    results = [];
  }

  const mappedResults: ICdmresultsConceptRecordCountResponseDto = results.map(
    (e) => ({
      [e.CONCEPT_ID.toString()]: [
        e.RECORD_COUNT,
        e.DESCENDANT_RECORD_COUNT,
        e.PERSON_COUNT,
        e.DESCENDANT_PERSON_COUNT,
      ],
    })
  );

  // Add array of [0,0,0,0] as value to conceptIds not in results
  const conceptIdsAbsentFromResults = new Set(conceptIds).difference(
    new Set(results.map((e) => e.CONCEPT_ID))
  );
  for (const conceptId of conceptIdsAbsentFromResults) {
    mappedResults.push({
      [conceptId.toString()]: [0, 0, 0, 0],
    });
  }

  return mappedResults;
};
