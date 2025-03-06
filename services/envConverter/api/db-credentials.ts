import { Agent } from "https";
import { get } from "./request-util";
import { OpenIdApi } from "./open-id";

type Database = {
  id: string;
  host: string;
  port: number;
  name: string;
  dialect: string;
  db_extra: {
    value: object;
  };
  credentials: {
    username: string;
    password: string;
    salt: string;
    user_scope: string;
  }[];
  vocab_schemas: string[];
  authentication_mode: string;
};

export class DbCredentialsApi {
  private readonly baseUrl: string;
  private readonly httpsAgent: Agent;
  constructor() {
    if (!process.env.URL__DATABASE_LIST__GET) {
      console.error("No baseUrl found to fetch database credentials list");
      throw new Error("No baseUrl found to fetch database credentials list");
    }
    this.baseUrl = process.env.URL__DATABASE_LIST__GET;
    this.httpsAgent = new Agent({
      rejectUnauthorized: true,
      ca: process.env.TLS__INTERNAL__CA_CRT?.replace(/\\n/g, "\n"),
    });
  }

  async getDatabases(): Promise<Database[]> {
    const options = await this.getRequestConfig();
    try {
      const url = `${this.baseUrl}list`;
      const response = await get<Database[]>(url, options);
      return response.data;
    } catch (error) {
      const errorMessage = "Failed to get databases";
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  private async getRequestConfig() {
    const token = await this.getToken(process.env.IDP__SCOPE!);
    if (!token || !token.access_token) {
      console.error("Unable to get access token");
      throw new Error("Unable to get access token");
    }

    return {
      httpsAgent: this.httpsAgent,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    };
  }

  private async getToken(scope: string) {
    const SERVICE_ROUTES = process.env.SERVICE_ROUTES || "{}";
    const issuerUrl = JSON.parse(SERVICE_ROUTES).idIssuerUrl;

    if (!issuerUrl) {
      console.error("IDP issuer url is not defined");
      throw new Error("IDP issuer url is not defined");
    }

    const clientId = process.env.IDP__ALP_SVC__CLIENT_ID;
    if (!clientId) {
      console.error("IDP client id is not defined");
      throw new Error("IDP client id is not defined");
    }

    const clientSecret = process.env.IDP__ALP_SVC__CLIENT_SECRET;
    if (!clientSecret) {
      console.error("IDP client secret is not defined");
      throw new Error("IDP client secret is not defined");
    }

    const client = new OpenIdApi({ issuerUrl });

    console.log("Get client credentials token");
    return await client.getClientCredentialsToken({
      clientId,
      clientSecret,
      scope,
    });
  }
}
