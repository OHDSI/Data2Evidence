import {
  DBConnectionUtil as dbConnectionUtil,
  Connection as connection,
} from "@alp/alp-base-utils";

export const credentialsMap = {
  postgresql: {
    host: "localhost",
    port: "35432",
    user: "postgres",
    password: "Toor1234",
    schema: "cdw_test_schema",
    dialect: "postgresql",
    database: "alp",
  }
};

export function createConnection(
  cb: connection.CallBackInterface){
  const credentials = credentialsMap['postgres'];
  let client;
  dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
    if (err) {
      throw err;
    }
    client = c;
    dbConnectionUtil.DBConnectionUtil.getConnection(
      credentials.dialect,
      client,
      credentials.schema,
      (err, data) => {
        if (err) {
          console.error("Error in seting default schema!");
        }
        cb(err, data);
      }
    );
  });
}