// @ts-types="npm:@types/express"
import { Request } from "express";
import axios, { AxiosRequestConfig } from "axios";
// import { Agent } from "https";
import { env } from "../env.ts";
import { ConceptSet } from "../types.ts";

interface CreateConceptSetDto {
  serviceArtifact: any;
}
interface UpdateConceptSetDto {
  id: number;
  serviceArtifact: any;
}

export class SystemPortalAPI {
  private readonly token: string;
  private readonly url: string;
  // private readonly httpsAgent: Agent;

  constructor(request: Request) {
    this.token = request.headers["authorization"]!;
    if (env.SERVICE_ROUTES.portalServer) {
      this.url = env.SERVICE_ROUTES.portalServer;
      // this.httpsAgent = new Agent({
      //   rejectUnauthorized: true,
      //   ca: env.TLS__INTERNAL__CA_CRT,
      // });
    } else {
      throw new Error("No url is set for PortalAPI");
    }
  }

  private async getDataset(datasetId: string): Promise<{
    databaseCode: string;
    dialect: string;
    vocabSchemaName: string;
  }> {
    console.info(`Portal request to get dataset info for id : ${datasetId}`);
    const errorMessage = `Error while getting dataset info for id : ${datasetId}`;
    try {
      const options = await this.createOptions();
      const url = `${this.url}/dataset`;
      options.params = { datasetId: datasetId };
      const result = await axios.get(url, options);
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getDatasetDetails(datasetId: string) {
    const dataset = await this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Could not find dataset with datasetId: ${datasetId}`);
    }

    if (!dataset.databaseCode) {
      throw new Error(
        `Database code does not exist for datasetId: ${datasetId}`
      );
    }

    if (!dataset.vocabSchemaName) {
      throw new Error(
        `vocabSchemaName does not exist for datasetId: ${datasetId}`
      );
    }

    return {
      databaseCode: dataset.databaseCode,
      vocabSchemaName: dataset.vocabSchemaName,
      dialect: dataset.dialect,
    };
  }

  async getUserConceptSets(userId: string, datasetId: string): Promise<any> {
    console.info("Portal request to get concept sets");
    const errorMessage = "Error while getting concept sets";
    try {
      const options = await this.createOptions();
      options.params = { datasetId: datasetId };
      const url = `${this.url}/user-artifact/${userId}/concept_sets/shared/list`;
      const result = await axios.get(url, options);
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getConceptSetById(id: number, datasetId: string): Promise<ConceptSet> {
    console.info(`Portal request to get concept set for id ${id}`);
    const errorMessage = `Error while getting concept set for id ${id}`;
    try {
      const options = await this.createOptions();
      options.params = { datasetId: datasetId };
      const url = `${this.url}/user-artifact/concept_sets/${id}`;
      const result = await axios.get<ConceptSet[]>(url, options);
      return result.data[0];
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async createConceptSet(
    input: CreateConceptSetDto,
    datasetId: string
  ): Promise<any> {
    console.info("Portal request to create concept set");
    const errorMessage = "Error while creating concept set";
    try {
      const options = await this.createOptions();
      options.params = { datasetId: datasetId };
      const url = `${this.url}/user-artifact/concept_sets`;
      const result = await axios.post(url, input, options);
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async updateConceptSet(
    input: UpdateConceptSetDto,
    datasetId: string
  ): Promise<any> {
    console.info(`Portal request to update concept set for id: ${input.id}`);
    const errorMessage = `Error while updating concept set for id: ${input.id}`;
    try {
      const options = await this.createOptions();
      options.params = { datasetId: datasetId };
      const url = `${this.url}/user-artifact/concept_sets`;
      const result = await axios.put(url, input, options);
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async deleteConceptSet(id: number, datasetId: string): Promise<any> {
    console.info(`Portal request to delete concept set for id: ${id}`);
    const errorMessage = `Error while deleting concept set for id: ${id}`;
    try {
      const options = await this.createOptions();
      options.params = { datasetId: datasetId };
      const url = `${this.url}/user-artifact/concept_sets/${id}`;
      const result = await axios.delete(url, options);
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getConceptSetSequenceNextval(datasetId: string) {
    console.info(`Portal request to get concept set sequence nextval`);
    const errorMessage = `Error getting concept set sequence nextval`;
    try {
      const options = await this.createOptions();
      const url = `${this.url}/user-artifact/concept_sets/sequence/nextval`;

      const params = new URLSearchParams();
      params.append("datasetId", datasetId);

      const result = await axios.get(url, {
        params,
        ...options,
      });
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  private async createOptions() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 20000,
    };
    return options;
  }

  async getHybridSearchConfig() {
    const errorMessage = `Error getting hybrid search config`;
    try {
      const url = `${this.url}/system-portal/config/hybrid-search`;
      const result = await axios.get(url);
      console.log(result.data);
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }
}
