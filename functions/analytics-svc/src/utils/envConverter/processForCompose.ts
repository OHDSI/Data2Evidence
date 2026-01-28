import _ from "lodash";
import {
    BigqueryConfig,
    CombinedEnv,
    HanaConfig,
    IntTestConfig,
    PostgresConfig,
} from "./types.ts";

export const serviceNames = {
    ANALYTICS_SVC: "alp-minerva-analytics-svc",
} as const;

const cleanupOverwriteValues = (
    value: HanaConfig | PostgresConfig | BigqueryConfig | IntTestConfig
) => {
    if (
        value.type === "HANA" ||
        value.type === "POSTGRES" ||
        value.type === "BIGQUERY"
    ) {
        delete value.analyticsSvcValues;
        delete value.dbSvcValues;
    }
};

export const processForComposeAnalytics = (
    databaseValues: CombinedEnv
): (HanaConfig | PostgresConfig | BigqueryConfig)[] => {
    const values: (HanaConfig | PostgresConfig | BigqueryConfig)[] = [];
    for (const value of databaseValues) {
        if (
            value.type === "HANA" ||
            value.type === "POSTGRES" ||
            value.type === "BIGQUERY"
        ) {
            value.values = _.merge(value.values, value.analyticsSvcValues);
            cleanupOverwriteValues(value);
            values.push(value);
        }
    }

    return values;
};

export const filterServiceCredentials = (
    databaseCredentialsStr: string,
    service: string
) => {
    const databaseCredentialsJson = JSON.parse(databaseCredentialsStr);
    const databaseCredentials: CombinedEnv = [];
    for (const value of databaseCredentialsJson) {
        if (value.tags.includes(service)) {
            databaseCredentials.push(value);
        }
    }
    return databaseCredentials;
};
