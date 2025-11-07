import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import { testsLogger } from "./logger";
import * as async from "async";

let testSchemaName = process.env.TESTSCHEMA || process.env.schema;
let conn;
const credentials = {
  host: process.env.HANASERVER,
  port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
  user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
  password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : "Toor1234",
  dialect: "hana",
};

let getConnection = (cb) => {
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
        conn = data;
        cb(null);
      }
    );
  });
};

let truncateTables = (callback) => {
  conn.execute(
    `SELECT DISTINCT(TABLE_NAME) FROM TABLES WHERE SCHEMA_NAME='${testSchemaName}' AND IS_USER_DEFINED_TYPE='FALSE'`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        console.error(err.stack);
        throw err;
      }
      let tableNames = rows.map((elem) => {
        return elem["(TABLE_NAME)"];
      });
      console.error(JSON.stringify(tableNames));
      let tasks = [];
      rows.forEach((table) => {
        let result = ((table) => {
          tasks.push((callback) => {
            conn.execute(
              `TRUNCATE TABLE "${table["(TABLE_NAME)"]}"`,
              [],
              (err, rows) => {
                if (err) {
                  console.error(err);
                  callback(err);
                } else {
                  console.error(`TRUNCATED "${table["(TABLE_NAME)"]}"`);
                  callback(null);
                }
              }
            );
          });
        })(table);
      });

      async.parallel(tasks, (err, data) => {
        if (err) {
          console.error(err);
        }
      });
    }
  );
};

async.series([getConnection, truncateTables], (err, data) => {
  if (err) {
    throw err;
  }
  testsLogger("Completed Truncating tables...");
});
