import { AxiosRequestConfig } from "npm:axios";
import { services } from "../env.ts";

export class FhirGatewayAPI {
  private readonly baseURL: string;
  private readonly logger = console;
  private readonly token: string;
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for FhirGatewayAPI!");
    }
    if (services.fhirGateway) {
      this.baseURL = services.fhirGateway;
      this.channel = Trex.tokioChannel("fhir/alp-fhir-gateway");
    } else {
      throw new Error("No url is set for FhirGatewayAPI");
    }
  }

  private getRequestConfig(): AxiosRequestConfig {
    return {
      headers: {
        Authorization: this.token,
      },
    };
  }

  async createProject(id: string, description: string): Promise<string> {
    this.logger.info(`Creating FHIR project for dataset '${id}'`);
    try {
      const options = this.getRequestConfig();
      const url = `${this.baseURL}/createProject`;
      const result = await this.channel.post(url, { id, description }, options);
      const projectId = result.data?.projectId;
      if (!projectId) {
        throw new Error(`No projectId returned from FHIR gateway for dataset '${id}'`);
      }
      return projectId;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(
        `Failed to create FHIR project for dataset '${id}': ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`,
      );
      throw error;
    }
  }
}
