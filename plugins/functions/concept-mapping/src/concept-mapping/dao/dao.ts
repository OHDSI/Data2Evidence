import pg from "pg";
import pgPromise from "pg-promise";
import { DatabaseConfig, Dataset } from "../../types";
import {
  getCachedbDatabaseFormatProtocolA,
  CachedbConnectionType,
} from "../../../../_shared/alp-base-utils/src/utils";
import { env } from "../../env";

const pgp = pgPromise({
  capSQL: true,
});

const { ColumnSet, insert } = pgp.helpers;

export default class DAO {
  private logger = console;
  private readonly jwt: string;
  private readonly dataset: Dataset;

  constructor(jwt: string, dataset: Dataset) {
    if (!jwt) {
      throw new Error("No token passed");
    }
    if (!dataset) {
      throw new Error("No database credentials");
    }

    this.jwt = jwt;
    this.dataset = dataset;
  }

  public getAllRecords = async (table: string) => {
    const client = await this.getCachedbConnection();

    try {
      const queryString = `SELECT * FROM ${this.dataset.schemaName}.${table}`;
      const result = await client.query(queryString);

      return result.rows;
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      await client.end();
    }
  };

  public insertRecords = async (
    table: string,
    columns: Array<String>,
    data: object | object[]
  ) => {
    const client = await this.getCachedbConnection(CachedbConnectionType.WRITE);
    console.log("client connected");
    try {
      const columnSet = new ColumnSet(columns, {
        table: {
          table: table,
          schema: this.dataset.schemaName,
        },
      });
      const insertQuery = insert(data, columnSet);
      this.logger.log(`Insert Query: ${insertQuery}`);

      const result = await client.query(insertQuery);
      return result;
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      await client.end();
    }
  };

  private getCachedbConnection = async (
    cachedbConnection: CachedbConnectionType = CachedbConnectionType.READ
  ) => {
    try {
      const config: DatabaseConfig = {
        host: env.CACHEDB__HOST,
        port: env.CACHEDB__PORT,
        user: this.jwt,
        database: getCachedbDatabaseFormatProtocolA(
          this.dataset.dialect === "postgres"
            ? "postgresql"
            : this.dataset.dialect,
          this.dataset.id,
          cachedbConnection
        ),
      };

      const client: pg.Client = new pg.Client(config);
      await client.connect();
      return client;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  };
}
