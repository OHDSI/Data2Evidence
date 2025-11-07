import {
  ParameterInterface,
  CallBackInterface,
  flattenParameter,
} from "../Connection";
import { PostgresConnection } from "../index.ts";
import type { Pool } from "pg";
import QueryStream from "pg-query-stream";
import { DBError } from "../DBError";
import { CreateLogger } from "../Logger";
const logger = CreateLogger("CachedbNodeHDBConnection");

function _getRows(result) {
  if ("rows" in result) {
    return result.rows;
  }
  return null;
}

/* 
Extends PostgresConnection to use as a HANA connection for cachedb
Overwrites parseSql to remove translation from postgres->hana and adds some parsing of hana query-gen specific placeholders
*/
export class CachedbNodeHDBConnection extends PostgresConnection.PostgresConnection {
  public static createConnection(
    pool: Pool,
    schemaName,
    vocabSchemaName = schemaName,
    callback,
  ) {
    try {
      const conn = new CachedbNodeHDBConnection(
        pool,
        schemaName,
        vocabSchemaName,
      );
      callback(null, conn);
    } catch (err) {
      callback(err, null);
    }
  }

  public async execute(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
  ) {
    try {
      logger.debug(`Sql: ${sql}`);
      logger.debug(
        `parameters: ${JSON.stringify(flattenParameter(parameters))}`,
      );
      let temp = sql;
      temp = this.parseSql(temp);
      this.conn.connect((err, client, release) => {
        if (err) {
          logger.error(err);
          callback(err, null);
        }
        logger.debug("PG client created");
        client.query(temp, flattenParameter(parameters), (err, result) => {
          if (err) {
            release(true); // Will destroy this client, instead of releasing back to pool
          } else {
            release();
          }
          logger.debug("PG client released");
          callback(err, result);
        });
      });
    } catch (err) {
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  public executeQuery(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
  ) {
    try {
      this.execute(sql, parameters, (err, resultSet) => {
        if (err) {
          logger.error(err);
          callback(err, null);
        } else {
          logger.debug(`${JSON.stringify(resultSet, null, 2)}`);
          const result = this.parseResults(
            _getRows(resultSet),
            resultSet.fields,
          );
          callback(null, result);
        }
      });
    } catch (err) {
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  public executeStreamQuery(
    sql,
    parameters: ParameterInterface[],
    callback: CallBackInterface,
    schemaName: string = "",
  ) {
    try {
      sql = this.parseSql(sql);

      this.conn.connect((err, client, release) => {
        if (err) {
          logger.error(`Execute error: ${JSON.stringify(err)}
                =>sql: ${sql}
                =>parameters: ${JSON.stringify(parameters)}`);
          callback(new DBError(logger.error(err), err.message), null);
        }
        const query = new QueryStream(sql, flattenParameter(parameters));
        const stream = client.query(query);

        stream.on("end", async () => {
          release(true); // true will destroy the client, removing the temp table at the same time
        });

        stream.on("error", (err: any) => {
          logger.error(err);
        });

        callback(null, stream);
      });
    } catch (err) {
      logger.error(`Execute error: ${JSON.stringify(err)}
          =>sql: ${sql}
          =>parameters: ${JSON.stringify(parameters)}`);
      callback(new DBError(logger.error(err), err.message), null);
    }
  }

  public parseSql(temp: string): string {
    // Replace %s or `?` with $n
    temp = temp.replace(/\$\$SCHEMA\$\$./g, `${this.schemaName}.`);
    temp = temp.replace(/\$\$VOCAB_SCHEMA\$\$./g, `${this.vocabSchemaName}.`);

    // Translate hana query parameter placeholders to postgres parameter placeholders
    let n = 0;
    temp = temp.replace(/\%[s]{1}(?![a-zA-Z0-9%])|%UNSAFE|\?/g, () => {
      return "$" + ++n;
    });

    return temp;
  }
}
