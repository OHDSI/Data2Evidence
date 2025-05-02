import axios from "npm:axios";
import { env } from "../env";
//import { BlockType } from "./types";
//import { PrefectVariable } from "./types";
export function transformDBCredentials(
  dbCredentialsArray
)  {
  return dbCredentialsArray.map((dbCredentials) => {
    // Extract read and admin credentials based on their type
    const readCredential = dbCredentials.credentials.find(
      (cred) => cred.userScope === "Read"
    );
    const adminCredential = dbCredentials.credentials.find(
      (cred) => cred.userScope === "Admin"
    );

    // Create the transformed object
    const transformedCredentials = {
      readUser: readCredential ? readCredential.username : null,
      readPassword: readCredential ? readCredential.password : null,
      adminUser: adminCredential ? adminCredential.username : null,
      adminPassword: adminCredential ? adminCredential.password : null,
      dialect: dbCredentials.dialect,
      databaseCode: dbCredentials.code,
      databaseName: dbCredentials.name,
      host: dbCredentials.host,
      port: dbCredentials.port,
      encrypt: dbCredentials.db_extra.encrypt
        ? dbCredentials.db_extra.encrypt
        : false,
      validateCertificate: dbCredentials.db_extra.validateCertificate
        ? dbCredentials.db_extra.validateCertificate
        : false,
      sslTrustStore: dbCredentials.db_extra.sslTrustStore
        ? dbCredentials.db_extra.sslTrustStore
        : "",
      hostnameInCertificate: dbCredentials.db_extra.hostnameInCertificate
        ? dbCredentials.db_extra.hostnameInCertificate
        : "",
      enableAuditPolicies: dbCredentials.db_extra.enableAuditPolicies
        ? dbCredentials.db_extra.enableAuditPolicies
        : false,
      readRole: dbCredentials.db_extra.readRole
        ? dbCredentials.db_extra.readRole
        : "",
      authMode: dbCredentials.authentication_mode,
    };
    return transformedCredentials;
  });
}

export class PrefectAPI {
  private readonly baseURL: string;

  constructor() {
    if (env.SERVICE_ENV.prefect) {
      this.baseURL = env.SERVICE_ENV.prefect;
    } else {
      throw new Error("No url is set for Prefect");
    }
  }

  private async createOptions() {
    return {
      headers: { "Content-Type": "application/json" },
    };
  }



  public async createBlockDocument(
    blockName: string,
    blockOptions: any,
    blockType
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
      if (error.response.status === 409) {
        // update block which already exists
        url = `${this.baseURL}/block_types/slug/${slugName}/block_documents/name/${blockName}`;
        const existingBlock = await axios.get(url, options);
        const existingBlockId = existingBlock.data.id;

        // Update block
        url = `${this.baseURL}/block_documents/${existingBlockId}`;
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
          `[${error.response.status}] Failed to create/update Prefect ${blockType} block '${blockName}'!`,
          error.response.data
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
    const options = await this.createOptions();
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
      const url = `${this.baseURL}/block_types/slug/${blockType}`;
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
}
