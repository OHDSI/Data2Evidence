import { AxiosRequestConfig } from "axios";
import { services } from "../env.ts";
import { get } from "./request-util.ts";
import { IDataset } from "../type.d.ts";

export class PortalAPI {
  private readonly baseURL: string;
  private readonly httpsAgent: any;
  private readonly logger = console; //createLogger(this.constructor.name)
  private readonly token: string;
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for PortalAPI!");
    }

    if (services.portalServer) {
      this.baseURL = services.portalServer;
      this.channel = Trex.tokioChannel("d2e-functions/portal");
      // this.httpsAgent = new https.Agent({
      //   rejectUnauthorized: true,
      //   ca: env.GATEWAY_CA_CERT
      // });
    } else {
      this.logger.error("No url is set for PortalAPI");
      throw new Error("No url is set for PortalAPI");
    }
  }

  async getDatasets(): Promise<IDataset[]> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset/list/systemadmin`;
      const result = await this.channel.get(url, options);
      return result.data;
    } catch (error) {
      console.error(`Error while getting datasets: ${error}`);
      throw error;
    }
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
      httpsAgent: this.httpsAgent,
    };

    return options;
  }
}
