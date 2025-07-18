import { Connection } from "@alp/alp-base-utils";
import { env } from "../configs";
import { CdwConfigCachedbDBConnectionUtil } from "./CdwConfigCachedbDBConnectionUtil";
import { getCachedbDatabaseFormatProtocolB } from "@alp/alp-base-utils";
import { IDBCredentialsType } from "../types";

export const getCachedbDbConnections = async ({
  userObj,
  token,
  databaseCode,
  schemaName,
  vocabSchemaName,
}): Promise<Connection.ConnectionInterface> => {
  const dialect = "duckdb";

  let cachedbDatabase = getCachedbDatabaseFormatProtocolB(
    dialect,
    databaseCode,
    "read",
    schemaName,
    vocabSchemaName
  );

  const credentials: IDBCredentialsType = {
    dialect,
    host: env.CACHEDB__HOST,
    port: env.CACHEDB__PORT,
    database: cachedbDatabase,
    user: token,
    schema: schemaName,
    password: "dummy", // Password not used for alp-cachedb connections
  };

  const connection = await CdwConfigCachedbDBConnectionUtil.getDBConnection({
    credentials: credentials,
    schemaName,
    vocabSchemaName,
    userObj,
  });
  return connection;
};
