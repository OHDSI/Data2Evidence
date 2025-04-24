import parseArgs from "minimist";
import * as fs from "fs";
import {
  filterServiceCredentials,
  processForComposeCdwSvc,
  serviceNames,
} from "./processForCompose";
import {
  processForComposeAnalytics,
  processForComposeDbSvc,
} from "./processForCompose";
import { dbSvcConverter, vcapSvcConverter } from "./envConverter";
import { appendFileSync } from "fs";
import { DbCredentialsApi } from "./api";
import dbCredentialsTemplate from "./db-credentials-template";
import { decrypt } from "./security/credential-decryption";

const generatedFileName = "../generated-env.sh";

const argv = parseArgs(process.argv.slice(2), { string: ["s"] });

const service: string = argv.s;

export enum USER_SCOPE {
  ADMIN = "Admin",
  READ = "Read",
}

const api = new DbCredentialsApi();
api
  .getDatabases()
  .then((encryptedDatabases) => {
    const databaseCredentials = encryptedDatabases.map((db) => {
      const {
        credentials,
        db_extra: dbExtra,
        dialect,
        name,
        port,
        id,
        ...rest
      } = db;
      const decryptedCreds = credentials.reduce<{ [key: string]: string }>(
        (acc, c) => {
          const {
            username,
            password: encryptedPassword,
            salt,
            userScope,
            user_scope
          } = c;
          const decrypted = decrypt(encryptedPassword);
          const password = decrypted.replace(salt, "");
          const scope = (userScope || user_scope); // required: db-credentials-mgr used user_scope
          switch (scope) {
            case USER_SCOPE.ADMIN:
            case USER_SCOPE.READ:
              acc[scope.toLowerCase() + "User"] = username;
              acc[scope.toLowerCase() + "Password"] = password;
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
        name: name,
        type: getType(dialect),
        values: {
          ...rest,
          ...getDbName(dialect, name),
          ...dbExtra,          
          code: id,
          dialect: getDialect(dialect),
          port: port.toString(),
          credentials: decryptedCreds,
        },
      };
    });

    const databaseCredentialsStr = createDbCredentialsStr(databaseCredentials);
    const serviceDatabaseCredentials = filterServiceCredentials(
      databaseCredentialsStr,
      service
    );
    updateEnv(service, serviceDatabaseCredentials);
  })
  .catch((err) => {
    console.error(`"Error occurred: ${err}`);
    process.exit(3);
  });

function updateEnv(service: string, databaseCredentials: any) {
  try {
    switch (service) {
      case serviceNames.ANALYTICS_SVC: {
        const svcDbCred = processForComposeAnalytics(databaseCredentials);
        appendEnv(svcDbCred, "DATABASE_CREDENTIALS", generatedFileName);
        if (process.env.VCAP_SERVICES) {
          appendEnv(
            process.env.VCAP_SERVICES,
            "VCAP_SERVICES",
            generatedFileName
          );
        } else {
          const svcVcap = vcapSvcConverter(svcDbCred);
          appendEnv(svcVcap, "VCAP_SERVICES", generatedFileName);
        }
        const svcHana = dbSvcConverter(databaseCredentials).hana;
        appendEnv(svcHana, "HANA__TENANT_CONFIGS", generatedFileName);
        const svcPostgres = dbSvcConverter(databaseCredentials).postgres;
        appendEnv(svcPostgres, "PG__TENANT_CONFIGS", generatedFileName);
        break;
      }
      case serviceNames.CDW_SVC: {
        const svcDbCred = processForComposeCdwSvc(databaseCredentials);
        appendEnv(svcDbCred, "DATABASE_CREDENTIALS", generatedFileName);
        if (process.env.VCAP_SERVICES) {
          appendEnv(
            process.env.VCAP_SERVICES,
            "VCAP_SERVICES",
            generatedFileName
          );
        } else {
          const svcVcap = vcapSvcConverter(svcDbCred);
          appendEnv(svcVcap, "VCAP_SERVICES", generatedFileName);
        }
        break;
      }
      case serviceNames.DB_SVC: {
        const svcDbCred = processForComposeDbSvc(databaseCredentials);
        appendEnv(svcDbCred, "DATABASE_CREDENTIALS", generatedFileName);
        const svcHana = dbSvcConverter(databaseCredentials).hana;
        appendEnv(svcHana, "HANA__TENANT_CONFIGS", generatedFileName);
        const svcPostgres = dbSvcConverter(databaseCredentials).postgres;
        appendEnv(svcPostgres, "PG__TENANT_CONFIGS", generatedFileName);
        break;
      }
      default:
        console.log(`Service ${service} is not valid`);
        process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
}

function appendEnv(
  generatedJson: Object | string,
  type:
    | "DATABASE_CREDENTIALS"
    | "VCAP_SERVICES"
    | "PG__TENANT_CONFIGS"
    | "HANA__TENANT_CONFIGS",
  generatedFileName: string
) {
  const generatedString =
    typeof generatedJson === "string"
      ? generatedJson
      : JSON.stringify(generatedJson);
  const envStr: string = `${type}='${generatedString}'`;
  appendFileSync(generatedFileName, `export ${envStr}\n`);
}

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
