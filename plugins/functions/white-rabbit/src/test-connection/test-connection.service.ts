import pg from "pg";
import { Service } from "typedi";
import { ScanDbSettings } from "./models/scanDbSettings.ts";
import { TestConnectionResultResponse } from "./models/testConnectionResultResponse.ts";

@Service()
export class TestConnectionService {
  private readonly logger = console;
  private static readonly MAX_TABLES_COUNT = 10000;

  constructor() {}

  async testConnection(
    dbSettings: ScanDbSettings
  ): Promise<TestConnectionResultResponse> {
    this.logger.info("Testing connection to database");

    const client = new pg.Client({
      host: dbSettings.server,
      port: dbSettings.port,
      database: dbSettings.database,
      user: dbSettings.user_name,
      password: dbSettings.password,
      schema: dbSettings.schema,
    });

    try {
      await client.connect();

      const tableQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
      `;

      const result = await client.query(tableQuery, [dbSettings.schema]);
      const tableNames = result.rows.map((row) => row.table_name);

      if (tableNames.length === 0) {
        return this.buildCanNotConnectResponse(
          `Unable to retrieve table names for database ${dbSettings.database}`
        );
      }

      if (tableNames.length > TestConnectionService.MAX_TABLES_COUNT) {
        return this.buildCanNotConnectResponse(
          `Database contains too many tables. Max count is ${TestConnectionService.MAX_TABLES_COUNT}`
        );
      }

      return {
        canConnect: true,
        message: `Successfully connected to ${dbSettings.database} database on server ${dbSettings.server}`,
        tableNames: tableNames,
      };
    } catch (error) {
      return this.buildCanNotConnectResponse(
        `Could not connect to database: ${error.message}`
      );
    } finally {
      await client.end();
    }
  }

  private buildCanNotConnectResponse(
    message: string
  ): TestConnectionResultResponse {
    return {
      canConnect: false,
      message: message,
    };
  }
}
