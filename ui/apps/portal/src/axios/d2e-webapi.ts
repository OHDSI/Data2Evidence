import { request } from "./request";
import {
  ConceptSet,
  ConceptSetConcept,
  IWebapiConcept,
  IWebapiConceptRecordCount,
  IWebapiConceptSet,
  IWebapiConceptSetExpression,
} from "../plugins/Researcher/Terminology/utils/types";
import { api } from "./api";
import env from "../env";

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

  public getConceptRecordCounts(datasetId: string, conceptIds: number[]) {
    return request<IWebapiConceptRecordCount[]>({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/cdmresults/${datasetId}/conceptRecordCount`,
      method: "POST",
      data: conceptIds,
      headers: { datasetid: datasetId },
    });
  }

  // CONCEPT SETS
  public getConceptSets(datasetId: string) {
    if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      return api.publicWebapiProxyAPI.getConceptSets();
    } else {
      return request<IWebapiConceptSet[]>({
        baseURL: D2E_WEBAPI_BASE_URL,
        url: `/conceptset`,
        method: "GET",
        headers: { datasetid: datasetId },
      });
    }
  }

  public getConceptSet(conceptSetId: number, datasetId: string) {
    if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      return api.publicWebapiProxyAPI.getConceptSet(conceptSetId);
    } else {
      return request<IWebapiConceptSet>({
        baseURL: D2E_WEBAPI_BASE_URL,
        url: `/conceptset/${conceptSetId}`,
        method: "GET",
        headers: { datasetid: datasetId },
      });
    }
  }

  public getConceptSetExpression(conceptSetId: number, datasetId: string) {
    if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      return api.publicWebapiProxyAPI.getConceptSetExpression(conceptSetId);
    } else {
      return request<IWebapiConceptSetExpression>({
        baseURL: D2E_WEBAPI_BASE_URL,
        url: `/conceptset/${conceptSetId}/expression?datasetId=${datasetId}`,
        method: "GET",
        headers: { datasetid: datasetId },
      });
    }
  }

  public checkIfConceptSetExists(conceptSetId: number, conceptSetName: string, datasetId: string): Promise<number> {
    if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      return api.publicWebapiProxyAPI.checkIfConceptSetExists(conceptSetId, conceptSetName);
    }
    return request<number>({
      baseURL: D2E_WEBAPI_BASE_URL,
      url: `/conceptset/${conceptSetId}/exists?name=${encodeURIComponent(conceptSetName)}`,
      method: "GET",
      headers: { datasetid: datasetId },
    });
  }

  public async createConceptSet(name: string, datasetId: string, shared?: boolean): Promise<number> {
    if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      const conceptSetId = await api.publicWebapiProxyAPI.createConceptSet(name);
      return conceptSetId;
    } else {
      const conceptSet = await request({
        baseURL: D2E_WEBAPI_BASE_URL,
        url: `/conceptset`,
        method: "POST",
        headers: { datasetid: datasetId },
        data: { name, shared },
      });

      return conceptSet.id;
    }
  }

  public updateConceptSet(conceptSetId: number, conceptSet: Partial<ConceptSet>, datasetId: string) {
    if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      return api.publicWebapiProxyAPI.updateConceptSet(conceptSetId, conceptSet);
    } else {
      return request<number | { statusCode: number }>({
        baseURL: D2E_WEBAPI_BASE_URL,
        url: `/conceptset/${conceptSetId}`,
        method: "PUT",
        headers: { datasetid: datasetId },
        data: conceptSet,
      });
    }
  }

  public updateConceptSetItems(conceptSetId: number, conceptSetConcepts: ConceptSetConcept[], datasetId: string) {
    if (env.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
      return api.publicWebapiProxyAPI.updateConceptSetItems(conceptSetId, conceptSetConcepts);
    } else {
      const data = conceptSetConcepts.map((concept) => ({
        conceptId: concept.id,
        isExcluded: concept.isExcluded,
        includeDescendants: concept.useDescendants,
        includeMapped: concept.useMapped,
      }));
      return request<number | { statusCode: number }>({
        baseURL: D2E_WEBAPI_BASE_URL,
        url: `/conceptset/${conceptSetId}/items`,
        method: "PUT",
        headers: { datasetid: datasetId },
        data,
      });
    }
  }
}

export const d2eWebapiApi = new D2eWebapi();
