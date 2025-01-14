import { AxiosRequestConfig } from "axios";
import { Agent } from "https";
import { services } from "../env.ts";
import { get } from "./request-util.ts";

export class AlpDbAPI {
  private readonly baseURL: string;
  private readonly httpsAgent: Agent;
  private readonly logger = console;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Analytics API!");
    }
    if (services.alpdb) {
      this.baseURL = services.alpdb;
      this.httpsAgent = new Agent({
        rejectUnauthorized: true,
      });
    } else {
      this.logger.error("No url is set for GatewayAPI");
      throw new Error("No url is set for GatewayAPI");
    }
  }

  private async getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
      httpsAgent: this.httpsAgent,
      timeout: 20000,
    };

    return options;
  }

  async checkIfSchemaExists(
    databaseDialect: string,
    databaseCode: string,
    schemaName: string
  ): Promise<boolean> {
    this.logger.info(
      `Checking if schema exists for ${schemaName} in ${databaseCode}`
    );
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/${databaseDialect}/database/${databaseCode}/schema/${schemaName}/exists`;
    try {
      const result = await get(url, options);
      return result.data;
    } catch (error) {
      const errorMessage = `Failed to check if schema exists for ${schemaName} in ${databaseCode}`;
      this.logger.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }
}
