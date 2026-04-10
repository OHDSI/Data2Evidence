import axios, { AxiosRequestConfig } from "npm:axios";
import { services } from "../env";
import { Dataset } from "../types";

export class PortalAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly logger = console;

  constructor(token: string) {
    if (!token) throw new Error("No token passed for PortalAPI!");
    if (!services.portalServer) throw new Error("No url is set for PortalAPI");

    this.token = token;
    this.baseURL = services.portalServer;
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

  async getDatasets(): Promise<Dataset[]> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset/list/systemadmin?role=systemAdmin`;
      const result = await axios.get(url, options);
      return result.data;
    } catch (error) {
      this.logger.error("Error while getting datasets");
      throw new Error("Error while getting datasets");
    }
  }

  async getDatasetById(datasetId: string): Promise<Dataset> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset?datasetId=${datasetId}`;
      const result = await axios.get(url, options);
      return result.data;
    } catch (error) {
      this.logger.error("Error while getting dataset");
      throw new Error("Error while getting dataset");
    }
  }

  async updateDataset(datasetToUpdate: Dataset) {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset`;
      const result = await axios.put(url, datasetToUpdate, options);
      return result.data;
    } catch (error) {
      this.logger.error("Error while updating dataset");
      throw new Error("Error while updating dataset");
    }
  }
}
