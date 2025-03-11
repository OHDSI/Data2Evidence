import {
  CombinedEnv,
  HanaConfig,
  IntTestConfig,
  PostgresConfig,
  VcapAlpHana,
  VcapAlpHanaHttpTest,
  VcapAlpPostgres,
  VcapMridb,
  HanaValues,
  PostgresValues,
  IntTestValues,
} from "./types.ts";

export const dbCredentialsTemplate = {
  key: "mridb",
  description: "",
  analyticsSvcValues: {
    autoCommit: true,
  },
  dbSvcValues: {
    autoCommit: true,
    validateCertificate: false,
  },
  tags: ["cdw"],
};

function overrideValues(
  value: HanaValues,
  override?: Partial<HanaValues>
): HanaValues;
function overrideValues(
  value: PostgresValues,
  override?: Partial<PostgresValues>
): PostgresValues;
function overrideValues(
  value: HanaValues | PostgresValues | IntTestValues,
  override?:
    | Partial<HanaValues>
    | Partial<PostgresValues>
    | Partial<IntTestValues>
): HanaValues | PostgresValues | IntTestValues;
function overrideValues(value: any, override: any): any {
  if (!override) {
    return value;
  }
  for (const key in override) {
    if (key === "credentials") {
      for (const credentialsKey in override["credentials"]) {
        value["credentials"][credentialsKey] =
          override["credentials"][credentialsKey];
      }
      continue;
    }
    value[key] = override[key];
  }
  return value;
}

export const vcapSvcConverter = (envJson: CombinedEnv): VcapMridb => {
  let mridbs: (VcapAlpHana | VcapAlpPostgres | VcapAlpHanaHttpTest)[] = [];
  // Using for loop for better type inference
  for (let i = 0; i < envJson.length; i += 1) {
    const val = envJson[i];
    if (
      val.type !== "HANA" &&
      val.type !== "POSTGRES" &&
      val.type !== "INT_TEST"
    ) {
      continue;
    }
    val.values = overrideValues(val.values, val.analyticsSvcValues);
    mridbs.push(remapMridbToVcap(val));
  }
  return {
    mridb: mridbs,
  };
};

const remapMridbToVcap = (
  mridb: HanaConfig | PostgresConfig | IntTestConfig
): VcapAlpHana | VcapAlpPostgres | VcapAlpHanaHttpTest => {
  if (mridb.type === "INT_TEST") {
    return {
      name: mridb.name,
      credentials: {
        HANASERVER: mridb.values.HANASERVER,
        TESTPORT: mridb.values.TESTPORT,
        HDIUSER: mridb.values.HDIUSER,
        TESTSYSTEMPW: mridb.values.TESTSYSTEMPW,
        TESTSCHEMA: mridb.values.TESTSCHEMA,
      },
    };
  }

  if (mridb.type === "HANA") {
    return {
      name: mridb.name,
      tags: mridb.tags,
      credentials: {
        host: mridb.values.host,
        port: mridb.values.port,
        code: mridb.values.code,
        databaseName: mridb.values.databaseName,
        user: mridb.values.credentials.readUser,
        password: mridb.values.credentials.readPassword,
        validate_certificate: mridb.values.validateCertificate,
        sslTrustStore: mridb.values.sslTrustStore,
        probeSchema: mridb.values.probeSchema,
        vocabSchema: mridb.values.vocabSchema,
        configSchema: mridb.values.configSchema,
        cdwSchema: mridb.values.cdwSchema,
        schema: mridb.values.schema,
        dialect: mridb.values.dialect,
        encrypt: mridb.values.encrypt,
        sslCryptoProvider: mridb.values.sslCryptoProvider,
        pooling: String(mridb.values.pooling),
        hostname_in_certificate: mridb.values.hostnameInCertificate,
        ca: mridb.values.ca,
        useTLS: mridb.values.useTLS,
        rejectUnauthorized: mridb.values.rejectUnauthorized,
      },
    };
  }
  // mridb.type === "POSTGRES"
  return {
    name: mridb.name,
    tags: mridb.tags,
    credentials: {
      host: mridb.values.host,
      port: Number(mridb.values.port),
      code: mridb.values.code,
      user: mridb.values.credentials.readUser,
      schema: mridb.values.schema,
      password: mridb.values.credentials.readPassword,
      database: mridb.values.database,
      databaseName: mridb.values.database,
      dialect: mridb.values.dialect,
      idleTimeoutMillis: mridb.values.idleTimeoutMillis,
      max: mridb.values.max,
      vocabSchema: mridb.values.vocabSchema,
    },
  };
};
