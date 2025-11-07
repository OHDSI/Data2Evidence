import {
  dbCredentialsTemplate,
  dbSvcConverter,
  vcapSvcConverter,
} from "./src/utils/envConverter/envConverter.ts";
import {
  filterServiceCredentials,
  processForComposeAnalytics,
} from "./src/utils/envConverter/processForCompose.ts";
import { initEnv } from "./src/env.ts";

// Reuse service name from analytics-svc
const service: string = "alp-minerva-analytics-svc";

function createDbCredentialsStr(databaseCredentials: Object[]) {
  if (databaseCredentials.length > 0) {
    return JSON.stringify(databaseCredentials);
  } else {
    console.warn(
      "No database credential is configured during this deployment. Please add database credentials and deploy again"
    );
    return "[]";
  }
}

function getType(dialect: string) {
  if (dialect === "postgres") {
    return "POSTGRES";
  } else {
    return "HANA";
  }
}

function getDialect(dialect: string) {
  if (dialect === "postgres") {
    return "postgresql";
  } else {
    return "hana";
  }
}

function getDbName(dialect: string, databaseName: string) {
  if (dialect === "postgres") {
    return {
      database: databaseName,
      databaseName: databaseName,
    };
  }
  return {
    databaseName: databaseName,
  };
}

export enum USER_SCOPE {
  ADMIN = "Admin",
  READ = "Read",
}

try {
 const dbm = Trex.databaseManager();
 const databaseCredentials = dbm.getDatabaseCredentials() as IDatabaseCredential[];
 const parsedDatabaseCredentials = databaseCredentials.map((db) => {
    const { credentials, extra: extraArr, dialect, name, port, ...rest } = db;
    const extra = extraArr?.[0]?.value || {};
    const decryptedCreds = credentials.reduce<{ [key: string]: string }>(
        (acc, c) => {
          const { username, password, userScope } = c;
          switch (userScope) {
            case USER_SCOPE.ADMIN:
            case USER_SCOPE.READ:
              acc[userScope.toLowerCase() + "User"] = username;
              acc[userScope.toLowerCase() + "Password"] = password;
            default:
              acc["user"] = username;
              acc["password"] = password;
          }
          return acc;
        },
        {}
      );

      return {
        ...dbCredentialsTemplate,
        name: rest.code,
        type: getType(dialect),
        values: {
          ...rest,
          ...getDbName(dialect, name),
          dialect: getDialect(dialect),
          port: port.toString(),
          ...extra,
          credentials: decryptedCreds,
          },
        };
  });
  const databaseCredentialsStr = createDbCredentialsStr(parsedDatabaseCredentials);
  const serviceDatabaseCredentials = filterServiceCredentials(
    databaseCredentialsStr,
    service
  );
  //updateEnv(service, serviceDatabaseCredentials);
  const svcDbCred = processForComposeAnalytics(serviceDatabaseCredentials);
  const svcVcap = vcapSvcConverter(svcDbCred);
  const svcHana = dbSvcConverter(serviceDatabaseCredentials).hana;
  const svcPostgres = dbSvcConverter(serviceDatabaseCredentials).postgres;
  let _env = {};
  _env["DATABASE_CREDENTIALS"] = svcDbCred;
  _env["VCAP_SERVICES"] = svcVcap;
  _env["HANA__TENANT_CONFIGS"] = svcHana;
  _env["PG__TENANT_CONFIGS"] = svcPostgres;
  _env = initEnv(_env);
  //console.log(_env);
  //console.log(JSON.stringify(env));

  import("./src/main.ts");
} catch (e) {
  console.error(`"Error occurred: ${e}`);
  throw e
}