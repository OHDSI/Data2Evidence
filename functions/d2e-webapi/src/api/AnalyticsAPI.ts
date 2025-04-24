import axios, { AxiosRequestConfig } from "axios";
import { env } from "../env.ts";
import { ICohortDefinition, IAnalyticsCohortDefinition } from "./types.ts";

export class AnalyticsSvcAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly endpoint: string = "/analytics-svc/api/services";

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Analytics API!");
    }

    if (env.SERVICE_ROUTES.analytics) {
      this.baseURL = env.SERVICE_ROUTES.analytics + this.endpoint;
    } else {
      console.error("No url is set for AnalyticsSvcAPI");
      throw new Error("No url is set for AnalyticsAPI");
    }
  }

  async getCohortDefinition(
    datasetId: string,
    cohortDefinitionId: number
  ): Promise<IAnalyticsCohortDefinition> {
    try {
      const url = `${this.baseURL}/cohort-definition`;
      console.log(`Calling ${url} to create cohort definition`);
      const options = this.getRequestConfig();
      const params = new URLSearchParams();
      params.append("datasetId", datasetId);
      params.append("cohortDefinitionId", cohortDefinitionId.toString());
      const result = await axios.get(url, { ...options, params });

      if (!result.data.data) {
        throw "Missing data from result";
      }

      return result.data.data[0];
    } catch (error) {
      console.error(`Error while creating cohort definition: ${error}`);
      throw error;
    }
  }

  async createCohortDefinition(
    datasetId: string,
    cohortDefinition: ICohortDefinition
  ): Promise<number> {
    try {
      const url = `${this.baseURL}/cohort-definition`;
      console.log(`Calling ${url} to create cohort definition`);
      const options = this.getRequestConfig();
      const data = {
        datasetId,
        ...cohortDefinition,
      };
      const result = await axios.post(url, data, options);

      if (!result.data.data) {
        throw "Missing data from result";
      }

      return result.data.data;
    } catch (error) {
      console.error(`Error while creating cohort definition: ${error}`);
      throw error;
    }
  }

  async updateCohortDefinition(
    datasetId: string,
    cohortDefinitionId: number,
    cohortDefinition: ICohortDefinition
  ) {
    try {
      const url = `${this.baseURL}/cohort-definition`;
      console.log(`Calling ${url} to update cohort definition`);
      const options = this.getRequestConfig();
      const data = {
        datasetId,
        cohortDefinitionId,
        name: cohortDefinition.name,
        description: cohortDefinition.description,
        syntax: cohortDefinition.syntax,
      };
      await axios.put(url, data, options);
    } catch (error) {
      console.error(`Error while updating cohort definition: ${error}`);
      throw error;
    }
  }

  async deleteCohort(datasetId: string, cohortDefinitionId: number) {
    try {
      const url = `${this.baseURL}/cohort`;
      console.log(`Calling ${url} to delete cohort`);
      const options = this.getRequestConfig();
      const params = new URLSearchParams();
      params.append("datasetId", datasetId);
      params.append("cohortId", cohortDefinitionId.toString());
      await axios.delete(url, { ...options, params });
    } catch (error) {
      console.error(`Error while deleting cohort: ${error}`);
      throw error;
    }
  }

  async getCdmVersion(datasetId: string): Promise<string> {
    try {
      const url = `${this.baseURL}/alpdb/cdmversion`;
      console.log(`Calling ${url} to get cdm version`);
      const options = this.getRequestConfig();
      const params = new URLSearchParams();
      params.append("datasetId", datasetId);
      const result = await axios.get(url, { ...options, params });
      return result.data;
    } catch (error) {
      console.error(`Error while getting cdm version: ${error}`);
      throw error;
    }
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 20000,
    };

    return options;
  }
}
