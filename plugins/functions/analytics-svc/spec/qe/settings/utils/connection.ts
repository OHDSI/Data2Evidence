import {
  DBConnectionUtil as dbConnectionUtil,
  Connection as connection,
} from "@alp/alp-base-utils";

let testSchemaName = process.env.TESTSCHEMA;

export function createConnection(cb: connection.CallBackInterface) {
  const credentials = {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
    user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
    password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : "Toor1234",
    dialect: "hana",
  };

  dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, client) => {
    if (err) {
      throw err;
    }

    dbConnectionUtil.DBConnectionUtil.getConnection(
      credentials.dialect,
      client,
      testSchemaName,
      (err, data) => {
        if (err) {
          console.error("Error in seting default schema!");
        }

        cb(err, data);
      }
    );
  });
}
