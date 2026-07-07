import { Logger } from "@alp/alp-base-utils";
import { translateHanaToDuckdb } from "../../../_shared/alp-base-utils/src/helpers/hanaTranslation";
import { DUCKDB_FILE_SCHEMA_NAME } from "../qe/settings/Defaults";
const logger = Logger.CreateLogger("cdw-svc: trexConnection");
const readyDestinations = new Set<string>();
const destinationLocks = new Map<string, Promise<void>>();

const parseSql = (
  temp: string,
  schemaName: string,
  vocabSchemaName: string,
  resultsSchemaName: string,
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

  return translateHanaToDuckdb(
    temp,
    schemaName,
    vocabSchemaName,
    resultsSchemaName,
    parameters
  );
};

const getDestinationKey = (
  databaseCode: string,
  schemaName: string,
  vocabSchemaName: string,
  resultsSchemaName: string
) => [databaseCode, schemaName, vocabSchemaName, resultsSchemaName].join("|");

const acquireDestinationLock = async (key: string) => {
  const previous = destinationLocks.get(key) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const next = previous.catch(() => undefined).then(() => current);
  destinationLocks.set(key, next);

  await previous.catch(() => undefined);

  return () => {
    releaseCurrent();
    if (destinationLocks.get(key) === next) {
      destinationLocks.delete(key);
    }
  };
};

const openTrexConnection = (
  dbm: any,
  databaseCode: string,
  schemaName: string,
  vocabSchemaName: string,
  resultsSchemaName: string
) =>
  dbm.getConnection(
    databaseCode,
    schemaName,
    vocabSchemaName,
    resultsSchemaName,
    {
      duckdb: parseSql,
    }
  );

const getConnectionWithAttachGuard = async (
  dbm: any,
  databaseCode: string,
  schemaName: string,
  vocabSchemaName: string,
  resultsSchemaName: string
) => {
  const key = getDestinationKey(
    databaseCode,
    schemaName,
    vocabSchemaName,
    resultsSchemaName
  );

  if (readyDestinations.has(key)) {
    try {
      return await openTrexConnection(
        dbm,
        databaseCode,
        schemaName,
        vocabSchemaName,
        resultsSchemaName
      );
    } catch (err) {
      readyDestinations.delete(key);
      throw err;
    }
  }

  const releaseLock = await acquireDestinationLock(key);
  if (readyDestinations.has(key)) {
    releaseLock();
    try {
      return await openTrexConnection(
        dbm,
        databaseCode,
        schemaName,
        vocabSchemaName,
        resultsSchemaName
      );
    } catch (err) {
      readyDestinations.delete(key);
      throw err;
    }
  }

  try {
    const conn = await openTrexConnection(
      dbm,
      databaseCode,
      schemaName,
      vocabSchemaName,
      resultsSchemaName
    );
    readyDestinations.add(key);
    return conn;
  } catch (err) {
    readyDestinations.delete(key);
    throw err;
  } finally {
    releaseLock();
  }
};

export const getTrexConnection = async (
  databaseCode: string,
  schemaName: string,
  vocabSchemaName: string,
  resultsSchemaName: string = schemaName
) => {
  const dbm = Trex.databaseManager();
  logger.info(
    `Connecting to: databaseCode:${databaseCode}, schemaName:${schemaName}, vocabSchemaName:${vocabSchemaName}, resultsSchemaName:${resultsSchemaName}`
  );
  // Pre-dataset / infra path: no datasetId in scope, so databaseCode doubles as the cache_id alias.
  const conn = await getConnectionWithAttachGuard(
    dbm,
    databaseCode,
    schemaName,
    vocabSchemaName,
    resultsSchemaName
  );
  return conn;
};
