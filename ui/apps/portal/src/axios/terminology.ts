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
} from "../plugins/Researcher/Terminology/utils/types";

import { RowObject } from "../plugins/SystemAdmin/ConceptMapping/types";

const TERMINOLOGY_BASE_URL = "terminology";

export class Terminology {
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
  ): Promise<FhirValueSet> {
    const offset = page * rowsPerPage;

    const params = new URLSearchParams();
    params.append("datasetId", String(datasetId));
    params.append("offset", String(offset));
    params.append("count", String(rowsPerPage));
    params.append("code", String(searchText));
    params.append("filter", JSON.stringify({ conceptClassId, domainId, vocabularyId, standardConcept, validity }));

    return request({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/fhir/4_0_0/valueset/$expand?${params}`,
      method: "GET",
    });
  }

  public getStandardConcepts(data: RowObject[], datasetId: string): Promise<StandardConcepts[]> {
    return request({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept/getStandardConcepts`,
      method: "POST",
      data: { data, datasetId },
    });
  }

  public getTerminologyConnections(conceptId: number, datasetId: string): Promise<FhirConceptMap> {
    return request({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `fhir/4_0_0/conceptmap/$translate?conceptId=${conceptId}&datasetId=${datasetId}`,
      method: "GET",
    });
  }

  public getRecommendedConcepts(conceptIds: number[], datasetId: string) {
    return request<Concept[]>({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept/recommended/list`,
      method: "POST",
      data: {
        conceptIds,
        datasetId,
      },
    });
  }

  public async getFilterOptions(
    datasetId: string,
    searchText: string,
    conceptClassId: string[],
    domainId: string[],
    vocabularyId: string[],
    standardConcept: string[]
  ): Promise<FilterOptions> {
    const params = new URLSearchParams();
    params.append("datasetId", datasetId);
    params.append("searchText", searchText);
    params.append("filter", JSON.stringify({ conceptClassId, domainId, vocabularyId, standardConcept }));

    const { filterOptions } = await request<{ filterOptions: FilterOptions }>({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept/filter-options?${params}`,
      method: "GET",
    });
    return filterOptions;
  }

  public async getConceptHierarchy(
    datasetId: string,
    conceptId: number,
    depth: number
  ): Promise<ConceptHierarchyResponse> {
    return await request({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `concept/hierarchy?datasetId=${datasetId}&conceptId=${conceptId}&depth=${depth}`,
      method: "GET",
    });
  }

  // CONCEPT SETS

  public getConceptSets(datasetId: string) {
    return request<ConceptSetWithConceptDetails[]>({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept-set?datasetId=${datasetId}`,
      method: "GET",
    });
  }

  public getConceptSet(conceptSetId: string, datasetId: string) {
    return request<ConceptSetWithConceptDetails>({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept-set/${conceptSetId}?datasetId=${datasetId}`,
      method: "GET",
    });
  }

  public removeConceptSet(conceptSetId: string, datasetId: string) {
    return request<string>({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept-set/${conceptSetId}?datasetId=${datasetId}`,
      method: "DELETE",
    });
  }

  public createConceptSet(conceptSet: Omit<ConceptSet, "id">, datasetId: string) {
    return request<string>({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept-set?datasetId=${datasetId}`,
      method: "POST",
      data: conceptSet,
    });
  }

  public updateConceptSet(conceptSetId: string, conceptSet: Partial<ConceptSet>, datasetId: string) {
    return request<string | { statusCode: number }>({
      baseURL: TERMINOLOGY_BASE_URL,
      url: `/concept-set/${conceptSetId}?datasetId=${datasetId}`,
      method: "PUT",
      data: conceptSet,
    });
  }
}

export const terminologyApi = new Terminology();
