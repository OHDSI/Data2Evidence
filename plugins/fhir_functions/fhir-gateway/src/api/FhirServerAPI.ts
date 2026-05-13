import axios, { AxiosRequestConfig } from "axios";
import { services } from "../env";
import { HTTPMethod, Headers } from "../types";
import {
  IFhirApiResponse,
  IFhirCreatedDataset,
  ICreateFhirDatasetDto,
  IFhirDatasets,
  IFhirHealthCheckAPI,
} from "../types";

export class FhirServerAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly logger = console;

  constructor(token: string) {
    if (!token) throw new Error("No token passed for FhirServerAPI!");
    if (!services.fhirServer)
      throw new Error("No url is set for FhirServerAPI");

    this.token = token;
    this.baseURL = services.fhirServer;
  }

  private async getRequestConfig(): Promise<AxiosRequestConfig> {
    return {
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
      },
    };
  }

  async getFhirDatasets(): Promise<IFhirDatasets[]> {
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/datasets`;
    this.logger.info(`Fetching FHIR datasets from URL: ${url}`);
    const result = await axios.get(url, options);
    return result.data;
  }

  async createFhirDataset(
    datasetPayload: ICreateFhirDatasetDto,
  ): Promise<IFhirCreatedDataset> {
    this.logger.info("Creating FHIR server dataset:", datasetPayload);
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/datasets`;
    try {
      const result = await axios.post(url, datasetPayload, options);
      return result.data;
    } catch (error: any) {
      const errorDetails = error.response?.data?.message || error.message;
      const errorMessage = `Failed to create FHIR dataset with id '${datasetPayload.id}': ${errorDetails}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async deleteFhirDataset(datasetId: string): Promise<void> {
    this.logger.info("Deleting FHIR server dataset");
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/datasets/${datasetId}`;
    const result = await axios.delete(url, options);
    // FHIR server returns 204 No Content on successful delete
    if (result.status === 204) {
      return;
    }
  }

  async postBundle(
    id: string,
    bundle: any,
  ): Promise<IFhirApiResponse<Record<string, unknown>>> {
    try {
      this.logger.info("Posting FHIR bundle");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/${id}`;
      const result = await axios.post(url, bundle, options);
      return {
        status: result.status,
        data: result.data,
      };
    } catch (error: any) {
      this.logger.error(`Error while posting FHIR bundle`);
      this.logger.error(
        `Error details: ${error.response ? JSON.stringify(error.response.data) : error.message}`,
      );
      if (error?.response?.data) {
        return {
          status: error.response.status,
          data: error.response.data,
        };
      }
      return {
        status: 500,
        data: {
          error: true,
          message: "Error while posting FHIR bundle",
        },
      };
    }
  }

  async forwardRequest(
    id: string,
    httpMethod: HTTPMethod,
    resourcePath: string,
    queryParams: any,
    body: any,
    fhirHeaders: Headers,
  ): Promise<IFhirApiResponse<Record<string, unknown>>> {
    const normalizedResourcePath = resourcePath?.replace(/^\/+/, "");
    const url = `${this.baseURL}/${id}${normalizedResourcePath ? "/" + normalizedResourcePath : ""}`;
    const statusLogMsg = `Received response after forwarding ${httpMethod} request to ${url}`;
    this.logger.info(
      `Forwarding ${httpMethod} request to FHIR server at URL: ${url}`,
    );
    try {
      const options: AxiosRequestConfig = await this.getRequestConfig();
      if (queryParams && Object.keys(queryParams).length > 0) {
        options.params = queryParams;
      }
      options.headers = { ...(options.headers || {}), ...(fhirHeaders || {}) };
      let response;
      if (httpMethod === HTTPMethod.GET) {
        response = await axios.get(url, options);
      } else if (httpMethod === HTTPMethod.POST) {
        response = await axios.post(url, body, options);
      } else if (httpMethod === HTTPMethod.PUT) {
        response = await axios.put(url, body, options);
      } else if (httpMethod === HTTPMethod.PATCH) {
        response = await axios.patch(url, body, options);
      } else if (httpMethod === HTTPMethod.DELETE) {
        response = await axios.delete(url, options);
      }

      if (response && response.status !== undefined) {
        this.logger.info(`[${response.status}] ${statusLogMsg}`);
        return {
          status: response.status,
          data: response.data,
        };
      }
      return {
        status: 500,
        data: {
          error: true,
          message: "No response received from FHIR server",
        },
      };
    } catch (error: any) {
      if (error.response) {
        this.logger.error(
          `[${error.response.status}] ${statusLogMsg}: ${JSON.stringify(error.response.data)}`,
        );
        throw error;
      } else {
        this.logger.error(`[500] ${statusLogMsg}: ${error.message}`);
        throw error;
      }
    }
  }
}
