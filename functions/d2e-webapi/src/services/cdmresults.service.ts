import { TrexDAO } from "../dao/trex.dao.ts";
import { ICdmresultsConceptRecordCountResponseDto } from "../dto/cdmresults.ts";

export const getConceptRecordCount = async (
  token: string,
  datasetId: string,
  conceptIds: number[]
): Promise<ICdmresultsConceptRecordCountResponseDto> => {
  const trexDao = await TrexDAO.getTrexDao(token, datasetId);

  // TODO: Get dc results schema from datasetId
  // TODO: REMOVE hardcode for testing
  // const dcResultSchemaName = `cdmdefault_dc_1760603594959`;
  const dcResultSchemaName = `demo_cdm_dc_1760606157168`;
  // const dcResultSchemaName = `CDMSYNPUF1K_DC_1761023111166`;

  const results = await trexDao.getConceptRecordCount(
    conceptIds,
    dcResultSchemaName
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
