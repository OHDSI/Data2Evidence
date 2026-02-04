import { AxiosRequestConfig } from "npm:axios";
import { services } from "../env.ts";
import { get, post } from "./request-util.ts";
//import { createLogger } from '../Logger'
// import { Agent } from "node:https";

export class JobpluginsAPI {
  private readonly logger = console;
  // private readonly httpsAgent: Agent;
  private readonly baseURL: string;
  private readonly token: string;
  private readonly endpoint: string = "/jobplugins";
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for JobpluginsAPI");
    }
    if (services.jobplugins) {
      this.baseURL = services.jobplugins + this.endpoint;
      this.channel = Trex.tokioChannel("d2e-functions/jobplugins");
      // this.httpsAgent = new Agent({
      //   rejectUnauthorized: true,
      //   ca: env.GATEWAY_CA_CERT,
      // });
    } else {
      this.logger.error("No url is set for JobpluginsAPI");
      throw new Error("No url is set for JobpluginsAPI");
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

  // TODO: Improve error handling - extract error details from error.response instead of silently catching
  async getSchemasVersionInformation(): Promise<any> {
    this.logger.info(`Getting schemas version information`);
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/db-svc/fetch-version-info`;
      const result = await post(url, options);
      // Note: Trex tokio channel now throws on non-2xx responses, so errors are handled via catch
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(`Failed get schemas version information: ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`);
      throw error;
    }
  }

  // TODO: Improve error handling - extract error details from error.response instead of silently catching
  async createCDMSchema(
    databaseCode: string,
    schemaName: string,
    dataModel: string,
    dialect: string,
    vocabSchema: string
  ): Promise<any> {
    this.logger.info(`Create CDM schema ${schemaName} in ${databaseCode}`);
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/db-svc/run`;
      const body = {
        dbSvcOperation: "createCDMSchema",
        requestType: "post",
        requestUrl: `/alpdb/${dialect}/database/${databaseCode}/data-model/${dataModel}/schema/${schemaName}`,
        requestBody: {
          vocabSchema: vocabSchema,
        },
      };
      const result = await this.channel.post(url, body, options);
      // Note: Trex tokio channel now throws on non-2xx responses, so errors are handled via catch
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(`Failed to create CDM schema ${schemaName} with data model ${dataModel} in ${databaseCode}: ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`);
      throw error;
    }
  }

  // TODO: Improve error handling - extract error details from error.response instead of silently catching
  async copyCDMSchema(
    databaseCode: string,
    sourceSchemaName: string,
    targetSchemaName: string,
    dialect: string,
    snapshotCopyConfig: any
  ) {
    const data = {
      database: databaseCode,
      sourceSchema: sourceSchemaName,
      targetSchemaName: targetSchemaName,
    };
    this.logger.info(`Copy CDM schema (${JSON.stringify(data)})`);
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/db-svc/run`;
      const body = {
        dbSvcOperation: "copyCDMSchema",
        requestType: "post",
        requestUrl: `/alpdb/${dialect}/database/${databaseCode}/data-model/omop5-4/schemasnapshot/${targetSchemaName}?sourceschema=${sourceSchemaName}`,
        requestBody: { snapshotCopyConfig: snapshotCopyConfig },
      };
      const result = await this.channel.post(url, body, options);
      // Note: Trex tokio channel now throws on non-2xx responses, so errors are handled via catch
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(`Failed to copy CDM schema ${sourceSchemaName} in ${databaseCode}: ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`);
      throw error;
    }
  }

  // TODO: Improve error handling - extract error details from error.response instead of silently catching
  async updateSchema(
    schemaName: string,
    dataModel: string,
    databaseCode: string,
    dialect: string,
    vocabSchema: string
  ): Promise<any> {
    this.logger.info(`Updating schema for ${schemaName}`);
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/db-svc/run`;
      const body = {
        dbSvcOperation: "updateSchema",
        requestType: "put",
        requestUrl: `/alpdb/${dialect}/database/${databaseCode}/data-model/${dataModel}?schema=${schemaName}`,
        requestBody: { vocabSchema },
      };
      const result = await this.channel.post(url, body, options);
      // Note: Trex tokio channel now throws on non-2xx responses, so errors are handled via catch
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(`Failed to update schema for ${schemaName}: ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`);
      throw error;
    }
  }

  // TODO: Improve error handling - extract error details from error.response instead of silently catching
  async createDataModelFlowRun(
    options: object,
    flowId?: string,
    flowRunName?: string
  ): Promise<any> {
    this.logger.info(`Running create data model flow run`);
    try {
      const postOptions = await this.getRequestConfig();
      const url = `${this.baseURL}/datamodel/create_datamodel_run`;
      const body = {
        flowId,
        options,
        flowRunName,
      };
      const result = await this.channel.post(url, body, postOptions);
      // Note: Trex tokio channel now throws on non-2xx responses, so errors are handled via catch
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(`Failed to run flow: ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`);
      throw error;
    }
  }

  // TODO: Improve error handling - extract error details from error.response instead of silently catching
  async getDatamodels(): Promise<any> {
    this.logger.info(`Getting datamodels`);
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/datamodel/list`;
      const result = await this.channel.get(url, options);
      // Note: Trex tokio channel now throws on non-2xx responses, so errors are handled via catch
      return result.data;
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const responseData = error.response?.data;
      this.logger.error(`Failed get datamodels: ${error.message}, status: ${status}, data: ${JSON.stringify(responseData)}`);
      throw error;
    }
  }
}
