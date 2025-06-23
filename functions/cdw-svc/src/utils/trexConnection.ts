import {
  DUCKDB_FILE_DATABASE_CODE,
  DUCKDB_FILE_SCHEMA_NAME,
} from "../qe/settings/Defaults";
import { translateHanaToDuckdb } from "../../../_shared/alp-base-utils/src/helpers/hanaTranslation";

const parseSql = (
  temp: string,
  schemaNames: string,
  vocabSchemaNames: string,
  parameters: any
): string => {
  // Specifically for cdw-config-svc, duckdb does not require direct connection to database.
  // $$$$SCHEMA$$$$ is the replacement, but will appear in the string as $$SCHEMA$$
  temp = temp.replace(/\$\$SCHEMA_DIRECT_CONN\$\$./g, "$$$$SCHEMA$$$$.");
  return translateHanaToDuckdb(temp, schemaNames, vocabSchemaNames, parameters);
};

export const getTrexConnection = () => {
  const dbm = Trex.databaseManager();
  const conn = dbm.getConnection(
    DUCKDB_FILE_DATABASE_CODE,
    DUCKDB_FILE_SCHEMA_NAME,
    DUCKDB_FILE_SCHEMA_NAME,
    { duckdb: parseSql }
  );
  return conn;
};
