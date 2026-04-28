import { env } from "../configs";
import http from "node:http";

export default class PortalServerAPI {
  private readonly baseUrl: string;
  private agent: any;
  private portalapi;

  constructor() {
    this.baseUrl = env.SERVICE_ROUTES.portalServer;
    this.agent = new http.Agent({ keepAlive: true });
    if (!this.baseUrl) {
      throw new Error("Portal Server URL is not configured!");
    }
    this.portalapi = Trex.tokioChannel("d2e-functions/portal");
  }

  private async getRequestConfig(token: string) {
    let options = {};
    if (token) {
      options = {
        headers: {
          Authorization: token,
        },
        httpAgent: this.agent,
      };
    }
    return options;
  }

  async getDataset(token: string, datasetId: string) {
    const options = await this.getRequestConfig(token);
    const result = await this.portalapi.get(
      `${this.baseUrl}/dataset?datasetId=${encodeURIComponent(datasetId)}`,
      options
    );
    return result.data;
  }
}
