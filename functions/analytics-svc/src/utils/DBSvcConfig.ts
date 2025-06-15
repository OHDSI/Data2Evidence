//require("dotenv").config({ debug: env.DEBUG });
import { HealthCheckError } from "@godaddy/terminus";
import winston from "winston";
import { readFileSync } from "fs";
import * as utils from "./DBSvcBaseUtils";
import {
    IDBHanaCredentialsType,
    IDBPgCredentialsType,
    IHanaTenantConfig,
    IPgTenantConfig,
} from "./DBSvcTypes";
import { env } from "../env";

let properties: object;
let logger: winston.Logger;

export const getProperties = (): any => {
    if (!properties) {
        const isProd = env.NODE_ENV === "production";
        const k8sPathPrefix = "/var/alp-db-svc";
        properties = {
            alp_db_http_port: Number(env.DB_SVC__PORT),
            alp_db_base_path: String(env.DB_SVC__PATH),
            alp_system_id: String(env.ALP__SYSTEM_ID),
            sub_prop: String(env.DB_SVC__IDP_SUBJECT_PROP),
            hana_tenant_configs: isProd
                ? readFileSync(`${k8sPathPrefix}/HANA_TENANT_CONFIGS`, "utf-8")
                : env.HANA__TENANT_CONFIGS,
            hana_read_role: isProd
                ? utils.strUC(
                      readFileSync(`${k8sPathPrefix}/HANA_READ_ROLE`, "utf-8")
                  )
                : utils.strUC(env.HANA__READ_ROLE),
            postgres_tenant_configs: isProd
                ? readFileSync(
                      `${k8sPathPrefix}/POSTGRES_TENANT_CONFIGS`,
                      "utf-8"
                  )
                : env.PG__TENANT_CONFIGS,
            postgres_read_role: isProd
                ? utils.strUC(
                      readFileSync(
                          `${k8sPathPrefix}/POSTGRES_READ_ROLE`,
                          "utf-8"
                      )
                  )
                : env.PG__READ_ROLE,
            ssl_public_key: isProd
                ? readFileSync(`${k8sPathPrefix}/SSL_PUBLIC_CERT`, "utf-8")
                : env.TLS__INTERNAL__CRT
                ? env.TLS__INTERNAL__CRT.replace(/\\n/g, "\n")
                : null,
            ssl_private_key: isProd
                ? readFileSync(`${k8sPathPrefix}/SSL_PRIVATE_KEY`, "utf-8")
                : env.TLS__INTERNAL__KEY
                ? env.TLS__INTERNAL__KEY.replace(/\\n/g, "\n")
                : null,
            minio_region: isProd
                ? readFileSync(`${k8sPathPrefix}/MINIO__REGION`, "utf-8")
                : env.MINIO__REGION,
            minio_endpoint: isProd
                ? readFileSync(`${k8sPathPrefix}/MINIO__ENDPOINT`, "utf-8")
                : env.MINIO__ENDPOINT,
            minio_port: isProd
                ? readFileSync(`${k8sPathPrefix}/MINIO__PORT`, "utf-8")
                : env.MINIO__PORT,
            minio_ssl: isProd
                ? readFileSync(`${k8sPathPrefix}/MINIO__SSL`, "utf-8")
                : env.MINIO__SSL,
            minio_access_key: isProd
                ? readFileSync(`${k8sPathPrefix}/MINIO__ACCESS_KEY`, "utf-8")
                : env.MINIO__ACCESS_KEY,
            minio_secret_key: isProd
                ? readFileSync(`${k8sPathPrefix}/MINIO__SECRET_KEY`, "utf-8")
                : env.MINIO__SECRET_KEY,
        };

        if (env.NODE_ENV === "test") {
            properties = {
                ...properties,
                hana_tenant_configs:
                    env.INTEGRATION_TEST__HANA__TENANT_CONFIGS,
            };
        }
    }
    return properties;
};

export const getTenantConfigs = (dialect: string) => {
    let input;
    if (dialect === DB.POSTGRES) {
        input = getProperties()["postgres_tenant_configs"];
    } else if (dialect === DB.HANA) {
        input = getProperties()["hana_tenant_configs"];
    } else {
        throw new Error(
            `Error loading tenant configs, dialect:${dialect} is not supported`
        );
    }
    if (input) {
        return input;
    } else {
        throw new Error("Invalid JSON string");
    }
};

function getHanaTenantConfigByTenant(tenant: string): IHanaTenantConfig {
    let hanaTenantConfigs = getTenantConfigs(DB.HANA);
    // logger.info(`hanaTenantConfigs:\n${JSON.stringify(hanaTenantConfigs, null, 4)}`);
    return hanaTenantConfigs[tenant];
}

// This config is mainly used to connect to Hana DB
function getHanaConfigByTenant(tenant: string): IDBHanaCredentialsType {
    let hanaTenantConfig: IHanaTenantConfig =
        getHanaTenantConfigByTenant(tenant);
    return {
        authentication_mode: hanaTenantConfig.authentication_mode,
        host: hanaTenantConfig.host,
        port: hanaTenantConfig.port,
        user: hanaTenantConfig.hanaReadUser,
        password: hanaTenantConfig.hanaReadPassword,
        databaseName: hanaTenantConfig.databaseName,
        validate_certificate: utils.getBoolean(
            hanaTenantConfig.validate_certificate
        ),
        sslTrustStore: hanaTenantConfig.sslTrustStore,
        pooling: utils.getBoolean(hanaTenantConfig.pooling),
        autoCommit: utils.getBoolean(hanaTenantConfig.autoCommit),
        encrypt: utils.getBoolean(hanaTenantConfig.encrypt),
        useTLS: utils.getBoolean(hanaTenantConfig.encrypt),
        rejectUnauthorized: false, // TODO: remove when self-signed certs are removed
        hostname_in_certificate: hanaTenantConfig.host,
        sslCryptoProvider: "sapcrypto",
        dialect: DB.HANA,
    };
}

function getPgTenantConfigByTenant(tenant: string): IPgTenantConfig {
    let pgTenantConfigs = getTenantConfigs(DB.POSTGRES);
    // logger.info(`pgTenantConfigs:\n${JSON.stringify(pgTenantConfigs, null, 4)}`);
    return pgTenantConfigs[tenant];
}

function getPgConfigByTenant(tenant: string): IDBPgCredentialsType {
    let pgTenantConfig: IPgTenantConfig = getPgTenantConfigByTenant(tenant);
    return {
        host: pgTenantConfig.host,
        port: pgTenantConfig.port,
        database: pgTenantConfig.databaseName,
        user: pgTenantConfig.postgresReadUser,
        password: pgTenantConfig.postgresReadPassword,
        ssl: pgTenantConfig.ssl,
        connectionTimeoutMillis: pgTenantConfig.connectionTimeoutMillis,
        idle_in_transaction_session_timeout:
            pgTenantConfig.idle_in_transaction_session_timeout,
        query_timeout: pgTenantConfig.query_timeout,
        statement_timeout: pgTenantConfig.statement_timeout,
        dialect: DB.POSTGRES,
    };
}

export function getLogger() {
    if (!logger) {
        logger = winston.createLogger({
            level: env.DB_SVC__LOG_LEVEL,
            format: winston.format.json(),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp({
                            format: "YYYY-MM-DD HH:mm:ss",
                        }),
                        winston.format.colorize(),
                        winston.format.printf((nfo) => {
                            return `[${nfo.timestamp}] ${nfo.level}: ${nfo.message}`;
                        })
                    ),
                }),
            ],
        });
    }
    return logger;
}

export enum DB {
    HANA = "hana",
    POSTGRES = "postgres",
}

export enum OHDSI {
    WEBAPI_CONCEPT_HIERARCHY = "webapi_concept_hierarchy",
}

export enum OMOP_VERSIONS {
    OMOP = "5.3",
    OMOP5_4 = "5.4",
}

export enum ALP_STAGING_AREAS {
    FHIR_DATA = "fhir_data",
}

export const handleCaseByDialect = (dialect: string, value: string) => {
    switch (dialect) {
        case DB.HANA:
            return utils.strUC(value);

        case DB.POSTGRES:
            return utils.strLC(value);

        default:
            throw `Invalid dialect ${dialect}`;
    }
};

export function getDBConfigByTenant(dialect: string, tenant: string) {
    switch (dialect) {
        case DB.HANA:
            return getHanaConfigByTenant(tenant);
        case DB.POSTGRES:
            return getPgConfigByTenant(tenant);
        default:
            return getHanaConfigByTenant(tenant);
    }
}

export function getTenantConfigKeys(dialect: string) {
    if (dialect == DB.POSTGRES) {
        return {
            readUser: "postgresReadUser",
            readPassword: "postgresReadPassword",
            readRole: "postgres_read_role",
        };
    } else if (dialect == DB.HANA) {
        return {
            readUser: "hanaReadUser",
            readPassword: "hanaReadPassword",
            readRole: "hana_read_role",
        };
    } else {
        throw new Error(
            `Error loading tenant configs, dialect:${dialect} is not supported`
        );
    }
}

export function parseUpdateMsg(liquibaseMessage: string) {
    let updatesAvailable;
    const yesUpdatesMessageRegExp =
        /^\d+\schange\ssets\shave\snot\sbeen\sapplied\sto\s/;
    const noUpdatesMessageRegExp = /\sis\sup\sto\sdate$/;
    if (yesUpdatesMessageRegExp.test(liquibaseMessage.trim()) === true) {
        updatesAvailable = true;
    } else if (noUpdatesMessageRegExp.test(liquibaseMessage.trim()) === true) {
        updatesAvailable = false;
    }
    return updatesAvailable;
}
