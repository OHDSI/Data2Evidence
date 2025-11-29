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
    console.log(`[PrefectAPI] isUniqueViolationError check - status: ${status}`);
    
    if (status === 409) {
      console.log(`[PrefectAPI] Status 409 detected - returning true`);
      return true;
    }
    if (status !== 500) {
      console.log(`[PrefectAPI] Status is not 500 (it's ${status}) - returning false`);
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
    } catch (e) {
      // Circular reference or other stringify error - skip string-based check
      console.log(`[PrefectAPI] Failed to stringify error data: ${e}`);
      return false;
    }

    console.log(`[PrefectAPI] Searching for unique violation patterns in: ${errorString.substring(0, 500)}...`);
    
    const matchedPattern = PrefectAPI.UNIQUE_VIOLATION_PATTERNS.find(pattern => errorString.includes(pattern));
    if (matchedPattern) {
      console.log(`[PrefectAPI] Found matching pattern: '${matchedPattern}' - returning true`);
      return true;
    }
    
    console.log(`[PrefectAPI] No unique violation patterns found - returning false`);
    return false;
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
    console.log(`[PrefectAPI] Checking if variable '${variableObj.name}' exists at: ${checkUrl}`);
    try {
      await axios.get(checkUrl, options);
      // Variable exists, update it
      console.log(`[PrefectAPI] Variable '${variableObj.name}' exists, updating...`);
      const result = await axios.patch(checkUrl, variableOptions, options);
      console.log(successMsg);
      return variableObj.name;
    } catch (getError) {
      const getStatus = getError.response?.status;
      console.log(`[PrefectAPI] GET request for variable '${variableObj.name}' returned status: ${getStatus}`);
      
      // Variable doesn't exist (404), create it
      if (getStatus === 404) {
        try {
          const createUrl = `${this.baseURL}/variables`;
          console.log(`[PrefectAPI] Variable '${variableObj.name}' not found (404), creating at: ${createUrl}`);
          const result = await axios.post(createUrl, variableOptions, options);
          console.log(successMsg);
          return result.data.name;
        } catch (createError) {
          // Handle race condition: another process may have created the variable
          const status = createError.response?.status;
          const errorData = createError.response?.data;
          const errorString = JSON.stringify(errorData ?? {});
          
          console.error(`[PrefectAPI] Create variable '${variableObj.name}' failed with status: ${status}`);
          console.error(`[PrefectAPI] Error response data: ${errorString}`);
          console.log(`[PrefectAPI] Checking if this is a unique violation error...`);

          if (this.isUniqueViolationError(status, errorData)) {
            // Variable was created by another process, update it
            console.log(`[PrefectAPI] Detected unique violation, attempting to update instead...`);
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
          `[${getStatus}] Failed to check Prefect variable ${variableObj.name}!`,
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
    
    console.log(`[PrefectAPI] Getting block type ID for slug: ${slugName}`);
    const blockTypeId = await this.getBlockTypeID(slugName);
    console.log(`[PrefectAPI] Block type ID: ${blockTypeId}`);
    
    console.log(`[PrefectAPI] Getting block schema ID for block type ID: ${blockTypeId}`);
    const blockSchemaId = await this.getBlockSchemaId(blockTypeId);
    console.log(`[PrefectAPI] Block schema ID: ${blockSchemaId}`);

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
      console.log(`[PrefectAPI] Updating block '${blockName}' at: ${updateUrl}`);
      await axios.patch(updateUrl, updateBlockDocOptions, options);
      console.log(successMsg);
      return blockId;
    };

    // First check if the block document already exists
    const checkUrl = `${this.baseURL}/block_types/slug/${encodeURIComponent(
      slugName
    )}/block_documents/name/${encodeURIComponent(blockName)}`;

    console.log(`[PrefectAPI] Checking if block '${blockName}' exists at: ${checkUrl}`);
    try {
      const existingBlock = await axios.get(checkUrl, options);
      // Block exists, update it
      console.log(`[PrefectAPI] Block '${blockName}' exists with ID: ${existingBlock.data.id}, updating...`);
      return await updateExistingBlock(existingBlock.data.id);
    } catch (getError) {
      const getStatus = getError.response?.status;
      console.log(`[PrefectAPI] GET request for block '${blockName}' returned status: ${getStatus}`);
      
      // Block doesn't exist (404), create it
      if (getStatus === 404) {
        try {
          const createUrl = `${this.baseURL}/block_documents`;
          console.log(`[PrefectAPI] Block '${blockName}' not found (404), creating at: ${createUrl}`);
          const result = await axios.post(createUrl, blockDocOptions, options);
          console.log(successMsg);
          return result.data.id;
        } catch (createError) {
          // Handle race condition: another process may have created the block
          const status = createError.response?.status;
          const errorData = createError.response?.data;
          const errorString = JSON.stringify(errorData ?? {});
          
          console.error(`[PrefectAPI] Create block '${blockName}' failed with status: ${status}`);
          console.error(`[PrefectAPI] Error response data: ${errorString}`);
          console.log(`[PrefectAPI] Checking if this is a unique violation error...`);

          if (this.isUniqueViolationError(status, errorData)) {
            // Block was created by another process, update it
            console.log(`[PrefectAPI] Detected unique violation, attempting to fetch and update instead...`);
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
          `[${getStatus}] Failed to check Prefect ${blockType} block '${blockName}'!`,
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
