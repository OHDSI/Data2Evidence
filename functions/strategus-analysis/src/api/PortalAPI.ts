import { AxiosRequestConfig } from "npm:axios";
import { services } from "../env.ts";

interface CreateDatasetInput {
  id: string;
  type: string;
  tokenDatasetCode: string;
  tenantId: string;
  dialect: string;
  databaseCode: string;
  schemaName: string;
  vocabSchemaName: string;
  resultsSchemaName: string;
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

export class PortalAPI {
  private readonly baseURL: string;
  private readonly logger = console;
  private readonly token: string;
  private readonly channel: any;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Portal API!");
    }
    if (services.portalServer) {
      this.baseURL = services.portalServer;
      this.channel = Trex.tokioChannel("d2e-functions/portal");
    } else {
      throw new Error("No url is set for PortalAPI");
    }
  }

  private async getRequestConfig() {
    const options: AxiosRequestConfig = {
      headers: {
        Authorization: this.token,
      },
    };
    return options;
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
}
