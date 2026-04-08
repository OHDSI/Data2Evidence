import axios, { AxiosRequestConfig } from "npm:axios";
import { env } from "./env";
import { HTTPMethod, Headers } from "./types";

interface ICreateFhirDatasetDto {
  id: string;
  name: string;
}

export interface IFhirDatasetSummary {
  created_at: string | null;
  id: string;
  name: string;
  resource_types: Record<string, unknown>[] | null;
  status: string;
}

export interface IFhirCreatedDataset {
  id: string;
  name: string;
  resource_count: number;
  resource_types: string[];
  status: string;
}

export interface IFhirApiResponse<T> {
  status: number;
  data: T;
}

export class FhirServerAPI {
  private readonly baseURL: string;
  // private readonly httpsAgent: any;
  private readonly logger = console;
  private readonly token: string;
  private readonly services = env.SERVICE_ROUTES;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      this.logger.error("No token passed for FhirServerAPI!");
      throw new Error("No token passed for FhirServerAPI!");
    }

    if (this.services.trexFhirGateway) {
      this.baseURL = this.services.trexFhirGateway;
    } else {
      this.logger.error("No url is set for FhirServerAPI");
      throw new Error("No url is set for FhirServerAPI");
    }
  }

  private async getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
      },
      // httpsAgent: this.httpsAgent,
    };

    return options;
  }

  async fhirServerHealthCheck() {
    try {
      this.logger.info("Checking FHIR server health");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/health`;
      const result = await axios.get(url, options);
      return {
        status: result.status,
        data: result.data,
      };
    } catch (error: any) {
      this.logger.error(`Error while checking FHIR server health`, error);
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
          message: "Error while checking FHIR server health",
        },
      };
    }
  }

  async getDatasets(): Promise<IFhirApiResponse<IFhirDatasetSummary[]>> {
    try {
      this.logger.info("Fetching FHIR server datasets");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/datasets`;
      const result = await axios.get(url, options);
      return {
        status: result.status,
        data: Array.isArray(result.data) ? result.data : [],
      };
    } catch (error: any) {
      this.logger.error(`Error while fetching FHIR server datasets`, error);
      return {
        status: error?.response?.status ?? 500,
        data: [],
      };
    }
  }

  async createFhirDataset(
    payload: ICreateFhirDatasetDto,
  ): Promise<IFhirApiResponse<IFhirCreatedDataset | Record<string, unknown>>> {
    try {
      this.logger.info("Creating FHIR server dataset");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/datasets`;
      const result = await axios.post(url, payload, options);
      return {
        status: result.status,
        data: result.data,
      };
    } catch (error: any) {
      this.logger.error(`Error while creating FHIR server dataset`, error);
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
          message: "Error while creating FHIR server dataset",
        },
      };
    }
  }

  async deleteFhirDataset(datasetId: string) {
    try {
      this.logger.info("Deleting FHIR server dataset");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/datasets/${datasetId}`;
      const result = await axios.delete(url, options);
      return {
        status: result.status,
        data: result.data,
      };
    } catch (error: any) {
      this.logger.error(`Error while deleting FHIR server dataset`, error);
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
          message: "Error while deleting FHIR server dataset",
        },
      };
    }
  }

  async postBundle(id: string, bundle: any) {
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
  ) {
    const normalizedResourcePath = resourcePath?.replace(/^\/+/, "");
    const url = `${this.baseURL}/${id}${normalizedResourcePath ? "/" + normalizedResourcePath : ""}`;
    const statusLogMsg = `Received response after forwarding ${httpMethod} request to ${url}`;
    this.logger.info(
      `Forwarding ${httpMethod} request to FHIR server at URL: ${url}`,
    );
    try {
      let options = await this.getRequestConfig();
      if (!options || typeof options !== "object") {
        options = {};
      }
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
          headers: response.headers,
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
        return {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        };
      } else {
        this.logger.error(`[500] ${statusLogMsg}: ${error.message}`);
        return {
          status: 500,
          data: {
            error: true,
            message: error.message,
          },
        };
      }
    }
  }
}
