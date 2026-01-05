import { env } from "../env.ts";
import {
  ICohortDefinition,
  IAnalyticsCohortDefinition,
  IFilterValue,
  IBaseMaterializedCohort,
} from "./types.ts";

export class AnalyticsSvcAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly endpoint: string = "/analytics-svc/api/services";
  // deno-lint-ignore no-explicit-any
  private analyticsapi: any;

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

    // @ts-ignore To ignore Cannot find name 'Trex'
    this.analyticsapi = Trex.tokioChannel("d2e-functions/analytics-svc");
  }

  async getCohortDefinition(
    datasetId: string,
    cohortDefinitionId: number
  ): Promise<IAnalyticsCohortDefinition> {
    try {
      const url = new URL(`${this.baseURL}/cohort-definition`);
      console.log(`Calling ${url} to create cohort definition`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      url.searchParams.set("cohortDefinitionId", cohortDefinitionId.toString());
      const result = await this.analyticsapi.get(url.toString(), options);

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
        syntax: JSON.stringify(cohortDefinition.syntax),
      };
      const result = await this.analyticsapi.post(url, data, options);

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
      await this.analyticsapi.put(url, data, options);
    } catch (error) {
      console.error(`Error while updating cohort definition: ${error}`);
      throw error;
    }
  }

  async deleteCohort(datasetId: string, cohortDefinitionId: number) {
    try {
      const url = new URL(`${this.baseURL}/cohort`);
      console.log(`Calling ${url} to delete cohort`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      url.searchParams.set("cohortId", cohortDefinitionId.toString());
      await this.analyticsapi.delete(url.toString(), options);
    } catch (error) {
      console.error(`Error while deleting cohort: ${error}`);
      throw error;
    }
  }

  async getCdmVersion(datasetId: string): Promise<string> {
    try {
      const url = new URL(`${this.baseURL}/alpdb/cdmversion`);
      console.log(`Calling ${url} to get cdm version`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      const result = await this.analyticsapi.get(url.toString(), options);
      return result.data;
    } catch (error) {
      console.error(`Error while getting cdm version: ${error}`);
      throw error;
    }
  }

  async getFilteredCohorts(
    datasetId: string,
    filterValue: IFilterValue
  ): Promise<IBaseMaterializedCohort[]> {
    try {
      const url = new URL(
        `${this.baseURL}/cohort/SYNTAX/${encodeURIComponent(
          JSON.stringify(filterValue)
        )}`
      );
      console.log(`Calling ${url} to get filtered cohorts`);
      const options = this.getRequestConfig();
      url.searchParams.set("datasetId", datasetId);
      url.searchParams.set("excludePatientIds", "true");
      const result = await this.analyticsapi.get(url.toString(), options);
      if (result.data) {
        return result.data.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error while getting all cohorts: ${error}`);
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
