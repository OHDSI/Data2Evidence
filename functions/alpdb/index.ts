import {
  dbSvcConverter,
  vcapSvcConverter,
} from "../_shared/envConverter/envConverter";
import { DbCredentialsApi } from "../_shared/envConverter/api/db-credentials";
import { decrypt } from "../_shared/envConverter/security/credential-decryption";
import dbCredentialsTemplate from "../_shared/envConverter/db-credentials-template";
import {
  filterServiceCredentials,
  processForComposeAnalytics,
} from "../_shared/envConverter/processForCompose";
import { env, initEnv } from "./env.ts";

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
const api = new DbCredentialsApi();
api
  .getDatabases()
  .then((encryptedDatabases) => {
    const databaseCredentials = encryptedDatabases.map((db) => {
      const { credentials, extra: extraArr, dialect, name, port, ...rest } = db;
      const extra = extraArr?.[0]?.value || {};
      const decryptedCreds = credentials.reduce<{ [key: string]: string }>(
        (acc, c) => {
          const { username, password: encryptedPassword, salt, userScope } = c;
          const decrypted = decrypt(encryptedPassword);
          const password = decrypted.replace(salt, "");
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
    const databaseCredentialsStr = createDbCredentialsStr(databaseCredentials);
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
    console.log(JSON.stringify(env));
    import("./main.ts");
  })
  .catch((err) => {
    console.error(`"Error occurred: ${err}`);
    //process.exit(3);
  });
