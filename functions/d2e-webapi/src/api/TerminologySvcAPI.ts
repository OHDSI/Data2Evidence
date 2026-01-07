import { env } from "../env.ts";

import {
  IResolveConceptSetExpressionConcept,
  ITerminologyConceptSet,
  ITerminologyFhirResource,
  ITerminologyConcept,
  ITerminologyCreateConceptSet,
  ITerminologyConceptSetWithConceptData,
  ITerminologyFiltersSchema,
} from "./types.ts";

export class TerminologySvcAPI {
  private readonly baseURL: string;
  private readonly token: string;
  // deno-lint-ignore no-explicit-any
  private terminologysvcapi: any;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for TerminologySvcAPI!");
    }

    if (env.SERVICE_ROUTES.terminology) {
      this.baseURL = env.SERVICE_ROUTES.terminology;
    } else {
      console.error("No url is set for TerminologySvcAPI");
      throw new Error("No url is set for TerminologySvcAPI");
    }
    // @ts-ignore To ignore Cannot find name 'Trex'
    this.terminologysvcapi = Trex.tokioChannel("d2e-functions/terminology-svc");
  }

  async getConceptSet(
    conceptSetId: number,
    datasetId: string
  ): Promise<ITerminologyConceptSet> {
    try {
      const url = new URL(
        `${this.baseURL}/concept-set/${encodeURIComponent(conceptSetId)}`
      );
      console.log(`Calling ${url} to get concept sets`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      const result = await this.terminologysvcapi.get(url.toString(), options);
      return result.data;
    } catch (error) {
      console.error(
        `Error while getting concept set with conceptSetId ${conceptSetId}: ${error}`
      );
      throw error;
    }
  }

  async getConceptSets(datasetId: string): Promise<ITerminologyConceptSet[]> {
    try {
      const url = new URL(`${this.baseURL}/concept-set`);
      console.log(`Calling ${url} to get concept sets`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      const result = await this.terminologysvcapi.get(url.toString(), options);
      return result.data;
    } catch (error) {
      console.error(`Error while getting concept sets: ${error}`);
      throw error;
    }
  }

  async getConceptSetById(
    datasetId: string,
    conceptSetId: number
  ): Promise<ITerminologyConceptSetWithConceptData> {
    try {
      const url = new URL(
        `${this.baseURL}/concept-set/${encodeURIComponent(conceptSetId)}`
      );
      console.log(`Calling ${url} to get concept set by id`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      const result = await this.terminologysvcapi.get(url.toString(), options);
      return result.data;
    } catch (error) {
      console.error(`Error while getting concept set by id: ${error}`);
      throw error;
    }
  }

  async createConceptSet(
    datasetId: string,
    conceptSetDto: ITerminologyCreateConceptSet
  ): Promise<number> {
    try {
      const url = new URL(`${this.baseURL}/concept-set`);
      console.log(`Calling ${url} to create concept sets`);
      const options = this.getRequestConfig();

      url.searchParams.set("datasetId", datasetId);

      const result = await this.terminologysvcapi.post(
        url.toString(),
        conceptSetDto,
        options
      );
      return result.data;
    } catch (error) {
      console.error(`Error while creating concept sets: ${error}`);
      throw error;
    }
  }

  async updateConceptSet(
    datasetId: string,
    conceptSetId: number,
    conceptSetDto: ITerminologyCreateConceptSet
  ): Promise<number> {
    try {
      const url = new URL(
        `${this.baseURL}/concept-set/${encodeURIComponent(conceptSetId)}`
      );
      console.log(`Calling ${url} to update concept sets`);
      const options = this.getRequestConfig();

      url.searchParams.set("datasetId", datasetId);

      const result = await this.terminologysvcapi.put(
        url.toString(),
        conceptSetDto,
        options
      );
      return result.data;
    } catch (error) {
      console.error(`Error while updating concept sets: ${error}`);
      throw error;
    }
  }

  async deleteConceptSet(
    datasetId: string,
    conceptSetId: number
  ): Promise<void> {
    try {
      const url = new URL(
        `${this.baseURL}/concept-set/${encodeURIComponent(conceptSetId)}`
      );
      console.log(`Calling ${url} to delete concept set`);
      const options = this.getRequestConfig();

      url.searchParams.set("datasetId", datasetId);

      await this.terminologysvcapi.delete(url.toString(), options);
    } catch (error) {
      console.error(
        `Error while deleting concept set with conceptSetId ${conceptSetId}: ${error}`
      );
      throw error;
    }
  }

  async resolveConceptSetExpression(
    datasetId: string,
    concepts: IResolveConceptSetExpressionConcept[]
  ): Promise<number[]> {
    try {
      const url = `${this.baseURL}/concept-set/resolveConceptSetExpression`;
      console.log(`Calling ${url} to resolveConceptSetExpression`);
      const options = this.getRequestConfig();
      const body = {
        datasetId,
        concepts,
      };
      const result = await this.terminologysvcapi.post(url, body, options);
      return result.data;
    } catch (error) {
      console.error(`Error while resolving concept set expression: ${error}`);
      throw error;
    }
  }

  async searchConcept(
    datasetId: string,
    query: string,
    offset: number,
    count: number,
    filters?: ITerminologyFiltersSchema
  ): Promise<ITerminologyFhirResource> {
    try {
      const url = new URL(`${this.baseURL}/fhir/4_0_0/valueset/$expand`);
      console.log(`Calling ${url} to search concept`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      url.searchParams.set("offset", offset.toString());
      url.searchParams.set("count", count.toString());
      url.searchParams.set("code", query);
      if (filters) {
        url.searchParams.set("filter", JSON.stringify(filters));
      }
      const result = await this.terminologysvcapi.get(url.toString(), options);
      return result.data;
    } catch (error) {
      console.error(`Error while searching concept: ${error}`);
      throw error;
    }
  }

  async getConceptById(
    datasetId: string,
    conceptId: number
  ): Promise<ITerminologyConcept> {
    try {
      const url = `${this.baseURL}/concept/searchById`;
      console.log(`Calling ${url} to get concept by id`);
      const options = this.getRequestConfig();
      const body = {
        datasetId,
        conceptId,
      };
      const result = await this.terminologysvcapi.post(url, body, options);
      if (result.data.length > 0) {
        return result.data[0];
      } else {
        throw new Error(`No concept found with id:${conceptId}`);
      }
    } catch (error) {
      console.error(`Error while getting concept by id: ${error}`);
      throw error;
    }
  }

  async getRecommendedConceptsFromIdentifiers(
    datasetId: string,
    conceptIds: number[]
  ): Promise<ITerminologyConcept> {
    try {
      const url = `${this.baseURL}/concept/recommended/list`;
      console.log(`Calling ${url} to get recommended concepts by concept ids`);
      const options = this.getRequestConfig();
      const body = {
        datasetId,
        conceptIds,
      };
      const result = await this.terminologysvcapi.post(url, body, options);
      if (result.data.length > 0) {
        return result.data;
      } else {
        throw new Error(`No recommended concepts found with ids:${conceptIds}`);
      }
    } catch (error) {
      console.error(
        `Error while getting recommended concepts by ids: ${error}`
      );
      throw error;
    }
  }

  private getRequestConfig() {
    const options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 20000,
    };

    return options;
  }
}
