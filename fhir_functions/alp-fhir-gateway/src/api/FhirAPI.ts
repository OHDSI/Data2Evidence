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
  private projectAccessToken: string
  private browserToken: string

  constructor(token) {
    if (env.FHIR__CLIENT_ID && env.FHIR__CLIENT_SECRET) {
      this.clientId = env.FHIR__CLIENT_ID;
      this.clientSecret = env.FHIR__CLIENT_SECRET;
      this.baseUrl = services.fhir;
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
    isAdminRequest: boolean,
    fhirHeaders?: Headers
  ) {
    const resourceUrl = `${this.baseUrl}/${resourcePath}`;
    const log_msg = `Received response after forwarding ${httpMethod} request to ${resourceUrl}`;
    try {
      let options = await this.getRequestConfig(clientCredentials, isAdminRequest);
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
        return {
          status: response.response.status,
          headers: response.response.headers,
          data: response.response.data,
        };
      }
    } catch (error) {
      if (error.response) {
        this.logger.error(`[${error.response.status}] ${log_msg}: ${JSON.stringify(error.response.data)}`);
        return {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data,
        };
      } else {
        this.logger.error(`[500] ${log_msg}: ${error.message}`);
        return {
          status: 500,
          data: {
            error: `An error occurred while forwarding the ${httpMethod} request: ${error.message}`,
          },
        };
      }
    }
  }

  private async getAccessToken(
    clientCredentials: ClientCredentials,
    isAdminRequest: boolean = true
  ): Promise<string> {
    const data = {
      grant_type: "client_credentials",
      scope: "openid",
    };
    if(isAdminRequest && this.adminAccessToken){
        return this.adminAccessToken;
    }else if(!isAdminRequest && this.projectAccessToken){
        return this.projectAccessToken;
    }
    const options = this.getTokenRequestConfig(clientCredentials);
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams(data).toString(),
        options
      );
      if(isAdminRequest)
        this.adminAccessToken = response.data.access_token;
      else
        this.projectAccessToken = response.data.access_token;
      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        `An error occurred while trying to get access token`,
        error.response.data
      );
      throw new Error(error.response.data);
    }
  }

  private async getRequestConfig(clientCredentials: ClientCredentials, isAdminRequest: boolean) {
    let options: AxiosRequestConfig = {};
    const token = await this.getAccessToken(clientCredentials, isAdminRequest);
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
