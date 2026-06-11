import { services } from "../env";
import { Dataset } from "../types";

export class PortalAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly logger = console;
  // deno-lint-ignore no-explicit-any
  private readonly channel: any;

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
    // @ts-ignore To ignore Cannot find name 'Trex'
    this.channel = Trex.tokioChannel("d2e-functions/portal");
  }

  private createOptions(method: string): RequestInit {
    return {
      method,
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
      },
    };
  }

  async getDatasets(): Promise<Dataset[]> {
    try {
      const url = `${this.baseURL}/dataset/list/systemadmin?role=systemAdmin`;
      const result = await this.channel.get(url, this.createOptions("GET"));
      return result.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to fetch datasets: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async getDatasetById(datasetId: string): Promise<Dataset> {
    try {
      const url = `${this.baseURL}/dataset?datasetId=${datasetId}`;
      const result = await this.channel.get(url, this.createOptions("GET"));
      return result.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to get dataset: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  async updateDataset(datasetToUpdate: Dataset) {
    try {
      this.logger.info(
        `Updating portal dataset id '${datasetToUpdate.id}' to link to FHIR dataset with id '${datasetToUpdate.fhirDatasetId}'`,
      );
      const url = `${this.baseURL}/dataset`;
      const result = await this.channel.put(
        url,
        datasetToUpdate,
        this.createOptions("PUT"),
      );
      return result.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to update dataset: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
}
