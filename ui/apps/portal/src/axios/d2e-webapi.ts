import { request } from "./request";
import {
  ConceptSet,
  ConceptSetWithConceptDetails,
  FhirConceptMap,
  FhirValueSet,
  FilterOptions,
  Concept,
  ConceptHierarchyResponse,
  StandardConcepts,
  IWebapiConcept,
  IWebapiConceptRelated,
} from "../plugins/Researcher/Terminology/utils/types";

import { RowObject } from "../plugins/SystemAdmin/ConceptMapping/types";

type IConcept = {
  CONCEPT_CLASS_ID?: string;
  CONCEPT_CODE?: string;
  CONCEPT_ID?: number;
  CONCEPT_NAME?: string;
  DOMAIN_ID?: string;
  INVALID_REASON?: string;
  INVALID_REASON_CAPTION?: string;
  STANDARD_CONCEPT?: string;
  STANDARD_CONCEPT_CAPTION?: string;
  VOCABULARY_ID?: string;
  VALID_START_DATE?: string | number;
  VALID_END_DATE?: string | number;
};

const D2E_WEBAPI_BASE_URL = "d2e-webapi";

export class D2eWebapi {
  public getTerminologies(
    page: number,
    rowsPerPage: number,
    datasetId: string,
    searchText: string,
    conceptClassId: string[],
    domainId: string[],
    vocabularyId: string[],
    standardConcept: string[],
    validity: string[]
  ): Promise<IWebapiConcept[]> {
    const data = {
      QUERY: searchText,
      CONCEPT_CLASS_ID: conceptClassId,
      DOMAIN_ID: domainId,
      VOCABULARY_ID: vocabularyId,
      STANDARD_CONCEPT: standardConcept[0],
      INVALID_REASON: validity[0],
    };
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("rowsPerPage", String(rowsPerPage));

    return request({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/vocabulary/${datasetId}/search?${params}`,
      method: "POST",
      data,
      headers: { datasetid: datasetId },
    });
  }

  // TODO: Discuss implementation
  // public getTerminologyConnections(conceptId: number, datasetId: string): Promise<IWebapiConceptRelated[]> {
  //   return request({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/vocabulary/${datasetId}/concept/${conceptId}/related`,
  //     method: "GET",
  //     headers: { datasetid: datasetId },
  //   });
  // }

  // TODO: Discuss implementation
  // public getRecommendedConcepts(conceptIds: number[], datasetId: string) {
  //   return request<Concept[]>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/vocabulary/${datasetId}/lookup/recommended`,
  //     method: "POST",
  //     data: conceptIds,
  //     headers: { datasetid: datasetId },
  //   });
  // }

  // CONCEPT SETS

  // public getConceptSets(datasetId: string) {
  //   return request<ConceptSetWithConceptDetails[]>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/concept-set?datasetId=${datasetId}`,
  //     method: "GET",
  //   });
  // }

  // public getConceptSet(conceptSetId: number, datasetId: string) {
  //   return request<ConceptSetWithConceptDetails>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/concept-set/${conceptSetId}?datasetId=${datasetId}`,
  //     method: "GET",
  //   });
  // }

  // public removeConceptSet(conceptSetId: number, datasetId: string) {
  //   return request<number>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/concept-set/${conceptSetId}?datasetId=${datasetId}`,
  //     method: "DELETE",
  //   });
  // }

  // public createConceptSet(conceptSet: Omit<ConceptSet, "id">, datasetId: string) {
  //   return request<number>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/concept-set?datasetId=${datasetId}`,
  //     method: "POST",
  //     data: conceptSet,
  //   });
  // }

  // public updateConceptSet(conceptSetId: number, conceptSet: Partial<ConceptSet>, datasetId: string) {
  //   return request<number | { statusCode: number }>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/concept-set/${conceptSetId}?datasetId=${datasetId}`,
  //     method: "PUT",
  //     data: conceptSet,
  //   });
  // }
}

export const d2eWebapiApi = new D2eWebapi();
