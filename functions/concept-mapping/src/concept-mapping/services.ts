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

  constructor(databaseCode: string, schemaName: string) {
    try {
      validateIdentifierForSchemaOrTableName(databaseCode);
      validateIdentifierForSchemaOrTableName(schemaName);
    } catch (err) {
      console.error("Invalid identifier for database or schema name, ", err);
      throw err;
    }

    try {
      // @ts-ignore Cannot find name 'Trex'
      const dbm = Trex.databaseManager();
      this.conn = dbm.getConnection(
        databaseCode,
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
          resolve({ rows: res, rowCount: res.length ?? 0 });
        },
      );
    });
  }

  async end() {
    this.conn.close();
  }
}

export const getSourceToConceptMappings = async (
  databaseCode: string,
  schemaName: string,
) => {
  const client = new TrexConnection(databaseCode, schemaName);
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
  databaseCode: string,
  schemaName: string,
  sourceVocabularyId: string,
  conceptMappings: string,
) => {
  const client = new TrexConnection(databaseCode, schemaName);
  try {
    const parsedMappings = convertZlibBase64ToJson(conceptMappings).map(
      (mapping: any) => ({
        ...mapping,
        source_vocabulary_id: sourceVocabularyId,
      }),
    );

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
