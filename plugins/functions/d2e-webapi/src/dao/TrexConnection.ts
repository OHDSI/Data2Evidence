import { ICohortDefinitionCheckV2ResponseDto } from "../dto/cohortdefinition.ts";
import { ICohortExpression } from "../types.ts";

export default class TrexConnection {
  // deno-lint-ignore no-explicit-any
  private readonly conn: any;
  private readonly databaseCode: string;
  private readonly cacheId: string;

  constructor(
    databaseCode: string,
    cacheId: string,
    schemaName: string,
    vocabSchemaName: string,
    resultsSchemaName: string
  ) {
    try {
      this.databaseCode = databaseCode;
      this.cacheId = cacheId;
      // @ts-ignore To ignore Cannot find name 'Trex'
      const dbm = Trex.databaseManager();
      // The connection alias in DuckDB is the cache_id; queries reference cacheId now.
      // databaseCode is preserved on the instance for credential lookup elsewhere.
      const conn = dbm.getConnection(
        cacheId,
        schemaName,
        vocabSchemaName,
        resultsSchemaName,
        {
          duckdb: (e: unknown) => e,
          hana: (e: unknown) => e,
        } // Dummy function which returns itself, originally used for translation function
      );

      this.conn = conn;
    } catch (err) {
      console.error("Error getting trex connection, ", err);
      throw err;
    }
  }

  // deno-lint-ignore no-explicit-any
  query(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.conn.execute(
        sql,
        params.map((e) => {
          return { value: e };
        }),
        // deno-lint-ignore no-explicit-any
        (err: any, res: any) => {
          if (err) {
            reject(err);
          }
          resolve(res);
        }
      );
    });
  }

  validateCohortJsonExpression(
    cohortJsonExpression: ICohortExpression
  ): Promise<ICohortDefinitionCheckV2ResponseDto> {
    return new Promise((resolve, reject) => {
      this.conn.atlas_validate(
        cohortJsonExpression,
        // deno-lint-ignore no-explicit-any
        (err: any, res: any) => {
          if (err) {
            reject(err);
          }
          resolve({ warnings: res });
        }
      );
    });
  }

  end() {
    this.conn.close();
  }
}
