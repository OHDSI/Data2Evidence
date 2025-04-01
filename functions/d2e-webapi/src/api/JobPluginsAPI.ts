import axios, { AxiosRequestConfig } from "axios";
import { env } from "../env.ts";
import { ICohortGeneratorFlowRun } from "./types.ts";

export class JobPluginsAPI {
  private readonly baseURL: string;
  private readonly logger = console;
  private readonly token: string;
  private readonly endpoint: string = "/jobplugins";

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

      const result = await axios.post(url, data, options);

      return result.data.flowRunId;
    } catch (error) {
      console.error(`Error while creating Cohort Generator flow run: ${error}`);
      throw error;
    }
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
    };

    return options;
  }
}
