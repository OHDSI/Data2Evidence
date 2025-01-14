import { IMRIRequest, DcReplacementConfig } from "../../types";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import {
    Logger,
    DBConnectionUtil as dbConnectionUtil,
} from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import { DataCharacterizationEndpoint } from "../../mri/endpoint/DataCharacterizationEndpoint";
import * as DC_RESULTS_CONFIG from "../../const/dcResultsSqlConfig";
import * as DC_RESULTS_DRILLDOWN_CONFIG from "../../const/dcResultsDrilldownSqlConfig";
import { env } from "../../env";

let logger = CreateLogger("analytics-log");
const language = "en";

export enum DC_RESULTS_SOURCE_KEYS {
    DASHBOARD = "dashboard",
    DATA_DENSITY = "data_density",
    PERSON = "person",
    VISIT = "visit",
    CONDITION = "condition",
    CONDITION_ERA = "condition_era",
    PROCEDURE = "procedure",
    DRUG = "drug",
    DRUG_ERA = "drug_era",
    MEASUREMENT = "measurement",
    OBSERVATION = "observation",
    OBSERVATION_PERIOD = "observation_period",
    DEATH = "death",
}

export enum DC_RESULTS_DRILLDOWN_SOURCE_KEYS {
    VISIT = "visit",
    CONDITION = "condition",
    CONDITION_ERA = "condition_era",
    PROCEDURE = "procedure",
    DRUG = "drug",
    DRUG_ERA = "drug_era",
    MEASUREMENT = "measurement",
    OBSERVATION = "observation",
}

const getDcResultsSqlConfig = (sourceKey: string) => {
    let sqlConfig;
    switch (sourceKey) {
        case DC_RESULTS_SOURCE_KEYS.DASHBOARD:
        default:
            sqlConfig = DC_RESULTS_CONFIG.DASHBOARD;
            break;
        case DC_RESULTS_SOURCE_KEYS.DATA_DENSITY:
            sqlConfig = DC_RESULTS_CONFIG.DATA_DENSITY;
            break;
        case DC_RESULTS_SOURCE_KEYS.PERSON:
            sqlConfig = DC_RESULTS_CONFIG.PERSON;
            break;
        case DC_RESULTS_SOURCE_KEYS.VISIT:
            sqlConfig = DC_RESULTS_CONFIG.VISIT;
            break;
        case DC_RESULTS_SOURCE_KEYS.CONDITION:
            sqlConfig = DC_RESULTS_CONFIG.CONDITION;
            break;
        case DC_RESULTS_SOURCE_KEYS.CONDITION_ERA:
            sqlConfig = DC_RESULTS_CONFIG.CONDITION_ERA;
            break;
        case DC_RESULTS_SOURCE_KEYS.PROCEDURE:
            sqlConfig = DC_RESULTS_CONFIG.PROCEDURE;
            break;
        case DC_RESULTS_SOURCE_KEYS.DRUG:
            sqlConfig = DC_RESULTS_CONFIG.DRUG;
            break;
        case DC_RESULTS_SOURCE_KEYS.DRUG_ERA:
            sqlConfig = DC_RESULTS_CONFIG.DRUG_ERA;
            break;
        case DC_RESULTS_SOURCE_KEYS.MEASUREMENT:
            sqlConfig = DC_RESULTS_CONFIG.MEASUREMENT;
            break;
        case DC_RESULTS_SOURCE_KEYS.OBSERVATION:
            sqlConfig = DC_RESULTS_CONFIG.OBSERVATION;
            break;
        case DC_RESULTS_SOURCE_KEYS.OBSERVATION_PERIOD:
            sqlConfig = DC_RESULTS_CONFIG.OBSERVATION_PERIOD;
            break;
        case DC_RESULTS_SOURCE_KEYS.DEATH:
            sqlConfig = DC_RESULTS_CONFIG.DEATH;
            break;
    }
    return sqlConfig;
};

const getDcDrilldownResultsSqlConfig = (sourceKey: string) => {
    let sqlConfig;
    switch (sourceKey) {
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.VISIT:
        default:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.VISIT;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.CONDITION:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.CONDITION;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.CONDITION_ERA:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.CONDITION_ERA;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.PROCEDURE:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.PROCEDURE;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.DRUG:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.DRUG;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.DRUG_ERA:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.DRUG_ERA;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.MEASUREMENT:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.MEASUREMENT;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.OBSERVATION:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.OBSERVATION;
            break;
    }
    return sqlConfig;
};

// Function to map key to uppercase, this is required due to differences in table name casing in databases, e.g uppercase in HANA and lowercase in POSTGRES
const mapDcResultKeysToUppercase = (data: unknown[]) => {
    return data.map((obj) => {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k.toUpperCase(), v])
        );
    });
};

// Resolve schema for data characterization depending on USE_CACHEDB flag
const resolveDcSchemaName = (schemaName: string) => {
    if (env.USE_CACHEDB === "true") {
        // If using cachedb for connection, database connection has to point to direct_db_conn to access dc results
        return `direct_db_conn.${schemaName}`;
    } else {
        // Else no change to results schema
        return schemaName;
    }
};

export async function getDataCharacterizationResult(
    req: IMRIRequest,
    res,
    next
) {
    try {
        const databaseName = req.params.databaseName;
        const resultsSchema = req.params.resultsSchema;
        const vocabSchema = req.params.vocabSchema;
        const sourceKey = req.params.sourceKey;
        const { studyAnalyticsCredential } = req.dbCredentials;

        const analyticsConnection =
            await dbConnectionUtil.DBConnectionUtil.getDBConnection({
                credentials: studyAnalyticsCredential,
                schemaName: studyAnalyticsCredential.schema, // getDBConnection schemaName has to be from studyAnalyticsCredential as resultsSchema duckdb file does not exist
                vocabSchemaName: vocabSchema,
            });

        let dataCharacterizationEndpoint = new DataCharacterizationEndpoint(
            analyticsConnection
        );

        const dcReplacementConfig: DcReplacementConfig = {
            results_database_schema: resolveDcSchemaName(resultsSchema),
            vocab_database_schema: vocabSchema,
        };
        logger.info(
            `Getting Data Characterization Results for schema ${resultsSchema} with sourceKey: ${sourceKey}`
        );

        // Get data characterization sql config based on sourceKey
        const dcSqlConfig = getDcResultsSqlConfig(sourceKey);

        // Get list of sql files from config
        const dcSqlFiles = Object.values(dcSqlConfig);

        // Create query tasks based on sql files
        const dcResultsQueryTasks = dcSqlFiles.map((sqlFilePath: string) =>
            dataCharacterizationEndpoint.executeDcResultsSql(
                analyticsConnection,
                sqlFilePath,
                dcReplacementConfig
            )
        );

        const dcResultsQueryResults = await Promise.all(dcResultsQueryTasks);

        // Map keys to results from dcResultsQueryResults
        const dcResultsKeys = Object.keys(dcSqlConfig);
        const dcResults = Object.fromEntries(
            dcResultsKeys.map((key, i) => [
                key,
                mapDcResultKeysToUppercase(dcResultsQueryResults[i] as []),
            ])
        );

        res.status(200).send(dcResults);
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

export async function getDataCharacterizationDrilldownResult(
    req: IMRIRequest,
    res,
    next
) {
    try {
        const databaseName = req.params.databaseName;
        const resultsSchema = req.params.resultsSchema;
        const vocabSchema = req.params.vocabSchema;
        const sourceKey = req.params.sourceKey;
        const conceptId = req.params.conceptId;
        const { studyAnalyticsCredential } = req.dbCredentials;

        const analyticsConnection =
            await dbConnectionUtil.DBConnectionUtil.getDBConnection({
                credentials: studyAnalyticsCredential,
                schemaName: studyAnalyticsCredential.schema, // getDBConnection schemaName has to be from studyAnalyticsCredential as resultsSchema duckdb file does not exist
                vocabSchemaName: vocabSchema,
            });

        let dataCharacterizationEndpoint = new DataCharacterizationEndpoint(
            analyticsConnection
        );

        const dcReplacementConfig: DcReplacementConfig = {
            results_database_schema: resolveDcSchemaName(resultsSchema),
            vocab_database_schema: vocabSchema,
            conceptId: conceptId,
        };
        logger.info(
            `Getting Data Characterization Results for schema ${resultsSchema} with sourceKey: ${sourceKey}`
        );

        // Get data characterization sql config based on sourceKey
        const dcSqlConfig = getDcDrilldownResultsSqlConfig(sourceKey);

        // Get list of sql files from config
        const dcSqlFiles = Object.values(dcSqlConfig);

        // Create query tasks based on sql files
        const dcResultsQueryTasks = dcSqlFiles.map((sqlFilePath: string) =>
            dataCharacterizationEndpoint.executeDcResultsSql(
                analyticsConnection,
                sqlFilePath,
                dcReplacementConfig
            )
        );

        const dcResultsQueryResults = await Promise.all(dcResultsQueryTasks);

        // Map keys to results from dcResultsQueryResults
        const dcResultsKeys = Object.keys(dcSqlConfig);
        const dcResults = Object.fromEntries(
            dcResultsKeys.map((key, i) => [
                key,
                mapDcResultKeysToUppercase(dcResultsQueryResults[i] as []),
            ])
        );

        res.status(200).send(dcResults);
    } catch (err) {
        logger.error(err);
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}
