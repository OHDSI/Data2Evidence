import { D2ECohortDefinition } from "../types/tool-schemas";
import { getUserName } from "../utils/request-helpers";
import { BaseAPI, CallOptions } from "./BaseAPI";

export class WebAPIAPI extends BaseAPI {
  // These dummy defaults match the original class and are required for GET/PUT
  // endpoints that don't enforce auth (e.g. getAtlasCohortDefinition).
  private readonly defaultToken = "bearer";
  private readonly defaultDatasetId = "id";

  constructor() {
    super("d2e-webapi", "d2e-webapi");
  }

  // Always include the dummy defaults so downstream behavior is unchanged.
  protected buildRequestConfig(opts: CallOptions) {
    return super.buildRequestConfig({
      authorization: this.defaultToken,
      datasetId: this.defaultDatasetId,
      ...opts,
    });
  }

  async getAtlasCohortDefinitionList(
    authorization: string,
    datasetId: string
  ): Promise<any> {
    try {
      const { data } = await this.call<any>("get", "/cohortdefinition?source=pa", {
        authorization,
        datasetId,
      });
      return data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting atlas cohort definition`);
    }
  }

  async getAtlasCohortDefinition(cohortId: number): Promise<any> {
    try {
      const { data, status } = await this.call<any>("get", `/cohortdefinition/${cohortId}`, {});
      return status === 200 ? data : null;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while get info of atlas cohort definition: ${error}`);
    }
  }

  async createAtlasCohortDefinition(
    cohortDefinition: any,
    authorization: string
  ): Promise<any> {
    try {
      const currentTime = Date.now();
      const userName = await getUserName(authorization);
      const expression =
        typeof cohortDefinition.expression === "string"
          ? JSON.parse(cohortDefinition.expression)
          : cohortDefinition.expression;
      const payload: D2ECohortDefinition = {
        id: 1,
        name: `${cohortDefinition.cohortInfo}`,
        description: `${cohortDefinition.cohortInfo}`,
        expressionType: "SIMPLE_EXPRESSION",
        expression,
        createdBy: userName,
        createdDate: currentTime,
        modifiedBy: userName,
        modifiedDate: currentTime,
        tags: [],
      };
      const { data, status } = await this.call<any>("post", "/cohortdefinition", { authorization }, payload);
      return status === 200 ? data : null;
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
      const expression =
        typeof cohortDefinitionExpression === "string"
          ? JSON.parse(cohortDefinitionExpression)
          : cohortDefinitionExpression;
      const currentTime = Date.now();
      const payload: D2ECohortDefinition = {
        id: 1,
        name: "For validation only",
        description: "For validation only",
        expressionType: "SIMPLE_EXPRESSION",
        expression,
        createdBy: "For validation only",
        createdDate: currentTime,
        modifiedBy: "For validation only",
        modifiedDate: currentTime,
        tags: [],
      };
      const { data, status } = await this.call<any>(
        "post",
        "/cohortdefinition/checkV2",
        { authorization, datasetId },
        payload
      );
      return status === 200 ? data : null;
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
      const currentTime = Date.now();
      const userName = await getUserName(authorization);
      const expression =
        typeof cohortDefinition.expression === "string"
          ? JSON.parse(cohortDefinition.expression)
          : cohortDefinition.expression;
      const payload: D2ECohortDefinition = {
        id: cohortDefinition.cohortId,
        name: cohortDefinition.name,
        description: cohortDefinition.description,
        expressionType: "SIMPLE_EXPRESSION",
        expression,
        createdBy: cohortDefinition.createdBy,
        createdDate: cohortDefinition.createdDate,
        modifiedBy: userName,
        modifiedDate: currentTime,
        tags: [],
      };
      const { data, status } = await this.call<any>(
        "put",
        `/cohortdefinition/${cohortDefinition.cohortId}`,
        { authorization },
        payload
      );
      return status === 200 ? data : null;
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
      const { status } = await this.call<any>("delete", `/cohortdefinition/${cohortId}`, {
        authorization,
        datasetId,
      });
      return status === 204;
    } catch (error) {
      console.error("DELETE Error:", error);
      throw new Error(`Error while deleting atlas cohort definition: ${error}`);
    }
  }
}
