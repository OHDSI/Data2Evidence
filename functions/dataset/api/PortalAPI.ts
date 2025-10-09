//import { Service } from 'typedi'
import { AxiosRequestConfig } from "npm:axios";
//import { createLogger } from '../Logger'
import https from "node:https";
import { env, services } from "../env.ts";
import type { Dataset } from "../types.d.ts";

interface CreateDatasetInput {
  id: string;
  type: string;
  tokenDatasetCode: string;
  tenantId: string;
  dialect: string;
  databaseCode: string;
  schemaName: string;
  vocabSchemaName: string;
  resultSchemaName: string;
  dataModel: string;
  visibilityStatus: string;
  detail: {
    name: string;
    summary: string;
    description: string;
    showRequestAccess: boolean;
  };
  dashboards: {
    name: string;
    url: string;
  }[];
  attributes: {
    attributeId: string;
    value: string;
  }[];
  tags: string[];
}

interface CopyDatasetInput {
  id: string;
  sourceDatasetId: string;
  newDatasetName: string;
  schemaName?: string;
}

export class PortalAPI {
  private readonly baseURL: string;
  private readonly httpsAgent: any;
  private readonly logger = console; //createLogger(this.constructor.name)
  private readonly token: string;
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Portal API!");
    }
    if (services.portalServer) {
      this.baseURL = services.portalServer;
      this.channel = Trex.tokioChannel("d2e-functions/portal");
      // this.httpsAgent = new https.Agent({
      //   rejectUnauthorized: true,
      //   ca: env.GATEWAY_CA_CERT
      // });
    } else {
      throw new Error("No url is set for PortalAPI");
    }
  }

  private async getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
    };

    return options;
  }

  async getTenants() {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/tenant/list`;
      const result = await this.channel.get(url, options);
      return result.data;
    } catch (error) {
      this.logger.error("Error getting tenants");
      throw new Error("Error getting tenants");
    }
  }

  async getDatasets(): Promise<Dataset[]> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset/list`;
      const result = await this.channel.get(url, options);
      return result.data;
    } catch (error) {
      this.logger.error("Error while getting datasets");
      throw new Error("Error while getting datasets");
    }
  }

  async getDataset(id: string): Promise<Dataset> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset?datasetId=${id}`;
      const result = await this.channel.get(url, options);
      return result.data;
    } catch (error) {
      this.logger.error(`Error while getting dataset ${id}`);
      throw new Error(`Error while getting dataset ${id}`);
    }
  }

  async getStudiesAsSystemAdmin() {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset/list/systemadmin`;
      const result = await await this.channel.get(url, options);
      return result.data;
    } catch (error) {
      this.logger.error("Error getting studies");
      throw new Error("Error getting studies");
    }
  }

  async hasDataset(tokenDatasetCode: string) {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset/exist?tokenDatasetCode=${tokenDatasetCode}`;
      const result = await this.channel.get(url, options);
      return result.data.exist;
    } catch (error) {
      const errorMessage = `Error while finding dataset with token dataset code ${tokenDatasetCode}`;
      this.logger.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async createDataset(data: CreateDatasetInput) {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset`;
      const result = await this.channel.post(url, data, options);
      return result.data;
    } catch (error) {
      this.logger.error(`Error creating dataset. ${error}`);
      throw new Error(`Error creating dataset. ${error}`);
    }
  }

  async copyDataset(data: CopyDatasetInput) {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset/snapshot`;
      const result = await this.channel.post(url, data, options);
      return result.data;
    } catch (error) {
      this.logger.error(`Error copying dataset. ${error}`);
      throw new Error("Error copying dataset");
    }
  }
}
