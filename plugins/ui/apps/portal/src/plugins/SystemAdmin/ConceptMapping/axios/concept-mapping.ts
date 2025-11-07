import { request } from "../../../../axios/request";
const CONCEPT_MAPPING_URL = "concept-mapping";

export class ConceptMapping {
  public getConceptMappings = (datasetId: string) => {
    return request({
      baseURL: CONCEPT_MAPPING_URL,
      method: "GET",
      params: {
        datasetId: datasetId,
      },
    });
  };

  public saveConceptMappings = (datasetId: string, sourceVocabularyId: string, conceptMappings: string) => {
    return request({
      baseURL: CONCEPT_MAPPING_URL,
      method: "POST",
      params: {
        datasetId: datasetId,
      },
      data: {
        sourceVocabularyId: sourceVocabularyId,
        conceptMappings: conceptMappings,
      },
    });
  };
}
