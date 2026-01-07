import { isAxiosError } from "axios";
import { env } from "../env.ts";
import { ICohortGeneratorFlowRun } from "./types.ts";

export class JobPluginsAPI {
  private readonly baseURL: string;
  private readonly logger = console;
  private readonly token: string;
  private readonly endpoint: string = "/jobplugins";
  // deno-lint-ignore no-explicit-any
  private jobpluginsapi: any;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for JobPluginsAPI!");
    }

    if (env.SERVICE_ROUTES.jobplugins) {
      this.baseURL = env.SERVICE_ROUTES.jobplugins + this.endpoint;
    } else {
      this.logger.error("No url is set for JobPluginsAPI");
      throw new Error("No url is set for JobPluginsAPI");
    }
    // @ts-ignore To ignore Cannot find name 'Trex'
    this.jobpluginsapi = Trex.tokioChannel("d2e-functions/jobplugins");
  }

  async createCohortGeneratorFlowRun(
    dto: ICohortGeneratorFlowRun
  ): Promise<string> {
    try {
      this.logger.info(
        `Create Cohort Generator flow run: ${JSON.stringify(dto)}`
      );
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cohort/flow-run`;

      // Request body requires additional options key
      const data = { options: dto };

      const result = await this.jobpluginsapi.post(url, data, options);

      return result.data.flowRunId;
    } catch (error) {
      console.error(`Error while creating Cohort Generator flow run: ${error}`);
      throw error;
    }
  }

  async getLatestSuccessfulDataCharacterizationResultsSchemaName(
    datasetId: string
  ): Promise<string> {
    try {
      const options = await this.getRequestConfig();
      const url = new URL(
        `${this.baseURL}/dqd/data-characterization/flow-run/latest`
      );
      url.searchParams.set("datasetId", datasetId);

      const result = await this.jobpluginsapi.get(url.toString(), options);

      if (!result.data) {
        return "";
      }

      if (result.data.state_type === "COMPLETED") {
        return result.data.parameters.options.resultsSchema;
      } else {
        return "";
      }
    } catch (error) {
      if (isAxiosError(error)) {
        // Error 404 means no flow run found for datasetId
        if (error.status === 404) {
          return "";
        }
      }
      console.error(
        `Error getting latest sucucessful data characterization results schema name: ${error}`
      );
      throw error;
    }
  }

  private getRequestConfig() {
    const options = {
      headers: {
        Authorization: this.token,
      },
    };

    return options;
  }
}
