import https from "https";
import { Buffer } from "buffer";
import axios, { AxiosRequestConfig } from "axios";

import { env, services } from "../env.ts";
import { ClientCredentials, HTTPMethod, Headers } from "../utils/types.ts";

export class FhirAPI {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly logger = console;
  private readonly tokenUrl: string;
  private adminAccessToken: string;
  private browserToken: string

  constructor(token) {
    if (env.FHIR__CLIENT_ID && env.FHIR__CLIENT_SECRET) {
      this.clientId = env.FHIR__CLIENT_ID;
      this.clientSecret = env.FHIR__CLIENT_SECRET;
      this.baseUrl = services.fhirServer;
      this.tokenUrl = services.fhirTokenUrl;
      this.browserToken = token;
    } else {
      this.logger.error("No client credentials are set for Fhir service!");
      throw new Error("No client credentials are set for Fhir service!");
    }
  }

  async forwardRequest(
    resourcePath: string,
    clientCredentials: ClientCredentials,
    httpMethod: HTTPMethod,
    queryParams: any,
    resourceDetails: any,
    fhirHeaders?: Headers,
  ) {
    const resourceUrl = `${this.baseUrl}${resourcePath ? '/' + resourcePath : ''}`;
    const log_msg = `Received response after forwarding ${httpMethod} request to ${resourceUrl}`;
    try {
      let options = await this.getRequestConfig(clientCredentials);
      if (!options || typeof options !== 'object') {
        options = {};
      }
      if (queryParams && Object.keys(queryParams).length > 0) {
        options.params = queryParams;
      }
      options.headers = { ...(options.headers || {}), ...(fhirHeaders || {}) };
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
      if (response && response.status !== undefined) {
        this.logger.info(`[${response.status}] ${log_msg}`);
        return {
          status: response.status,
          headers: response.headers,
          data: response.data,
        };
      } else if (response && response.response) {
        // errors occur in response.response when posting a resource
        this.logger.error(`[${response.response.status}] ${log_msg}`);
        throw new Error(`[${response.response.status}] ${log_msg}: ${JSON.stringify(response.response.data)}`);
      }
    } catch (error) {
      if (error.response) {
        this.logger.error(`[${error.response.status}] ${log_msg}: ${JSON.stringify(error.response.data)}`);
        throw new Error(`[${error.response.status}] ${log_msg}: ${JSON.stringify(error.response.data)}`);
      } else {
        this.logger.error(`[500] ${log_msg}: ${error.message}`);
        throw new Error(`[500] ${log_msg}: ${error.message}`);
      }
    }
  }

  private async getAccessToken(
    clientCredentials: ClientCredentials
  ): Promise<string> {
    const data = {
      grant_type: "client_credentials",
      scope: "openid",
    };

    const options = this.getTokenRequestConfig(clientCredentials);
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
        "cookie": `fhirtoken=${this.browserToken}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
      }),
    };
    return options;
  }
  
  private getTokenRequestConfig(clientCredentials: ClientCredentials) {
    let options: AxiosRequestConfig = {};
    const basicAuth = this.getBasicAuthHeader(clientCredentials);
    options = {
      headers: {
        Authorization: basicAuth,
        "Content-Type": "application/x-www-form-urlencoded",
        "cookie": `fhirtoken=${this.browserToken}`
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: true }),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    };
    return options;
  }

  private getBasicAuthHeader(clientCredentials: ClientCredentials) {
    const temp = `${clientCredentials.clientId}:${clientCredentials.clientSecret}`;
    return `Basic ${Buffer.from(temp).toString("base64")}`;
  }

  getAdminCredentials(): ClientCredentials{
    return {
      clientId: this.clientId,
      clientSecret: this.clientSecret
    };
  }
}

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error(`${error?.config?.method} ${error?.config?.url} ${error}`);
    return error.response;
  }
);