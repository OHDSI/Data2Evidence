import { env } from "../env";
import http from "node:http";

export class PortalServerAPI {
  private readonly baseUrl: string;
  private agent: any;
  private channel;

  constructor() {
    this.baseUrl = env.SERVICE_ROUTES.portalServer;
    this.agent = new http.Agent({ keepAlive: true });
    if (!this.baseUrl) {
      throw new Error("Portal Server URL is not configured!");
    }
    this.channel = Trex.tokioChannel("d2e-functions/portal");
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

  async getDataset(token: string) {
    const options = await this.getRequestConfig(token);
    const result = await this.channel.get(
      `${this.baseUrl}/dataset/list/systemadmin`,
      options
    );
    return result.data;
  }
}
