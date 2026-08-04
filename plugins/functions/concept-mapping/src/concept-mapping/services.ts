import { convertZlibBase64ToJson } from "../../../_shared/alp-base-utils/src/utils";
import {
  SOURCE_TO_CONCEPT_MAP_TABLE,
  SOURCE_TO_CONCEPT_MAP_COLUMNS,
} from "../constants";

function validateIdentifierForSchemaOrTableName(identifier: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
}

class TrexConnection {
  private readonly conn: any;

  constructor(cacheId: string, schemaName: string) {
    try {
      validateIdentifierForSchemaOrTableName(cacheId);
      validateIdentifierForSchemaOrTableName(schemaName);
    } catch (err) {
      console.error("Invalid identifier for cache id or schema name, ", err);
      throw err;
    }

    try {
      // @ts-ignore Cannot find name 'Trex'
      const dbm = Trex.databaseManager();
      this.conn = dbm.getConnection(
        cacheId,
        schemaName,
        schemaName,
        schemaName,
        { duckdb: (e: unknown) => e },
      );
    } catch (err) {
      console.error("Error getting trex connection, ", err);
      throw err;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.conn.execute(
        sql,
        params.map((e) => ({ value: e })),
        (err: any, res: any) => {
          if (err) {
            return reject(err);
          }
          resolve({ rows: res, rowCount: res?.length ?? 0 });
        },
      );
    });
  }

  async end() {
    this.conn.close();
  }
}

export class EmptyMappingsError extends Error {
  constructor() {
    super("No concept mappings provided");
  }
}

/**
 * Raised when a datasetId was supplied but its cacheId could not be resolved.
 * Never fall back to a guessed cacheId here: a wrong cacheId points trex at a
 * different cache catalog, so we would silently read or write the wrong
 * database. Surfacing this (→ 502) is the safe behaviour.
 */
export class CacheIdResolutionError extends Error {
  constructor(datasetId: string, options?: { cause?: unknown }) {
    super(`Unable to resolve cacheId for dataset ${datasetId}`, options);
  }
}

/** The subset of the portal dataset record needed to resolve a cacheId. */
export interface DatasetCacheRecord {
  cacheId?: string | null;
  databaseCode?: string | null;
}

export type DatasetFetcher = (datasetId: string) => Promise<DatasetCacheRecord>;

/**
 * Resolve the cache catalog alias to open a trex connection against.
 *
 * `portal.dataset.cache_id` is the single source of truth. It is NOT derivable:
 * the migration backfills legacy rows with `database_code`, snapshots inherit
 * their source's cacheId, and operators may set it explicitly. The entity's
 * `applyCacheIdDefault()` is an insert-time default generator, not a lookup —
 * recomputing it here would diverge for all three of those populations, and
 * could not distinguish two datasets sharing a databaseCode with different
 * schemas at all.
 *
 * Resolution order (matches every other trex consumer, e.g.
 * d2e-webapi/src/dao/trex.dao.ts and terminology-svc/src/api/portal-api.ts):
 *   1. no datasetId supplied  → databaseCode (pre-dataset / infra path, unchanged)
 *   2. dataset.cacheId        → authoritative
 *   3. dataset.databaseCode   → guarded fallback, only when cacheId is genuinely absent
 *   4. request databaseCode   → last resort when the record carries neither
 */
export const resolveCacheId = async (
  databaseCode: string,
  datasetId?: string,
  fetchDataset?: DatasetFetcher,
): Promise<string> => {
  if (!datasetId) {
    return databaseCode;
  }

  if (!fetchDataset) {
    throw new CacheIdResolutionError(datasetId, {
      cause: new Error("No dataset fetcher configured"),
    });
  }

  let dataset: DatasetCacheRecord | undefined;
  try {
    dataset = await fetchDataset(datasetId);
  } catch (error) {
    throw new CacheIdResolutionError(datasetId, { cause: error });
  }

  if (!dataset) {
    throw new CacheIdResolutionError(datasetId, {
      cause: new Error("Dataset not found"),
    });
  }

  return dataset.cacheId ?? dataset.databaseCode ?? databaseCode;
};

export const getSourceToConceptMappings = async (
  cacheId: string,
  schemaName: string,
) => {
  const client = new TrexConnection(cacheId, schemaName);
  try {
    const sql = `SELECT * FROM ${schemaName}.${SOURCE_TO_CONCEPT_MAP_TABLE}`;
    const result = await client.query(sql);
    return result.rows;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to retrieve source to concept mappings");
  } finally {
    await client.end();
  }
};

export const saveSourceToConceptMappings = async (
  resolveCacheIdFor: () => Promise<string>,
  schemaName: string,
  sourceVocabularyId: string,
  conceptMappings: string,
) => {
  // Decode and validate mappings BEFORE resolving the cacheId or opening a DB
  // connection, so that an empty payload is always rejected with
  // EmptyMappingsError (→ 400) even when portal or the database is unavailable.
  const parsedMappings = convertZlibBase64ToJson(conceptMappings).map(
    (mapping: any) => ({
      ...mapping,
      source_vocabulary_id: sourceVocabularyId,
    }),
  );

  if (!parsedMappings || parsedMappings.length === 0) {
    throw new EmptyMappingsError();
  }

  const cacheId = await resolveCacheIdFor();
  const client = new TrexConnection(cacheId, schemaName);
  try {
    const columns = SOURCE_TO_CONCEPT_MAP_COLUMNS;
    const valuePlaceholders = parsedMappings
      .map(() => {
        const rowParams = columns.map(() => `?`);
        return `(${rowParams.join(", ")})`;
      })
      .join(", ");

    const sql = `INSERT INTO ${schemaName}.${SOURCE_TO_CONCEPT_MAP_TABLE} (${columns.join(", ")}) VALUES ${valuePlaceholders}`;

    const params = parsedMappings.flatMap((row: any) =>
      columns.map((col) => row[col] ?? null),
    );

    const result = await client.query(sql, params);
    return result.rowCount;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to save source to concept mappings");
  } finally {
    await client.end();
  }
};
