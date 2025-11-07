import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import { getDuckdbDBConnection } from "../../src/utils/DuckdbConnection";

const hanaSchemaName = process.env.TESTSCHEMA;

export const credentialsMap = {
  hana: {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT,
    user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
    password: process.env.TESTSYSTEMPW,
    schema: hanaSchemaName,
    dialect: "hana",
  }
};

/**
 * Connection helper
 *
 * @returns {Promise}
 */
export function createConnection(
  dialect: "duckdb" | "hana"
): Promise<ConnectionInterface> {
  return new Promise<ConnectionInterface>(async (resolve, reject) => {
    if(dialect == 'duckdb'){
      let analyticsConnection = await getDuckdbDBConnection()
      resolve(analyticsConnection)
    }else{
      const credentials = credentialsMap[dialect];
      let client;
      dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
        if (err) {
          reject(err);
        } else {
          client = c;
          dbConnectionUtil.DBConnectionUtil.getConnection(
            credentials.dialect,
            client,
            credentials.schema,
            (err, data) => {
              if (err) {
                reject(
                  new Error(`Error in setting schema = ${credentials.schema}`)
                );
              } else {
                resolve(data);
              }
            }
          );
        }
      });
    }
  });
}
