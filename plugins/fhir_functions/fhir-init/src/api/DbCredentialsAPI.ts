import { env, services } from "../env.ts";
import { get, post } from "../utils/request-util";
import type { IDbCreateDto, IDbDto } from "../utils/type";
import http from "node:http";

export class DbCredentialsAPI {
  protected readonly logger = console;
  private readonly baseURL: string;
  private agent: any;
  private accessToken: string;
  private readonly oauthUrl: string;

  constructor() {
    this.accessToken = "";
    this.oauthUrl = env.ALP_GATEWAY_OAUTH__URL;
    this.agent = new http.Agent({ keepAlive: true });
    if (services.trex) {
      this.baseURL = services.trex;
    } else {
      this.logger.error("No url is set for DbCredentialsApi");
      throw new Error("No url is set for DbCredentialsApi");
    }
  }

  async getClientCredentialsToken() {
    try {
      const params = {
        grant_type: "client_credentials",
        client_id: env.IDP__ALP_DATA__CLIENT_ID,
        client_secret: env.IDP__ALP_DATA__CLIENT_SECRET,
      };

      const data = Object.keys(params)
        .map(
          (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
        )
        .join("&");
      // External-capable OAuth gateway — native fetch, not the axios shim.
      // See trex/plans/2026-07-27-axios-to-fetch-minimal-v3.md
      const res = await fetch(this.oauthUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        throw new Error(
          `OAuth token request failed with status ${res.status}: ${await res.text()}`
        );
      }
      const result = { data: await res.json() };
      this.accessToken = `Bearer ${result.data.access_token}`;
      return this.accessToken;
    } catch (error: any) {
      console.error(`Error obtaining client credentials token: ${error.response?.data || error.message}`);
      throw error;
    }
  }

  private async getRequestConfig() {
    return {
      headers: {
        Authorization: this.accessToken,
      },
    };
  }

  async getDbList(): Promise<IDbDto[]> {
    try {
      this.logger.info("Get database list");
      const options = await this.getRequestConfig();
      // Internal (services.trex). Intentionally still axios via request-util:
      // not on the external-HTTPS failure path.
      const url = `${this.baseURL}/trex/db/`;
      const result = await get(url, options);
      return result.data;
    } catch (error) {
      console.error(`Error while getting database list: ${error}`);
      throw error;
    }
  }

  async createDb(dto: IDbCreateDto) {
    try {
      this.logger.info("Create database");
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/trex/db/`;
      const result = await post(url, dto, options);
      return result.data;
    } catch (error) {
      console.error(`Error while creating database: ${error}`);
      throw error;
    }
  }
}
