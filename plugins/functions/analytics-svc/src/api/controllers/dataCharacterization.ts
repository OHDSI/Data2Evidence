import { IMRIRequest, DcReplacementConfig } from "../../types";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import {
    Logger,
    DBConnectionUtil as dbConnectionUtil,
    Connection,
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
    DATADENSITY = "datadensity",
    PERSON = "person",
    VISIT = "visit",
    CONDITION = "condition",
    CONDITIONERA = "conditionera",
    PROCEDURE = "procedure",
    DRUG = "drug",
    DRUGERA = "drugera",
    MEASUREMENT = "measurement",
    OBSERVATION = "observation",
    OBSERVATIONPERIOD = "observationPeriod",
    DEATH = "death",
}

export enum DC_RESULTS_DRILLDOWN_SOURCE_KEYS {
    VISIT = "visit",
    CONDITION = "condition",
    CONDITIONERA = "conditionera",
    PROCEDURE = "procedure",
    DRUG = "drug",
    DRUGERA = "drugera",
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
        case DC_RESULTS_SOURCE_KEYS.DATADENSITY:
            sqlConfig = DC_RESULTS_CONFIG.DATADENSITY;
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
        case DC_RESULTS_SOURCE_KEYS.CONDITIONERA:
            sqlConfig = DC_RESULTS_CONFIG.CONDITIONERA;
            break;
        case DC_RESULTS_SOURCE_KEYS.PROCEDURE:
            sqlConfig = DC_RESULTS_CONFIG.PROCEDURE;
            break;
        case DC_RESULTS_SOURCE_KEYS.DRUG:
            sqlConfig = DC_RESULTS_CONFIG.DRUG;
            break;
        case DC_RESULTS_SOURCE_KEYS.DRUGERA:
            sqlConfig = DC_RESULTS_CONFIG.DRUGERA;
            break;
        case DC_RESULTS_SOURCE_KEYS.MEASUREMENT:
            sqlConfig = DC_RESULTS_CONFIG.MEASUREMENT;
            break;
        case DC_RESULTS_SOURCE_KEYS.OBSERVATION:
            sqlConfig = DC_RESULTS_CONFIG.OBSERVATION;
            break;
        case DC_RESULTS_SOURCE_KEYS.OBSERVATIONPERIOD:
            sqlConfig = DC_RESULTS_CONFIG.OBSERVATIONPERIOD;
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
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.CONDITIONERA:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.CONDITIONERA;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.PROCEDURE:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.PROCEDURE;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.DRUG:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.DRUG;
            break;
        case DC_RESULTS_DRILLDOWN_SOURCE_KEYS.DRUGERA:
            sqlConfig = DC_RESULTS_DRILLDOWN_CONFIG.DRUGERA;
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
// Also remove underscores from keys
const mapDcResultKeysToUppercase = (data: unknown[]) => {
    return data.map((obj) => {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [
                k.toUpperCase().replace(/_/g, ""),
                v,
            ])
        );
    });
};

// Resolve schema for data characterization depending on USE_CACHEDB and USE_TREX_DB_CONN database flags
const resolveDcSchemaName = (schemaName: string) => {
    // USE_TREX_DB_CONN takes precedence over USE_CACHEDB
    if (env.USE_TREX_DB_CONN === "true") {
        return schemaName;
    } else if (env.USE_CACHEDB === "true") {
        // If using cachedb for connection, database connection has to point to direct_db_conn to access dc results
        return `direct_db_conn.${schemaName}`;
    } else {
        // Else no change to results schema
        return schemaName;
    }
};

const resolveDcConnection = async (
    req: IMRIRequest,
    vocabSchema: string
): Promise<Connection.ConnectionInterface> => {
    if (env.USE_TREX_DB_CONN === "false" && env.USE_CACHEDB === "true") {
        const { studyAnalyticsCredential } = req.dbCredentials;
        const analyticsConnection =
            await dbConnectionUtil.DBConnectionUtil.getDBConnection({
                credentials: studyAnalyticsCredential,
                schemaName: studyAnalyticsCredential.schema, // getDBConnection schemaName has to be from studyAnalyticsCredential as resultsSchema duckdb file does not exist
                vocabSchemaName: vocabSchema,
            });
        return analyticsConnection;
    } else {
        const { analyticsConnection } = req.dbConnections;
        return analyticsConnection;
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

        const analyticsConnection = await resolveDcConnection(req, vocabSchema);

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

        // If results are of type treemap, return results as array instead of a json with treemap as rootlevel key
        if (dcResults?.treemap) {
            res.status(200).send(dcResults.treemap);
        } else {
            res.status(200).send(dcResults);
        }
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

        const analyticsConnection = await resolveDcConnection(req, vocabSchema);

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
