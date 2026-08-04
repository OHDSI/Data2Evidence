import { request } from "./request";
const CONCEPT_MAPPING_URL = "concept-mapping";

export class ConceptMapping {
  public getConceptMappings = (databaseCode: string, schemaName: string, datasetId?: string) => {
    return request({
      baseURL: CONCEPT_MAPPING_URL,
      method: "GET",
      params: {
        databaseCode: databaseCode,
        schemaName: schemaName,
        // Lets the service read the dataset's persisted cacheId instead of
        // falling back to the databaseCode, which is not per-dataset.
        ...(datasetId ? { datasetId } : {}),
      },
    });
  };

  public saveConceptMappings = (
    databaseCode: string,
    schemaName: string,
    sourceVocabularyId: string,
    conceptMappings: string,
    datasetId?: string
  ) => {
    return request({
      baseURL: CONCEPT_MAPPING_URL,
      method: "POST",
      params: {
        databaseCode,
        schemaName,
        ...(datasetId ? { datasetId } : {}),
      },
      data: {
        sourceVocabularyId,
        conceptMappings,
      },
    });
  };
}
