import { AxiosRequestConfig } from "axios";
import { services } from "../env.ts";
import { post } from "./request-util.ts";

export class DatasetAPI {
  private readonly baseURL: string;
  private readonly httpsAgent: any;
  private readonly logger = console; //createLogger(this.constructor.name)
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for DatasetAPI!");
    }

    if (services.dataset) {
      this.baseURL = services.dataset;
      // this.httpsAgent = new https.Agent({
      //   rejectUnauthorized: true,
      //   ca: env.GATEWAY_CA_CERT
      // });
    } else {
      this.logger.error("No url is set for DatasetAPI");
      throw new Error("No url is set for DatasetAPI");
    }
  }

  async createDataset(dto: any) {
    try {
      this.logger.info("Create dataset");
      const options = await this.getRequestConfig();
      const url = this.baseURL;
      const result = await post(url, dto, options);
      return result.data;
    } catch (error) {
      console.error(`Error while creating dataset: ${error}`);
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
