import axios from "axios";
import { env } from "./env";
import { BlockType } from "./types";
import { PrefectVariable } from "./types";

export class PrefectAPI {
  private readonly baseURL: string;

  constructor() {
    if (env.VARIABLES.service_routes.prefect) {
      this.baseURL = env.VARIABLES.service_routes.prefect;
    } else {
      throw new Error("No url is set for Prefect");
    }
  }

  private async createOptions() {
    return {
      headers: { "Content-Type": "application/json" },
    };
  }

  private static readonly UNIQUE_VIOLATION_PATTERNS = [
    'uniqueviolation',
    'unique constraint',
    'already exists',
    'duplicate key',
    'integrity conflict',
    'integrityerror'
  ];

  private isUniqueViolationError(status: number | undefined, errorData: any): boolean {
    if (status === 409) {
      return true;
    }
    if (status !== 500) {
      return false;
    }

    // Safely stringify error data to search for patterns (case-insensitive)
    let errorString = '';
    try {
      if (typeof errorData === 'string') {
        errorString = errorData.toLowerCase();
      } else {
        errorString = JSON.stringify(errorData ?? {}).toLowerCase();
      }
    } catch {
      // Circular reference or other stringify error - skip string-based check
      return false;
    }

    return PrefectAPI.UNIQUE_VIOLATION_PATTERNS.some(pattern => errorString.includes(pattern));
  }

  public async createPrefectVariable(
    variableObj: PrefectVariable
  ): Promise<string> {
    const successMsg = `Successfully created/updated Prefect variable '${variableObj.name}'!`;
    const variableOptions = {
      name: variableObj.name,
      value: variableObj.value,
    };
    const options = this.createOptions();

    // First check if the variable already exists
    const checkUrl = `${this.baseURL}/variables/name/${encodeURIComponent(variableObj.name)}`;
    try {
      await axios.get(checkUrl, options);
      // Variable exists, update it
      const result = await axios.patch(checkUrl, variableOptions, options);
      console.log(successMsg);
      return variableObj.name;
    } catch (getError) {
      // Variable doesn't exist (404), create it
      if (getError.response?.status === 404) {
        try {
          const createUrl = `${this.baseURL}/variables`;
          const result = await axios.post(createUrl, variableOptions, options);
          console.log(successMsg);
          return result.data.name;
        } catch (createError) {
          // Handle race condition: another process may have created the variable
          const status = createError.response?.status;
          const errorData = createError.response?.data;

          if (this.isUniqueViolationError(status, errorData)) {
            // Variable was created by another process, update it
            const result = await axios.patch(checkUrl, variableOptions, options);
            console.log(successMsg);
            return variableObj.name;
          } else {
            console.error(
              `[${status}] Failed to create Prefect variable ${variableObj.name}!`,
              createError.response?.data
            );
            throw createError;
          }
        }
      } else {
        console.error(
          `[${getError.response?.status}] Failed to check Prefect variable ${variableObj.name}!`,
          getError.response?.data
        );
        throw getError;
      }
    }
  }

  public async createBlockDocument(
    blockName: string,
    blockOptions: any,
    blockType: BlockType
  ): Promise<string> {
    const slugName = blockType;
    const successMsg = `Successfully created/updated Prefect ${blockType} block '${blockName}'!`;
    const blockTypeId = await this.getBlockTypeID(slugName);
    const blockSchemaId = await this.getBlockSchemaId(blockTypeId);

    const blockDocOptions = {
      name: blockName,
      data: blockOptions,
      block_schema_id: blockSchemaId,
      block_type_id: blockTypeId,
    };

    // Options for updating an existing block
    const updateBlockDocOptions = {
      block_schema_id: blockSchemaId,
      data: blockOptions,
      merge_existing_data: false,
    };

    const options = await this.createOptions();

    // Helper function to update an existing block by ID
    const updateExistingBlock = async (blockId: string): Promise<string> => {
      const updateUrl = `${this.baseURL}/block_documents/${encodeURIComponent(blockId)}`;
      await axios.patch(updateUrl, updateBlockDocOptions, options);
      console.log(successMsg);
      return blockId;
    };

    // First check if the block document already exists
    const checkUrl = `${this.baseURL}/block_types/slug/${encodeURIComponent(
      slugName
    )}/block_documents/name/${encodeURIComponent(blockName)}`;

    try {
      const existingBlock = await axios.get(checkUrl, options);
      // Block exists, update it
      return await updateExistingBlock(existingBlock.data.id);
    } catch (getError) {
      // Block doesn't exist (404), create it
      if (getError.response?.status === 404) {
        try {
          const createUrl = `${this.baseURL}/block_documents`;
          const result = await axios.post(createUrl, blockDocOptions, options);
          console.log(successMsg);
          return result.data.id;
        } catch (createError) {
          // Handle race condition: another process may have created the block
          const status = createError.response?.status;
          const errorData = createError.response?.data;

          if (this.isUniqueViolationError(status, errorData)) {
            // Block was created by another process, update it
            const existingBlock = await axios.get(checkUrl, options);
            return await updateExistingBlock(existingBlock.data.id);
          } else {
            console.error(
              `[${status}] Failed to create Prefect ${blockType} block '${blockName}'!`,
              createError.response?.data
            );
            throw createError;
          }
        }
      } else {
        console.error(
          `[${getError.response?.status}] Failed to check Prefect ${blockType} block '${blockName}'!`,
          getError.response?.data
        );
        throw getError;
      }
    }
  }

  private async getBlockSchemaId(blockTypeId: string): Promise<string> {
    const url = `${this.baseURL}/block_schemas/filter`;
    const blockSchemaOptions = {
      block_schemas: {
        block_type_id: {
          any_: [blockTypeId],
        },
      },
    };
    const options = this.createOptions();
    try {
      const blockSchema = await axios.post(url, blockSchemaOptions, options);
      return blockSchema.data[0].id;
    } catch (error) {
      console.error(
        `[${error.response.status}] Error getting Prefect block schema ID for block type ID ${blockTypeId}!`,
        error.response.data
      );
      throw error;
    }
  }

  private async getBlockTypeID(blockType: string): Promise<string> {
    try {
      const url = `${this.baseURL}/block_types/slug/${encodeURIComponent(
        blockType
      )}`;
      const options = await this.createOptions();
      const result = await axios.get(url, options);
      return result.data.id;
    } catch (error) {
      console.error(
        `[${error.response.status}] Error getting Prefect block type ID for block type ${blockType}!`,
        error.response.data
      );
      throw error;
    }
  }

  public async updateWorkPool(
    workPoolName: string,
    workPoolTemplate: any
  ): Promise<string> {
    try {
      const url = `${this.baseURL}/work_pools/${encodeURIComponent(
        workPoolName
      )}`;
      const options = await this.createOptions();
      const workPoolOptions = {
        is_paused: false,
        base_job_template: workPoolTemplate,
      };
      const result = await axios.patch(url, workPoolOptions, options);
      console.log(`Successfully updated Prefect workpool '${workPoolName}'!`);
      return result.data.id;
    } catch (error) {
      console.error(
        `[${error.response.status}] Failed to update Prefect workpool '${workPoolName}'!`,
        error.response.data
      );
      throw error;
    }
  }
}
