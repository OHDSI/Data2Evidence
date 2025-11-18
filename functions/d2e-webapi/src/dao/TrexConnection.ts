import { ICohortDefinitionCheckV2ResponseDto } from "../dto/cohortdefinition.ts";
import { ICohortExpression } from "../types.ts";

export default class TrexConnection {
  // deno-lint-ignore no-explicit-any
  private readonly conn: any;

  constructor(
    databaseCode: string,
    schemaName: string,
    vocabSchemaName: string,
    resultSchemaName: string
  ) {
    try {
      // @ts-ignore To ignore Cannot find name 'Trex'
      const dbm = Trex.databaseManager();
      const conn = dbm.getConnection(
        databaseCode,
        schemaName,
        vocabSchemaName,
        resultSchemaName,
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

  validateCohortJson(
    cohortJson: ICohortExpression
  ): Promise<ICohortDefinitionCheckV2ResponseDto> {
    return new Promise((resolve, reject) => {
      this.conn.atlas_validate(
        cohortJson,
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
