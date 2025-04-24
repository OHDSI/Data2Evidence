import { env } from "../env";

export class PrefectAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Prefect API!");
    }
    if (env.SERVICE_ROUTES.prefect) {
      this.baseURL = env.SERVICE_ROUTES.prefect;
    } else {
      throw new Error("No url is set for Prefect API");
    }
  }

  private createOptions(method: string, data?: object): RequestInit {
    const headers: Record<string, string> = {
      Authorization: this.token,
    };

    // Only add Content-Type for requests that have a body (not for GET)
    if (method !== "GET" && data) {
      headers["Content-Type"] = "application/json";
    }

    return {
      method,
      headers,
      // Only include body for non-GET requests
      body: method !== "GET" && data ? JSON.stringify(data) : undefined,
    };
  }

  async getFlowRunsArtifactsByFlowRunId(flowRunId: string) {
    const errorMessage = `Error while getting prefect flow run artifacts flow run id: ${flowRunId}`;
    try {
      const url = `${this.baseURL}/artifacts/filter`;
      const data: Record<string, string | object> = {
        flow_runs: {
          id: {
            any_: [flowRunId],
          },
        },
      };
      const options = this.createOptions("POST", data);
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorBody = await res.text(); // Read the response body as text
        throw new Error(`${errorMessage}. Response: ${errorBody}`);
      }
  
      return await res.json();
    } catch (error) {
      console.info(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }
}
