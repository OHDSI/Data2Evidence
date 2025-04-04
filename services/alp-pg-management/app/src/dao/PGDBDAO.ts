import { execSync } from "node:child_process";
import * as config from "../utils/config";
import { Client } from "pg";

export default class PGDBRouter {
  private logger = config.getLogger();
  private properties = config.getProperties();

  verifyIfDatabaseExists = async (
    client: any,
    databaseNameLowercase: string
  ) => {
    const result = await client.query(`select exists(
				SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = '${databaseNameLowercase}'
		   )`);
    return result.rows[0].exists;
  };

  verifyIfPublicationExists = async (
    client: any,
    publicationNameLowercase: string
  ) => {
    const result = await client.query(`select exists(
				SELECT pubname FROM pg_publication WHERE lower(pubname) = '${publicationNameLowercase}'
		   )`);
    return result.rows[0].exists;
  };

  createDatabase = async (client: any, databaseName: string) => {
    await client.query(`CREATE DATABASE ${databaseName}`);
    this.logger.info(`Database ${databaseName} successfully created.`);
  };

  createSchema = async (
    client: any,
    databaseName: string,
    schemaName: string
  ) => {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    this.logger.info(
      `${schemaName} schema created successfully in ${databaseName} database`
    );
  };

  createPublication = async (
    client: any,
    databaseName: string,
    schemaName: string,
    publicationName: string
  ) => {
    await client.query(
      `CREATE PUBLICATION ${publicationName} FOR TABLES IN SCHEMA ${schemaName}`
    );
    this.logger.info(
      `${publicationName} publication created successfully for existing and future tables in ${schemaName} schema in ${databaseName} database`
    );
  };

  closeConnection = async (client: any) => {
    if (client) {
      await (<any>client).end();
      this.logger.debug("Connection disconnected.");
    }
  };

  acquireToken = () => {
    try {
      if (
        !this.properties.app_client_id ||
        !this.properties.app_client_secret ||
        !this.properties.tenant_id
      ) {
        throw new Error(
          "Necessary environment variables for acquiring JWT unavailable.."
        );
      }

      const stdout = execSync(
        `az login --service-principal -u "${this.properties.app_client_id}" -p "${this.properties.app_client_secret}" --tenant "${this.properties.tenant_id}"`
      );
      const token = execSync(
        `az account get-access-token --resource-type oss-rdbms --output tsv --query accessToken`
      );
      return token;
    } catch (err: any) {
      this.logger.error("Error: " + err.toString());
      throw err;
    }
  };

  getTablesWithNoPK = async (client: any, schemaName: string) => {
    const result = await client.query(`
      select tab.table_name
      from information_schema.tables tab
      left join information_schema.table_constraints tco 
        on tab.table_schema = tco.table_schema
        and tab.table_name = tco.table_name 
        and tco.constraint_type = 'PRIMARY KEY'
      where tab.table_type = 'BASE TABLE'
            and tab.table_schema = '${schemaName}'
            and tco.constraint_name is null
      `);
    return result.rows.map((row: any) => row.table_name);
  };

  alterReplicaIdentity = async (client: any, tableName: string) => {
    await client.query(`ALTER TABLE "${tableName}" REPLICA IDENTITY FULL;`);
  };

  openConnection = async (config: any) => {
    if (!config.hasOwnProperty("password") || !config["password"]) {
      this.logger.info(`Password unavailable. Attempting to acquire JWT.`);
      const token = this.acquireToken();
      config["password"] = `${token}`;
    }
    const client = new Client(config);
    await client.connect();
    this.logger.debug("Client Connected.");
    return client;
  };
}
