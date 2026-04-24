import pg from "pg";
import { Service } from "typedi";
import { TestConnectionRequest } from "./models/scanDbSettings.ts";
import { TestConnectionResultResponse } from "./models/testConnectionResultResponse.ts";

interface IDatabaseCredentialItem {
  username: string;
  password: string;
  userScope: string;
  serviceScope: string;
}

interface IDatabaseCredential {
  code: string;
  id: string;
  host: string;
  port: string;
  name: string;
  dialect: string;
  credentials: IDatabaseCredentialItem[];
}

@Service()
export class TestConnectionService {
  private readonly logger = console;
  private static readonly MAX_TABLES_COUNT = 10000;

  constructor() {}

  async testConnection(
    request: TestConnectionRequest,
  ): Promise<TestConnectionResultResponse> {
    this.logger.info("Testing connection to database");

    // @ts-ignore Trex is a global provided by the runtime
    const dbm = Trex.databaseManager();
    const databaseCredentials =
      dbm.getDatabaseCredentials() as IDatabaseCredential[];

    const dbCredential = databaseCredentials.find(
      (db) => db.code === request.databaseCode,
    );

    if (!dbCredential) {
      return this.buildCanNotConnectResponse(
        `No database credentials found for databaseCode: ${request.databaseCode}`,
      );
    }

    const readCred = dbCredential.credentials.find(
      (c) => c.userScope === "Read",
    );

    if (!readCred) {
      return this.buildCanNotConnectResponse(
        `No read credentials found for databaseCode: ${request.databaseCode}`,
      );
    }

    this.logger.info(
      `creds: ${JSON.stringify({
        host: dbCredential.host,
        port: parseInt(dbCredential.port),
        database: dbCredential.name,
        user: readCred.username,
        password: readCred.password,
      })}`,
    );

    const client = new pg.Client({
      host: dbCredential.host,
      port: parseInt(dbCredential.port),
      database: dbCredential.name,
      user: readCred.username,
      password: readCred.password,
    });

    try {
      await client.connect();

      const tableQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
      `;

      const result = await client.query(tableQuery, [request.schema]);
      const tableNames = result.rows.map((row) => row.table_name);

      if (tableNames.length === 0) {
        return this.buildCanNotConnectResponse(
          `Unable to retrieve table names for database ${dbCredential.name}`,
        );
      }

      if (tableNames.length > TestConnectionService.MAX_TABLES_COUNT) {
        return this.buildCanNotConnectResponse(
          `Database contains too many tables. Max count is ${TestConnectionService.MAX_TABLES_COUNT}`,
        );
      }

      return {
        canConnect: true,
        message: `Successfully connected to ${dbCredential.name} database on server ${dbCredential.host}`,
        tableNames: tableNames,
      };
    } catch (error) {
      return this.buildCanNotConnectResponse(
        `Could not connect to database: ${error.message}`,
      );
    } finally {
      await client.end();
    }
  }

  private buildCanNotConnectResponse(
    message: string,
  ): TestConnectionResultResponse {
    return {
      canConnect: false,
      message: message,
    };
  }
}
