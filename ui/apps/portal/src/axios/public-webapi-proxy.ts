import axios, { AxiosRequestConfig } from "axios";
import { request } from "./request";
import env from "../env";
import {
  ConceptSet,
  ConceptSetConcept,
  IWebapiConcept,
  IWebapiConceptSet,
  IWebapiConceptSetExpression,
} from "../plugins/Researcher/Terminology/utils/types";

export class PublicWebapiProxyAPI {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = env.REACT_APP_PUBLIC_WEBAPI_PROXY_URL;
    if (!this.baseURL) {
      throw new Error("No url is set for PublicWebapiProxyAPI");
    }
  }

  private async getRequestConfig() {
    const options: AxiosRequestConfig = {};
    return options;
  }

  // Function to map key to uppercase
  mapDcResultKeysToUppercase = (data: unknown[]) => {
    return data.map((obj: any) => {
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toUpperCase(), v]));
    });
  };

  async getDataCharacterizationResults(dataSource: string, sourceKey: string): Promise<any> {
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
          dcResultsKeys.map((key) => [key, this.mapDcResultKeysToUppercase(result.data[key] as [])])
        );
      }

      return dcResults;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting data characterization results from public webapi`);
    }
  }

  async getDataCharacterizationResultsDrilldown(
    dataSource: string,
    sourceKey: string,
    conceptId: string
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
          dcResultsKeys.map((key) => [key, this.mapDcResultKeysToUppercase(result.data[key] as [])])
        );
      }

      return dcResults;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting data characterization drilldown results from public webapi`);
    }
  }

  async getTerminologies(
    page: number,
    rowsPerPage: number,
    dataSource: string,
    searchText: string,
    conceptClassId: string[],
    domainId: string[],
    vocabularyId: string[],
    standardConcept: string[],
    validity: string[]
  ): Promise<[IWebapiConcept[], number]> {
    if (searchText === "") {
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
      });

      // Truncate results based on pagination parameters
      return [result.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), result.length];
    } catch (error) {
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

  public getConceptSet(conceptSetId: number): Promise<IWebapiConceptSet> {
    return request<IWebapiConceptSet>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${conceptSetId}`,
      method: "GET",
    });
  }

  public getConceptSetExpression(conceptSetId: number) {
    return request<IWebapiConceptSetExpression>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${conceptSetId}/expression`,
      method: "GET",
    });
  }

  public createConceptSet(name: string) {
    return request<number>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset`,
      method: "POST",
      data: { name },
    });
  }

  public updateConceptSet(conceptSetId: number, conceptSet: Partial<ConceptSet>) {
    return request<number>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${conceptSetId}`,
      method: "PUT",
      data: conceptSet,
    });
  }

  public updateConceptSetItems(conceptSetId: number, conceptSetConcepts: ConceptSetConcept[]) {
    const data = conceptSetConcepts.map((concept) => ({
      conceptId: concept.id,
      isExcluded: concept.isExcluded ? 1 : 0,
      includeDescendants: concept.useDescendants ? 1 : 0,
      includeMapped: concept.useMapped ? 1 : 0,
    }));
    return request<number>({
      baseURL: this.baseURL,
      url: `d2e-webapi/conceptset/${conceptSetId}/items`,
      method: "PUT",
      data,
    });
  }
}
