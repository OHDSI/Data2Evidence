import axios, { AxiosRequestConfig } from "npm:axios";
import { services } from "../env";
import { IFhirHealthCheckAPI } from "../types";

export class FhirServerPublicAPI {
  private readonly baseURL: string;
  private readonly logger = console;

  constructor() {
    if (!services.fhirServer)
      throw new Error("No url is set for FhirServerPublicAPI");
    this.baseURL = services.fhirServer;
  }

  private async getRequestConfig(): Promise<AxiosRequestConfig> {
    return {
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  async healthCheck(): Promise<IFhirHealthCheckAPI> {
    const url = `${this.baseURL}/health`;
    this.logger.info(`Checking FHIR server health at ${url}`);
    const options = await this.getRequestConfig();
    const result = await axios.get(url, options);

    return result.data;
  }
}
