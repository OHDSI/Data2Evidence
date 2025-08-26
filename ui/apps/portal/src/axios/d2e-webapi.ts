import { request } from "./request";
import {
  IWebapiConcept,
  IWebapiConceptSet,
  IWebapiConceptSetExpression,
} from "../plugins/Researcher/Terminology/utils/types";

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

  public getConceptSets(datasetId: string) {
    return request<IWebapiConceptSet[]>({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset`,
      method: "GET",
      headers: { datasetid: datasetId },
    });
  }

  public getConceptSet(conceptSetId: number, datasetId: string) {
    return request<IWebapiConceptSet>({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset/${conceptSetId}`,
      method: "GET",
      headers: { datasetid: datasetId },
    });
  }

  public getConceptSetExpression(conceptSetId: number, datasetId: string) {
    return request<IWebapiConceptSetExpression>({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset/${conceptSetId}/expression?datasetId=${datasetId}`,
      method: "GET",
      headers: { datasetid: datasetId },
    });
  }

  // public removeConceptSet(conceptSetId: number, datasetId: string) {
  //   return request<number>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/conceptset/${conceptSetId}`,
  //     method: "DELETE",
  // headers: { datasetid: datasetId },
  //   });
  // }

  // public createConceptSet(conceptSet: Omit<ConceptSet, "id">, datasetId: string) {
  //   return request<number>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/conceptset`,
  //     method: "POST",
  // headers: { datasetid: datasetId },
  //     data: conceptSet,
  //   });
  // }

  // public updateConceptSet(conceptSetId: number, conceptSet: Partial<ConceptSet>, datasetId: string) {
  //   return request<number | { statusCode: number }>({
  //     baseURL: D2E_WEBAPI_BASE_URL,
  //     url: `/conceptset/${conceptSetId}`,
  //     method: "PUT",
  // headers: { datasetid: datasetId },
  //     data: conceptSet,
  //   });
  // }
}

export const d2eWebapiApi = new D2eWebapi();
