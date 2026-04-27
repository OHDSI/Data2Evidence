import { request } from "./request";
const CONCEPT_MAPPING_URL = "concept-mapping";

export class ConceptMapping {
  public getConceptMappings = (databaseCode: string, schemaName: string) => {
    return request({
      baseURL: CONCEPT_MAPPING_URL,
      method: "GET",
      params: {
        databaseCode: databaseCode,
        schemaName: schemaName,
      },
    });
  };

  public saveConceptMappings = (
    databaseCode: string,
    schemaName: string,
    sourceVocabularyId: string,
    conceptMappings: string
  ) => {
    return request({
      baseURL: CONCEPT_MAPPING_URL,
      method: "POST",
      params: {
        databaseCode,
        schemaName,
      },
      data: {
        sourceVocabularyId,
        conceptMappings,
      },
    });
  };
}
