import { env, services } from "../env.ts";
import { post } from "./request-util.ts";

export class OpenIDAPI {
  private readonly baseURL: string;

  constructor() {
    if (services.idIssuerUrl) {
      this.baseURL = services.idIssuerUrl;
    } else {
      throw new Error("No url is set for OpenIDAPI");
    }
  }

  async getClientCredentialsToken(): Promise<string> {
    const body = {
      grant_type: "client_credentials",
      client_id: env.IDP__ALP_DATA_CLIENT_ID,
      client_secret: env.IDP__ALP_DATA__CLIENT_SECRET,
    };

    try {
      const options = this.createOptions("GET");
      const result = await post(`${this.baseURL}/token`, body, options);
      return result.data.access_token;
    } catch (err) {
      console.error("Error when getting client credentials token", err);
      throw err;
    }
  }

  private createOptions(method: string): RequestInit {
    return {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
}
