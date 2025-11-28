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
    let url = `${this.baseURL}/variables`;
    const successMsg = `Successfully created/updated Prefect variable '${variableObj.name}'!`;
    const variableOptions = {
      name: variableObj.name,
      value: variableObj.value,
    };
    const options = this.createOptions();
    try {
      const result = await axios.post(url, variableOptions, options);
      console.log(successMsg);
      return result.data.name;
    } catch (error) {
      // Handle 409 (Conflict) or 500 with UniqueViolation (database constraint error)
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (this.isUniqueViolationError(status, errorData)) {
        // update variable which already exists
        url = `${this.baseURL}/variables/name/${encodeURIComponent(
          variableObj.name
        )}`;
        const result = await axios.patch(url, variableOptions, options);
        console.log(successMsg);
        return variableObj.name;
      } else {
        console.error(
          `[${status}] Failed to create/update Prefect variable ${variableObj.name}!`,
          error.response?.data
        );
        throw error;
      }
    }
  }

  public async createBlockDocument(
    blockName: string,
    blockOptions: any,
    blockType: BlockType
  ): Promise<string> {
    const slugName = blockType;
    let url = `${this.baseURL}/block_documents`;
    const successMsg = `Successfully created/updated Prefect ${blockType} block '${blockName}'!`;
    const blockTypeId = await this.getBlockTypeID(slugName);
    const blockSchemaId = await this.getBlockSchemaId(blockTypeId);

    let blockDocOptions = {
      name: blockName,
      data: blockOptions,
      block_schema_id: blockSchemaId,
      block_type_id: blockTypeId,
    };

    const options = await this.createOptions();

    try {
      const result = await axios.post(url, blockDocOptions, options);
      console.log(successMsg);
      return result.data.id;
    } catch (error) {
      // Handle 409 (Conflict) or 500 with UniqueViolation (database constraint error)
      const status = error.response?.status;
      const errorData = error.response?.data;

      if (this.isUniqueViolationError(status, errorData)) {
        // update block which already exists
        url = `${this.baseURL}/block_types/slug/${encodeURIComponent(
          slugName
        )}/block_documents/name/${encodeURIComponent(blockName)}`;
        const existingBlock = await axios.get(url, options);
        const existingBlockId = existingBlock.data.id;

        // Update block
        url = `${this.baseURL}/block_documents/${encodeURIComponent(
          existingBlockId
        )}`;
        const newBlockDocOptions = {
          block_schema_id: blockSchemaId,
          data: blockOptions,
          merge_existing_data: false,
        };
        const updatedBlockResult = await axios.patch(
          url,
          newBlockDocOptions,
          options
        );
        console.log(successMsg);
        return existingBlockId;
      } else {
        console.error(
          `[${status}] Failed to create/update Prefect ${blockType} block '${blockName}'!`,
          error.response?.data
        );
        throw error;
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
