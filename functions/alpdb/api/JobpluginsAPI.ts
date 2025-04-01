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

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for JobpluginsAPI");
    }
    if (services.jobplugins) {
      this.baseURL = services.jobplugins + this.endpoint;
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

  // TODO: Check where the actual implementation is
  async getSchemasVersionInformation(): Promise<any> {
    this.logger.info(`Getting schemas version information`);
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/db-svc/fetch-version-info`;
    const result = await post(url, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(`Failed get schemas version information`);
  }

  async createCDMSchema(
    databaseCode: string,
    schemaName: string,
    cleansedSchemaOption: boolean,
    dataModel: string,
    dialect: string,
    vocabSchema: string
  ): Promise<any> {
    this.logger.info(
      `Create CDM schema ${schemaName} in ${databaseCode} with cleansed schema option set to ${cleansedSchemaOption}`
    );
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/db-svc/run`;
    const body = {
      dbSvcOperation: "createCDMSchema",
      requestType: "post",
      requestUrl: `/alpdb/${dialect}/database/${databaseCode}/data-model/${dataModel}/schema/${schemaName}`,
      requestBody: {
        cleansedSchemaOption: cleansedSchemaOption,
        vocabSchema: vocabSchema,
      },
    };
    const result = await post(url, body, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(
      `Failed to create CDM schema ${schemaName} with data model ${dataModel} in ${databaseCode}`
    );
  }

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
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/db-svc/run`;
    const body = {
      dbSvcOperation: "copyCDMSchema",
      requestType: "post",
      requestUrl: `/alpdb/${dialect}/database/${databaseCode}/data-model/omop5-4/schemasnapshot/${targetSchemaName}?sourceschema=${sourceSchemaName}`,
      requestBody: { snapshotCopyConfig: snapshotCopyConfig },
    };
    const result = await post(url, body, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(
      `Failed to copy CDM schema ${sourceSchemaName} in ${databaseCode}`
    );
  }

  async copyCDMSchemaParquet(
    databaseCode: string,
    sourceSchemaName: string,
    targetSchemaName: string,
    dialect: string,
    snapshotCopyConfig: any
  ): Promise<any> {
    const data = {
      database: databaseCode,
      sourceSchema: sourceSchemaName,
      targetSchemaName: targetSchemaName,
    };
    this.logger.info(
      `Copy CDM schema (${JSON.stringify(data)}) into parquet file`
    );
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/db-svc/run`;
    const body = {
      dbSvcOperation: "copyCDMSchemaParquet",
      requestType: "post",
      requestUrl: `/alpdb/${dialect}/database/${databaseCode}/data-model/omop5-4/schemasnapshotparquet/${targetSchemaName}?sourceschema=${sourceSchemaName}`,
      requestBody: { snapshotCopyConfig: snapshotCopyConfig },
    };
    const result = await post(url, body, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(
      `Failed to copy CDM schema ${sourceSchemaName} in ${databaseCode} as parquet`
    );
  }

  async updateSchema(
    schemaName: string,
    dataModel: string,
    databaseCode: string,
    dialect: string,
    vocabSchema: string
  ): Promise<any> {
    this.logger.info(`Updating schema for ${schemaName}`);
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/db-svc/run`;
    const body = {
      dbSvcOperation: "updateSchema",
      requestType: "put",
      requestUrl: `/alpdb/${dialect}/database/${databaseCode}/data-model/${dataModel}?schema=${schemaName}`,
      requestBody: { vocabSchema },
    };
    const result = await post(url, body, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(`Failed to update schema for ${schemaName}`);
  }

  async createDataModelFlowRun(
    options: object,
    flowId?: string,
    flowRunName?: string
  ): Promise<any> {
    this.logger.info(`Running create data model flow run`);
    const postOptions = await this.getRequestConfig();
    const url = `${this.baseURL}/datamodel/create_datamodel_run`;
    const body = {
      flowId,
      options,
      flowRunName,
    };
    const result = await post(url, body, postOptions);

    if (result.data) {
      return result.data;
    }
    throw new Error(`Failed to run flow`);
  }

  async getDatamodels(): Promise<any> {
    this.logger.info(`Getting datamodels`);
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/datamodel/list`;
    const result = await get(url, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(`Failed get datamodels`);
  }
}
