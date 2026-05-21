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
      this.channel = Trex.tokioChannel("fhir/fhir-gateway");
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

  async createFhirDataset(id: string, name: string): Promise<string> {
    this.logger.info(`Creating FHIR dataset for portal dataset '${id}'`);
    try {
      const options = this.getRequestConfig();
      const url = `${this.baseURL}/createDataset`;
      const fhirDatasetDetails = { id: `fhir-${id}`, name };
      const result = await this.channel.post(url, fhirDatasetDetails, options);
      const fhirDatasetId = result.data?.fhirDatasetId;
      if (!fhirDatasetId) {
        throw new Error(
          `No data returned from FHIR gateway for portal dataset '${id}'`,
        );
      }
      return fhirDatasetId;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(
        `Failed to create FHIR dataset for portal dataset '${id}': ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`,
      );
      throw error;
    }
  }
}
