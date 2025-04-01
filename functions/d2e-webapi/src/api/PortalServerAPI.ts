import axios, { AxiosRequestConfig } from "axios";
import { env } from "../env.ts";
import { UserArtifactServiceNames } from "../types.ts";
import { IUserArtifactAtlasCohortDefinitionDto } from "../dto/cohortdefinition.ts";
import { PortalUserArtifacts } from "./types.ts";

export class PortalServerAPI {
  private readonly baseURL: string;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for PortalServerAPI!");
    }

    if (env.SERVICE_ROUTES.portalServer) {
      this.baseURL = env.SERVICE_ROUTES.portalServer;
    } else {
      console.error("No url is set for PortalServerAPI");
      throw new Error("No url is set for PortalServerAPI");
    }
  }

  async getStudy(datasetId: string) {
    const options = await this.getRequestConfig();
    const result = await axios.get(
      `${this.baseURL}/dataset?datasetId=${datasetId}`,
      options
    );
    return result.data;
  }

  async getUserArtifactSequenceNextval(
    datasetId: string,
    serviceName: UserArtifactServiceNames
  ) {
    const options = await this.getRequestConfig();
    const params = new URLSearchParams();
    params.append("datasetId", datasetId);
    const result = await axios.get(
      `${this.baseURL}/user-artifact/${serviceName}/sequence/nextval`,
      {
        params,
        ...options,
      }
    );
    return result.data;
  }

  async createAtlasCohortDefinition(
    datasetId: string,
    atlasCohortDefinition: IUserArtifactAtlasCohortDefinitionDto
  ): Promise<PortalUserArtifacts> {
    try {
      const options = await this.getRequestConfig();

      const params = new URLSearchParams();
      params.append("datasetId", datasetId);
      const body = { serviceArtifact: atlasCohortDefinition };

      const url = `${this.baseURL}/user-artifact/${UserArtifactServiceNames.ATLAS_COHORT_DEFINITIONS}`;
      const result = await axios.post(url, body, { params, ...options });
      return result.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while creating atlas cohort definition`);
    }
  }

  async updateAtlasCohortDefinition(
    datasetId: string,
    atlasCohortDefinition: IUserArtifactAtlasCohortDefinitionDto
  ): Promise<PortalUserArtifacts> {
    try {
      const options = await this.getRequestConfig();

      const params = new URLSearchParams();
      params.append("datasetId", datasetId);
      const body = {
        serviceArtifact: atlasCohortDefinition,
        id: atlasCohortDefinition.id,
      };

      const url = `${this.baseURL}/user-artifact/${UserArtifactServiceNames.ATLAS_COHORT_DEFINITIONS}`;
      const result = await axios.put(url, body, { params, ...options });
      return result.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while updating atlas cohort definition`);
    }
  }

  async deleteAtlasCohortDefinition(
    datasetId: string,
    atlasCohortDefinitionId: number
  ) {
    try {
      // Validate atlasCohortDefinitionId
      if (
        !Number.isInteger(atlasCohortDefinitionId) ||
        atlasCohortDefinitionId <= 0
      ) {
        throw new Error("Invalid atlasCohortDefinitionId");
      }

      const options = await this.getRequestConfig();

      const params = new URLSearchParams();
      params.append("datasetId", datasetId);

      const url = `${this.baseURL}/user-artifact/${UserArtifactServiceNames.ATLAS_COHORT_DEFINITIONS}/${atlasCohortDefinitionId}`;
      const result = await axios.delete(url, { params, ...options });
      return result.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while deleting atlas cohort definition`);
    }
  }

  async getAtlasCohortDefinitionList(
    datasetId: string
  ): Promise<IUserArtifactAtlasCohortDefinitionDto[]> {
    try {
      const options = await this.getRequestConfig();

      const params = new URLSearchParams();
      params.append("datasetId", datasetId);

      const url = `${this.baseURL}/user-artifact/${UserArtifactServiceNames.ATLAS_COHORT_DEFINITIONS}/list`;
      const result = await axios.get(url, { params, ...options });

      return result.data;
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting atlas cohort definition`);
    }
  }

  async getAtlasCohortDefinition(
    datasetId: string,
    atlasCohortDefinitionId: number
  ): Promise<IUserArtifactAtlasCohortDefinitionDto> {
    try {
      // Validate atlasCohortDefinitionId
      if (
        !Number.isInteger(atlasCohortDefinitionId) ||
        atlasCohortDefinitionId <= 0
      ) {
        throw new Error("Invalid atlasCohortDefinitionId");
      }

      const options = await this.getRequestConfig();

      const params = new URLSearchParams();
      params.append("datasetId", datasetId);

      const url = `${this.baseURL}/user-artifact/${UserArtifactServiceNames.ATLAS_COHORT_DEFINITIONS}/${atlasCohortDefinitionId}`;
      const result = await axios.get(url, { params, ...options });

      if (result.data.length === 0) {
        throw new Error(
          `No atlas cohort definition user artifact found for id: ${atlasCohortDefinitionId}`
        );
      }

      if (result.data.length !== 1) {
        throw new Error(
          `Multiple atlas cohort definition user artifact found for id: ${atlasCohortDefinitionId}`
        );
      }

      return result.data[0];
    } catch (error) {
      console.error(error);
      throw new Error(`Error while getting atlas cohort definition`);
    }
  }

  private async getDataset(datasetId: string): Promise<{
    dialect: string;
    vocabSchemaName: string;
    schemaName: string;
  }> {
    console.info(`Portal request to get dataset info for id : ${datasetId}`);
    const errorMessage = `Error while getting dataset info for id : ${datasetId}`;
    try {
      const options = await this.getRequestConfig();
      const url = `${this.baseURL}/dataset`;
      options.params = { datasetId: datasetId };
      const result = await axios.get(url, options);
      return result.data;
    } catch (error) {
      console.error(`${errorMessage}: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async getDatasetDetails(datasetId: string) {
    const dataset = await this.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Could not find dataset with datasetId: ${datasetId}`);
    }

    if (!dataset.dialect) {
      throw new Error(`Dialect does not exist for datasetId: ${datasetId}`);
    }

    if (!dataset.schemaName) {
      throw new Error(`Schema Name does not exist for datasetId: ${datasetId}`);
    }

    if (!dataset.vocabSchemaName) {
      throw new Error(
        `vocabSchemaName does not exist for datasetId: ${datasetId}`
      );
    }

    return {
      dialect: dataset.dialect,
      vocabSchemaName: dataset.vocabSchemaName,
      schemaName: dataset.schemaName,
    };
  }

  private getRequestConfig() {
    let options: AxiosRequestConfig = {};

    options = {
      headers: {
        Authorization: this.token,
      },
      timeout: 20000,
    };

    return options;
  }
}
