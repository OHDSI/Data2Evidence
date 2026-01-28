import { TrexDAO } from "../dao/trex.dao.ts";
import { ICdmresultsConceptRecordCountResponseDto } from "../dto/cdmresults.ts";
import { JobPluginsAPI } from "../api/JobPluginsAPI.ts";

export const getConceptRecordCount = async (
  token: string,
  datasetId: string,
  conceptIds: number[]
): Promise<ICdmresultsConceptRecordCountResponseDto> => {
  const trexDao = await TrexDAO.getTrexDao(token, datasetId);

  const jobPluginsApi = new JobPluginsAPI(token);
  const dcResultsSchemaName =
    await jobPluginsApi.getLatestSuccessfulDataCharacterizationResultsSchemaName(
      datasetId
    );

  const results = await trexDao.getConceptRecordCount(
    conceptIds,
    dcResultsSchemaName
  );
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
