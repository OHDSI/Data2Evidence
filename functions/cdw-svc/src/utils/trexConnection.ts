import { Logger } from "@alp/alp-base-utils";
import { translateHanaToDuckdb } from "../../../_shared/alp-base-utils/src/helpers/hanaTranslation";
import { DUCKDB_FILE_SCHEMA_NAME } from "../qe/settings/Defaults";
const logger = Logger.CreateLogger("cdw-svc: trexConnection");
const parseSql = (
  temp: string,
  schemaName: string,
  vocabSchemaName: string,
  parameters: any
): string => {
  // Specifically for cdw-config-svc, duckdb does not require direct connection to database.
  // $$$$SCHEMA$$$$ is the replacement, but will appear in the string as $$SCHEMA$$
  temp = temp.replace(/\$\$SCHEMA_DIRECT_CONN\$\$./g, "$$$$SCHEMA$$$$.");

  // This specific translation is required because the create-cachedb-flow plugin creates the duckdb file which as a different database and schema name as the file that is created by trex
  if (schemaName !== DUCKDB_FILE_SCHEMA_NAME) {
    temp = temp.replace(
      /SELECT COUNT\(\*\) AS tableCount from tables where schema_name=(\%s|\?) and table_name=(\%s|\?)/gi,
      `select count(*) as "tableCount" from pg_tables where schemaname=%s and tablename=%s`
    );
    temp = temp.replace(
      /select count\(\*\) as \"TABLECOUNT\" from pg_tables where schemaname=(\%s|\?|\$[0-9]) and tablename=(\%s|\?|\$[0-9])/gi,
      `select count(*) AS tableCount from information_schema.tables where table_schema=%s and table_name=%s`
    );
  }

  return translateHanaToDuckdb(temp, schemaName, vocabSchemaName, parameters);
};

export const getTrexConnection = async (
  databaseCode: string,
  schemaName: string,
  vocabSchemaName: string
) => {
  const dbm = Trex.databaseManager();
  logger.info("Connecting to: ", databaseCode, schemaName, vocabSchemaName);
  const conn = dbm.getConnection(databaseCode, schemaName, vocabSchemaName, {
    duckdb: parseSql,
  });
  return conn;
};
