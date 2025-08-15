import { AxiosRequestConfig } from "axios";
import { services } from "../env.ts";
import { post } from "./request-util.ts";
import {
  ICacheCreateFlowRun,
  IDcCreateFlowRun,
  IDqdCreateFlowRun,
  IGetVersionInfoCreateFlowRun,
} from "../type.d.ts";

export class JobPluginsAPI {
  private readonly baseURL: string;
  private readonly httpsAgent: any;
  private readonly logger = console; //createLogger(this.constructor.name)
  private readonly token: string;
  private readonly endpoint: string = "/jobplugins";

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for JobPluginsAPI!");
    }

    if (services.jobplugins) {
      this.baseURL = services.jobplugins + this.endpoint;
      // this.httpsAgent = new https.Agent({
      //   rejectUnauthorized: true,
      //   ca: env.GATEWAY_CA_CERT
      // });
    } else {
      this.logger.error("No url is set for JobPluginsAPI");
      throw new Error("No url is set for JobPluginsAPI");
    }
  }

  async createCacheFlowRun(dto: ICacheCreateFlowRun) {
    try {
      this.logger.info(`Create cache flow run: ${JSON.stringify(dto)}`);
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cachedb/create-file`;
      const result = await post(url, dto, options);
      return result.data;
    } catch (error) {
      console.error(`Error while creating cache flow run: ${error}`);
      throw error;
    }
  }

  async createDqdFlowRun(dto: IDqdCreateFlowRun) {
    try {
      this.logger.info(`Create DQD flow run: ${JSON.stringify(dto)}`);
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dqd/data-quality/flow-run`;
      const result = await post(url, dto, options);
      return result.data;
    } catch (error) {
      console.error(`Error while creating DQD flow run: ${error}`);
      throw error;
    }
  }

  async createDcFlowRun(dto: IDcCreateFlowRun) {
    try {
      this.logger.info(`Create DC flow run: ${JSON.stringify(dto)}`);
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dqd/data-characterization/flow-run`;
      const result = await post(url, dto, options);
      return result.data;
    } catch (error) {
      console.error(`Error while creating DC flow run: ${error}`);
      throw error;
    }
  }

  async createGetVersionInfoFlowRun(dto: IGetVersionInfoCreateFlowRun) {
    try {
      this.logger.info(
        `Create data-model version-info: ${JSON.stringify(dto)}`
      );
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/datamodel/get_version_info`;
      const result = await post(url, dto, options);
      return result.data;
    } catch (error) {
      console.error(`Error while creating data-model version-info: ${error}`);
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
