import { env } from "../env";
import axios from "axios";
import { D2ECohortDefinition } from "../types/tool-schemas";
import { getUserName } from "../utils/request-helpers";

export class WebAPIAPI {
  private readonly token: string;
  private readonly channel: any;
  private readonly baseURL: string;
  private readonly datasetId: string;

  constructor() {
    // Initialize with default token and datasetId for internal service communication
    this.token = "bearer";
    this.datasetId = "id";
    // @ts-ignore To ignore Cannot find name 'Trex'
    this.channel = Trex.tokioChannel("d2e-functions/d2e-webapi");
    this.baseURL = env.SERVICE_ROUTES["d2e-webapi"];
  }

  private async getRequestConfig() {
    let options = {
      headers: {
        Authorization: this.token,
        datasetId: this.datasetId,
      },
      timeout: 20000,
    };
    return options;
  }

  async getAtlasCohortDefinitionList(
    authorization: string,
    datasetId: string
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cohortdefinition?source=pa`;
      options.headers["Authorization"] = authorization;
      options.headers["datasetId"] = datasetId;
      const t0 = performance.now();
      const response = await this.channel.get(url, options);
      console.log(`[MCP-TIMING] [WebAPIAPI] getAtlasCohortDefinitionList in ${(performance.now() - t0).toFixed(1)}ms`);
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting atlas cohort definition`);
    }
  }

  async getAtlasCohortDefinition(cohortId: number): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cohortdefinition/${cohortId}`;
      const t0 = performance.now();
      const response = await this.channel.get(url, options);
      console.log(`[MCP-TIMING] [WebAPIAPI] getAtlasCohortDefinition(${cohortId}) in ${(performance.now() - t0).toFixed(1)}ms`);
      return response.status === 200 ? response.data : null;
    } catch (error) {
      console.error(error);
      throw new Error(
        `Error while get info of atlas cohort definition: ${error}`
      );
    }
  }

  async createAtlasCohortDefinition(
    cohortDefinition: any,
    authorization: string
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      options.headers["Authorization"] = authorization;
      const url = `${this.baseURL}/cohortdefinition`;

      const currentTime = Date.now();
      const t0 = performance.now();
      const userName = await getUserName(authorization);
      console.log(`[MCP-TIMING] [WebAPIAPI] createAtlas getUserName in ${(performance.now() - t0).toFixed(1)}ms`);
      const expression =
        typeof cohortDefinition.expression === "string"
          ? JSON.parse(cohortDefinition.expression)
          : cohortDefinition.expression;

      const payload: D2ECohortDefinition = {
        id: 1,
        name: `${cohortDefinition.cohortInfo}`,
        description: `${cohortDefinition.cohortInfo}`,
        expressionType: "SIMPLE_EXPRESSION",
        expression: expression,
        createdBy: userName,
        createdDate: currentTime,
        modifiedBy: userName,
        modifiedDate: currentTime,
        tags: [],
      };
      const t1 = performance.now();
      const response = await this.channel.post(url, payload, options);
      console.log(`[MCP-TIMING] [WebAPIAPI] createAtlasCohortDefinition POST in ${(performance.now() - t1).toFixed(1)}ms`);
      return response.status === 200 ? response.data : null;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while creating atlas cohort definition: ${error}`);
    }
  }

  async checkAtlasCohortDefinition(
    cohortDefinitionExpression: any,
    authorization: string,
    datasetId: string
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      options.headers["Authorization"] = authorization;
      options.headers["datasetId"] = datasetId;
      const url = `${this.baseURL}/cohortdefinition/checkV2`;
      const expression =
        typeof cohortDefinitionExpression === "string"
          ? JSON.parse(cohortDefinitionExpression)
          : cohortDefinitionExpression;
      const currentTime = Date.now();
      const payload: D2ECohortDefinition = {
        id: 1, // Dummy ID for validation
        name: "For validation only", // Dummy name for validation
        description: "For validation only", // Dummy description for validation
        expressionType: "SIMPLE_EXPRESSION",
        expression: expression, // Cohort definition to be validated
        createdBy: "For validation only", // Dummy creator for validation
        createdDate: currentTime, // Dummy creation date for validation
        modifiedBy: "For validation only", // Dummy modifier for validation
        modifiedDate: currentTime, // Dummy modification date for validation
        tags: [],
      };

      const t0 = performance.now();
      const response = await this.channel.post(url, payload, options);
      console.log(`[MCP-TIMING] [WebAPIAPI] checkAtlasCohortDefinition POST in ${(performance.now() - t0).toFixed(1)}ms`);
      return response.status === 200 ? response.data : null;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while checking atlas cohort definition: ${error}`);
    }
  }

  async updateAtlasCohortDefinition(
    cohortDefinition: any,
    authorization: string
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/cohortdefinition/${cohortDefinition.cohortId}`;

      const currentTime = Date.now();
      const t0 = performance.now();
      const userName = await getUserName(authorization);
      console.log(`[MCP-TIMING] [WebAPIAPI] updateAtlas getUserName in ${(performance.now() - t0).toFixed(1)}ms`);
      const expression =
        typeof cohortDefinition.expression === "string"
          ? JSON.parse(cohortDefinition.expression)
          : cohortDefinition.expression;

      const payload: D2ECohortDefinition = {
        id: cohortDefinition.cohortId,
        name: cohortDefinition.name,
        description: cohortDefinition.description,
        expressionType: "SIMPLE_EXPRESSION",
        expression: expression,
        createdBy: cohortDefinition.createdBy,
        createdDate: cohortDefinition.createdDate,
        modifiedBy: userName,
        modifiedDate: currentTime,
        tags: [],
      };
      const t1 = performance.now();
      const response = await this.channel.put(url, payload, options);
      console.log(`[MCP-TIMING] [WebAPIAPI] updateAtlasCohortDefinition PUT in ${(performance.now() - t1).toFixed(1)}ms`);
      return response.status === 200 ? response.data : null;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while updating atlas cohort definition: ${error}`);
    }
  }

  async deleteAtlasCohortDefinition(
    cohortId: number,
    authorization: string,
    datasetId: string
  ): Promise<any> {
    try {
      const options = await this.getRequestConfig();
      options.headers["Authorization"] = authorization;
      options.headers["datasetId"] = datasetId;
      const url = `${this.baseURL}/cohortdefinition/${cohortId}`;
      const t0 = performance.now();
      const res = await axios.delete(url, options);
      console.log(`[MCP-TIMING] [WebAPIAPI] deleteAtlasCohortDefinition DELETE in ${(performance.now() - t0).toFixed(1)}ms`);
      return res.status === 204;
    } catch (error) {
      console.error("DELETE Error:", error);
      throw new Error(`Error while deleting atlas cohort definition: ${error}`);
    }
  }
}
