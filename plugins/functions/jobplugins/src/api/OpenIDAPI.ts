import { env, services } from "../env.ts";

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
      // External-capable IdP — bypasses request-util (axios) deliberately.
      // Body stays JSON-encoded, matching the previous createOptions() headers.
      // See trex/plans/2026-07-27-axios-to-fetch-minimal-v3.md
      const res = await fetch(`${this.baseURL}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        throw new Error(
          `IdP token request failed with status ${res.status}: ${await res.text()}`
        );
      }
      const result = { data: await res.json() };
      return result.data.access_token;
    } catch (err) {
      console.error("Error when getting client credentials token", err);
      throw err;
    }
  }
}
