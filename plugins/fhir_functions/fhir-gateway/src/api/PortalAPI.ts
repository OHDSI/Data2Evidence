import { services } from "../env";
import { Dataset } from "../types";
import axios, { AxiosRequestConfig } from "axios";

export class PortalAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly logger = console;

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

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
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to fetch datasets: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async getDatasetById(datasetId: string): Promise<Dataset> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset?datasetId=${datasetId}`;
      const result = await axios.get(url, options);
      return result.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to get dataset: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async updateDataset(datasetToUpdate: Dataset) {
    try {
      const options = await this.getRequestConfig();
      this.logger.info(
        `Updating portal dataset id '${datasetToUpdate.id}' to link to FHIR dataset with id '${datasetToUpdate.fhirDatasetId}'`,
      );
      const url = `${this.baseURL}/dataset`;
      const result = await axios.put(url, datasetToUpdate, options);
      return result.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to update dataset: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
}
