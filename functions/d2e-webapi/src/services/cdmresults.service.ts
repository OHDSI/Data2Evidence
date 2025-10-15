import { TrexDAO } from "../dao/trex.dao.ts";
import { ICdmresultsConceptRecordCountResponseDto } from "../dto/cdmresults.ts";

export const getConceptRecordCount = async (
  token: string,
  datasetId: string,
  conceptIds: number[]
): Promise<ICdmresultsConceptRecordCountResponseDto> => {
  const trexDao = await TrexDAO.getTrexDao(token, datasetId);
  const results = await trexDao.getConceptRecordCount(conceptIds);

  const mappedResults: ICdmresultsConceptRecordCountResponseDto = results.map(
    (e) => ({
      [e.concept_id.toString()]: [
        e.record_count,
        e.descendant_record_count,
        e.person_count,
        e.descendant_person_count,
      ],
    })
  );

  // Add array of [0,0,0,0] as value to conceptIds not in results
  const conceptIdsAbsentFromResults = new Set(conceptIds).difference(
    new Set(results.map((e) => e.concept_id))
  );
  for (const conceptId of conceptIdsAbsentFromResults) {
    mappedResults.push({
      [conceptId.toString()]: [0, 0, 0, 0],
    });
  }

  return mappedResults;
};
