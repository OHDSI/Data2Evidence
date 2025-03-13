import https from "https";
import { Buffer } from "buffer";
import axios, { AxiosRequestConfig } from "axios";
import { MedplumClient } from "@medplum/core";

import { env, services } from "../env.ts";
import { createLogger } from "../logger.ts";
import { ClientCredentials, HTTPMethod, Headers } from "../utils/types";

export class FhirAPI {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly logger = console;
  private medplumClient: MedplumClient;
  private readonly tokenUrl: string;

  constructor() {
    if (env.FHIR__CLIENT_ID && env.FHIR__CLIENT_SECRET) {
      this.clientId = env.FHIR__CLIENT_ID;
      this.clientSecret = env.FHIR__CLIENT_SECRET;
      this.baseUrl = services.fhir;
      this.tokenUrl = services.fhirTokenUrl;
    } else {
      this.logger.error("No client credentials are set for Fhir service!");
      throw new Error("No client credentials are set for Fhir service!");
    }
    this.medplumClient = new MedplumClient({
      baseUrl: this.baseUrl.replace("/fhir/R4", "/"),
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
  }

  // for medplum client
  async clientCredentialsLogin(clientId?: string, clientSecret?: string) {
    try {
      // authenticate with superadmin credentials if no proj credentials provided
      return await this.medplumClient.startClientLogin(
        clientId ? clientId : this.clientId,
        clientSecret ? clientSecret : this.clientSecret
      );
    } catch (error) {
      let error_msg = "Client credentials authentication failed";
      this.logger.error(error_msg);
      this.logger.error(JSON.stringify(error));
      throw new Error(error_msg);
    }
  }

  // for medplum client
  async post(resourceType, body, contentType?, options?) {
    return await this.medplumClient.post(
      this.baseUrl + "/" + resourceType,
      body,
      contentType,
      options
    );
  }

  async forwardRequest(
    resourcePath: string,
    clientCredentials: ClientCredentials,
    httpMethod: HTTPMethod,
    queryParams: any,
    resourceDetails: any,
    fhirHeaders: Headers
  ) {
    const resourceUrl = `${this.baseUrl}/${resourcePath}`;
    const log_msg = `Received response after forwarding ${httpMethod} request to ${resourceUrl}`;

    try {
      const options = await this.getRequestConfig(clientCredentials);
      if (queryParams && Object.keys(queryParams).length > 0) {
        options.params = queryParams;
      }

      if (fhirHeaders && Object.keys(fhirHeaders).length > 0) {
        options.headers = { ...options.headers, ...fhirHeaders };
      }

      let response;
      if (httpMethod === HTTPMethod.GET) {
        response = await axios.get(resourceUrl, options);
      } else if (httpMethod === HTTPMethod.POST) {
        response = await axios.post(resourceUrl, resourceDetails, options);
      } else if (httpMethod === HTTPMethod.PUT) {
        response = await axios.put(resourceUrl, resourceDetails, options);
      } else if (httpMethod === HTTPMethod.PATCH) {
        response = await axios.patch(resourceUrl, resourceDetails, options);
      } else if (httpMethod === HTTPMethod.DELETE) {
        response = await axios.delete(resourceUrl, options);
      }

      if (response.status === undefined && response.response) {
        // errors occur in response.response when posting a resource
        this.logger.error(`[${response.response.status}] ${log_msg}`);
        return {
          status: response.response.status,
          headers: response.response.headers,
          data: response.response.data,
        };
      } else {
        this.logger.info(`[${response.status}] ${log_msg}`);
        return {
          status: response.status,
          headers: response.headers,
          data: response.data,
        };
      }
    } catch (error) {
      if (error.response) {
        // If there is a returned error.response
        this.logger.error(`[${error.response.status}] ${log_msg}`);
        return {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        };
      } else {
        // Other types of errors
        this.logger.error(`[500] ${log_msg}`);
        return {
          status: 500,
          data: {
            error: `An error occurred while forwarding the ${httpMethod} request`,
          },
        };
      }
    }
  }

  async getOneResource(searchResource: string, query: string) {
    return await this.medplumClient.searchOne(searchResource, query);
  }

  async getResourceById(searchResource: string, id: string) {
    return await this.medplumClient.readResource(searchResource, id);
  }

  async updateResource(options) {
    return await this.medplumClient.updateResource(options);
  }

  async searchResource(searchResource: string, query: string) {
    return await this.medplumClient.search(searchResource, query);
  }

  private async getAccessToken(
    clientCredentials: ClientCredentials
  ): Promise<string> {
    const data = {
      grant_type: "client_credentials",
      scope: "openid",
    };

    const options = await this.getTokenRequestConfig(clientCredentials);
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams(data).toString(),
        options
      );
      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to get access token`,
        error.response.data
      );
      throw new Error(error.response.data);
    }
  }

  private async getRequestConfig(clientCredentials: ClientCredentials) {
    let options: AxiosRequestConfig = {};
    const token = await this.getAccessToken(clientCredentials);
    options = {
      headers: {
        Authorization: `Bearer ${token}`,
        httpsAgent: new https.Agent({
          rejectUnauthorized: true,
          //ca: ca_crt
        }),
      },
    };
    return options;
  }

  private async getTokenRequestConfig(clientCredentials: ClientCredentials) {
    let options: AxiosRequestConfig = {};
    options = {
      headers: {
        Authorization: await this.getBasicAuthHeader(clientCredentials),
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    };
    this.logger.info(`Successfully retrieved token!`);
    return options;
  }

  private async getBasicAuthHeader(clientCredentials: ClientCredentials) {
    const temp = `${clientCredentials.clientId}:${clientCredentials.clientSecret}`;
    return `Basic ${Buffer.from(temp).toString("base64")}`;
  }
}

// intercept and log the url sent in axios request
axios.interceptors.request.use((request) => {
  const fullUrl = `${request.baseUrl || ""}${request.url}?${new URLSearchParams(
    request.params
  ).toString()}`;
  console.log(`[axios intercept]`, fullUrl);
  return request;
});
