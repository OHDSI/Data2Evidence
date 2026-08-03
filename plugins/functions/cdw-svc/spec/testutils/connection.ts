import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;

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
      const credentials = credentialsMap[dialect];
      let client;
      dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
        if (err) {
          reject(err);
        } else {
          client = c;
          const schemaName = credentials.schema;
          dbConnectionUtil.DBConnectionUtil.getConnection(
            credentials.dialect,
            client,
            schemaName,
            (err, data) => {
              if (err) {
                reject(
                  new Error(`Error in getting database connection`)
                );
                return;
              } else if (!schemaName) {
                resolve(data);
              } else {
                data.executeUpdate(`SET SCHEMA "${schemaName}"`, [], (setErr) => {
                  if (setErr) {
                    reject(
                      new Error(
                        `Error in setting schema = ${schemaName}`,
                      ),
                    );
                    return;
                  }
                  resolve(data);
                });
              }
            }
          );
        }
      });
    
  });
}
