import {
  DBConnectionUtil as dbConnectionUtil,
  Connection as conn,
} from "@alp/alp-base-utils";
import ConnectionInterface = conn.ConnectionInterface;

let testSchemaName = process.env.TESTSCHEMA;

/**
 * HDB Connection helper
 *
 * @returns {Promise}
 */
export function createConnection(): Promise<ConnectionInterface> {
  const credentials = {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
    user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
    password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : "Toor1234",
    dialect: "hana",
  };

  const p = new Promise<ConnectionInterface>((resolve, reject) => {
    dbConnectionUtil.DBConnectionUtil.getDbClient(
      credentials,
      (err, client) => {
        if (err) {
          reject(err);
        } else {
          dbConnectionUtil.DBConnectionUtil.getConnection(
            credentials.dialect,
            client,
            testSchemaName,
            (err, data) => {
              if (err) {
                reject(
                  new Error(`Error in setting schema = ${testSchemaName}`)
                );
              } else {
                resolve(data);
              }
            }
          );
        }
      }
    );
  });

  return p;
}
