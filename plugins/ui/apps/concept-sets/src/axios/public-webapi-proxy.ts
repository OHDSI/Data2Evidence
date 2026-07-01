import axios, { AxiosRequestConfig } from "axios";
import { request } from "./request";
import {
  ConceptSet,
  ConceptSetConcept,
  IWebapiConcept,
  IWebapiConceptSet,
  IWebapiConceptSetExpression,
} from "../Terminology/utils/types";
import { getPortalAPI } from "../utils/PortalUtils";

export class PublicWebapiProxyAPI {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = getPortalAPI()?.REACT_APP_PUBLIC_WEBAPI_PROXY_URL as string;
    // Origin url will be used automatically if REACT_APP_PUBLIC_WEBAPI_PROXY_URL is not present
  }

  private async getRequestConfig() {
    const options: AxiosRequestConfig = {};
    return options;
  }

  // Function to map key to uppercase
  mapDcResultKeysToUppercase = (data: unknown[]) => {
    return data.map((obj: any) => {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k.toUpperCase(), v]),
      );
    });
  };

  async getDataCharacterizationResults(
    dataSource: string,
    sourceKey: string,
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cdmresults/${dataSource}/${sourceKey}`;
      const result = await axios.get(url, options);

      // Map result keys to uppercase
      let dcResults;
      if (Array.isArray(result.data)) {
        dcResults = this.mapDcResultKeysToUppercase(result.data);
      } else {
        const dcResultsKeys = Object.keys(result.data);
        dcResults = Object.fromEntries(
          dcResultsKeys.map((key) => [
            key,
            this.mapDcResultKeysToUppercase(result.data[key] as []),
          ]),
        );
      }

      return dcResults;
    } catch (error) {
      console.error(error);
      throw new Error(
        `Error while getting data characterization results from public webapi`,
      );
    }
  }

  async getDataCharacterizationResultsDrilldown(
    dataSource: string,
    sourceKey: string,
    conceptId: string,
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cdmresults/${dataSource}/${sourceKey}/${conceptId}`;
      const result = await axios.get(url, options);

      // Map result keys to uppercase
      let dcResults;
      if (Array.isArray(result.data)) {
        dcResults = this.mapDcResultKeysToUppercase(result.data);
      } else {
        const dcResultsKeys = Object.keys(result.data);
        dcResults = Object.fromEntries(
          dcResultsKeys.map((key) => [
            key,
            this.mapDcResultKeysToUppercase(result.data[key] as []),
          ]),
        );
      }

      return dcResults;
    } catch (error) {
      console.error(error);
      throw new Error(
        `Error while getting data characterization drilldown results from public webapi`,
      );
    }
  }

  async getTerminologies(
    _page: number,
    _rowsPerPage: number,
    dataSource: string,
    searchText: string,
    conceptClassId: string[],
    domainId: string[],
    vocabularyId: string[],
    standardConcept: string[],
    validity: string[],
    signal?: AbortSignal,
  ): Promise<[IWebapiConcept[], number]> {
    // Allow search if there are domain filters, even with empty search text
    if (searchText === "" && (!domainId || domainId.length === 0)) {
      return [[], 0];
    }

    try {
      const data = {
        QUERY: searchText,
        CONCEPT_CLASS_ID: conceptClassId,
        DOMAIN_ID: domainId,
        VOCABULARY_ID: vocabularyId,
        STANDARD_CONCEPT: standardConcept[0],
        INVALID_REASON: validity[0],
      };

      const result = await request({
        baseURL: this.baseURL,
        url: `d2e-webapi/vocabulary/${dataSource}/search`,
        method: "POST",
        data,
        signal,
      });

      // Truncate results based on pagination parameters
      return [result, result.length];
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      console.error(error);
      throw new Error(`Error while getting concepts from public webapi`);
    }
  }

  // CONCEPT SETS
  public getConceptSets(): Promise<IWebapiConceptSet[]> {
    return request<IWebapiConceptSet[]>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset`,
      method: "GET",
      timeout: 60000,
    });
  }

  public getConceptSet(conceptSetId: string): Promise<IWebapiConceptSet> {
    return request<IWebapiConceptSet>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${encodeURIComponent(conceptSetId)}`,
      method: "GET",
    });
  }

  public getConceptSetExpression(conceptSetId: string) {
    return request<IWebapiConceptSetExpression>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${encodeURIComponent(
        conceptSetId,
      )}/expression`,
      method: "GET",
    });
  }

  public checkIfConceptSetExists(conceptSetId: string, conceptSetName: string) {
    return request({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${encodeURIComponent(
        conceptSetId,
      )}/exists?name=${encodeURIComponent(conceptSetName)}`,
      method: "GET",
    });
  }

  public async createConceptSet(name: string): Promise<string> {
    const conceptSet = await request<IWebapiConceptSet>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset`,
      method: "POST",
      data: { name },
    });
    return conceptSet.id;
  }

  public updateConceptSet(
    conceptSetId: string,
    conceptSet: Partial<ConceptSet>,
  ) {
    return request<number>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${encodeURIComponent(conceptSetId)}`,
      method: "PUT",
      data: conceptSet,
    });
  }

  public updateConceptSetItems(
    conceptSetId: string,
    conceptSetConcepts: ConceptSetConcept[],
  ) {
    const data = conceptSetConcepts.map((concept) => ({
      conceptId: concept.id,
      isExcluded: concept.isExcluded ? 1 : 0,
      includeDescendants: concept.useDescendants ? 1 : 0,
      includeMapped: concept.useMapped ? 1 : 0,
    }));
    return request<number>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${encodeURIComponent(conceptSetId)}/items`,
      method: "PUT",
      data,
    });
  }

  public deleteConceptSet(conceptSetId: string) {
    return request<number>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${encodeURIComponent(conceptSetId)}`,
      method: "DELETE",
    });
  }
}
