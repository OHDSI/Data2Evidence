import axios, { AxiosRequestConfig } from "axios";
import { env } from "../env.ts";

export class PortalServerAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Analytics API!");
    }

    if (env.SERVICE_ROUTES.portalServer) {
      this.baseURL = env.SERVICE_ROUTES.portalServer;
    } else {
      console.error("No url is set for PortalServerAPI");
      throw new Error("No url is set for AnalyticsAPI");
    }
  }

  async getStudy(datasetId: string) {
    const options = await this.getRequestConfig();
    const result = await axios.get(
      `${this.baseURL}/dataset?datasetId=${datasetId}`,
      options
    );
    return result.data;
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 20000,
    };

    return options;
  }
}
