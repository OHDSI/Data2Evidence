// import https from "node:https";
import { AxiosRequestConfig } from "npm:axios";
import {
  ICreateDatamodelFlowRunDto,
  ICreateFhirCacheFlowRunDto,
} from "../../jobplugins/src/types.ts";
import { services } from "../env.ts";
import { post } from "./request-util.ts";

export class JobPluginsAPI {
  private readonly baseURL: string;
  // private readonly httpsAgent: any;
  private readonly logger = console; //createLogger(this.constructor.name)
  private readonly token: string;
  private readonly endpoint: string = "/jobplugins";
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for Jobplugins API!");
    }
    if (services.jobplugins) {
      this.baseURL = services.jobplugins + this.endpoint;
      this.channel = Trex.tokioChannel("d2e-functions/jobplugins");
      // this.httpsAgent = new https.Agent({
      //   rejectUnauthorized: true,
      //   ca: env.GATEWAY_CA_CERT
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
      // httpsAgent: this.httpsAgent,
    };

    return options;
  }

  async createDatamodelFlowRun(data: ICreateDatamodelFlowRunDto) {
    this.logger.info("Running create datamodel flow run");
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/datamodel/create_datamodel_run`;
    const result = await this.channel.post(url, data, options);
    if (result.data) {
      return result.data;
    }
    throw new Error("Failed create datamodel flow run");
  }

  async createFhirCacheFlowRun(data: ICreateFhirCacheFlowRunDto) {
    this.logger.info("Running create FHIR cache flow run");
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/cachedb/create-fhir-file`;
    const result = await this.channel.post(url, data, options);
    if (result.data) {
      return result.data;
    }
    throw new Error("Failed create FHIR cache flow run");
  }

  async getDatamodels() {
    this.logger.info("Running get datamodel list");
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/datamodel/list`;
    const result = await this.channel.get(url, options);
    if (result.data) {
      return result.data;
    }
    throw new Error("Failed get datamodels");
  }

  async getSchemasVersionInformation(): Promise<any> {
    this.logger.info(`Getting schemas version information`);
    const options = await this.getRequestConfig();
    const url = `${this.baseURL}/db-svc/fetch-version-info`;
    const result = await this.channel.post(url, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(`Failed get schemas version information`);
  }

  async createCDMSchema(
    databaseCode: string,
    schemaName: string,
    dataModel: string,
    dialect: string,
    vocabSchema: string
  ): Promise<any> {
    this.logger.info(`Create CDM schema ${schemaName} in ${databaseCode}`);
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
    const result = await this.channel.post(url, body, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(
      `Failed to copy CDM schema ${sourceSchemaName} in ${databaseCode}`
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
    const result = await this.channel.post(url, body, options);
    if (result.data) {
      return result.data;
    }
    throw new Error(`Failed to update schema for ${schemaName}`);
  }

  async createDatamartCacheFlowRun(
    datasetId: string,
    cacheDatasetId: string,
    snapshotCopyConfig: object,
    flowId?: string,
    flowRunName?: string
  ): Promise<any> {
    this.logger.info(`Running datamart cache flow run`);

    try {
      const postOptions = await this.getRequestConfig();
      const url = `${this.baseURL}/cachedb/create-file`;
      const body = {
        datasetId,
        cacheDatasetId,
        flowId,
        snapshotCopyConfig,
        flowRunName,
      };
      const result = await post(url, body, postOptions);

      if (result.data) {
        return result.data;
      }
    } catch (error) {
      this.logger.error(`Error running datamart flow run: ${error}`);
      throw new Error(`Error running datamart flow run: ${error}`);
    }
  }
}
