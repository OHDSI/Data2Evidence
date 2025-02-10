import pg from "pg";
import * as config from "../utils/config.js";

type TableDefinition = {
  columns: { [key: string]: string };
};
export default class PGDBRouter {

	private logger = config.getLogger()

	verifyIfDatabaseExists = async(client: any, databaseNameLowercase: string) => {
		const result = await client.query(`select exists(
				SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = '${databaseNameLowercase}'
		   )`);
		   return result.rows[0].exists
	}

	createDatabase = async (client: any, databaseName: string) => {
		await client.query(`CREATE DATABASE ${databaseName}`)
		this.logger.info(`Database ${databaseName} successfully created.`)
	}
	createSchema = async (client: any, databaseName:string, schemaName: string) => {
		await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)
		this.logger.info(`${schemaName} schema created successfully in ${databaseName} database`)
	}

	createTable = async (
		client: any,
		databaseName: string,
		schemaName: string,
		tableName: string,
		definition: TableDefinition
	) => {
		let createTableSQL;
	
		if (Object.keys(definition.columns).length === 0) {
			// Create table with no columns (PostgreSQL requires at least an empty definition)
			createTableSQL = `
				CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} ();
			`;
		} else {
			// Normal table creation with defined columns
			const columnDefinitions = Object.entries(definition.columns)
				.map(([name, type]) => `${name.replace(/^\+/, '')} ${type}`)
				.join(', ');
	
			createTableSQL = `
				CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (
					${columnDefinitions}
				);
			`;
		}
	
		await client.query(createTableSQL);
		this.logger.info(`${tableName} table created successfully in ${databaseName}.${schemaName}`);
	};

	closeConnection = async (client: any) => {
		if (client) {
			await ((<any>client).end())
			this.logger.debug("Connection disconnected.")
		}
	}

	openConnection = async (config: any) => {
		const client = new pg.Client(config)
		await client.connect()
		this.logger.debug("Client Connected.")
		return client
	}
}