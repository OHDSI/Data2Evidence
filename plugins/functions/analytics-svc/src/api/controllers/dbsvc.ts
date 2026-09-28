import { Logger } from "@alp/alp-base-utils";
import { ANALYTICS_DB_DIALECTS } from "../../types";
import * as dbUtils from "../../utils/DBSvcDBUtils";
import { DBDAO } from "../../dao/DBDAO";
import PortalServerAPI from "../PortalServerAPI";
import { env } from "../../env";

const logger = Logger.CreateLogger("analytics-log");

export async function getCDMVersion(req, res, next) {
    const datasetId = req.query.datasetId;
    const { dialect, schemaName, databaseCode, cacheId } =
        await new PortalServerAPI().getStudy(datasetId);

    try {
        const { analyticsConnection } = req.dbConnections;
        let dbDao = new DBDAO(analyticsConnection);
        const trexAlias = cacheId ?? databaseCode;
        const cdmVersion = await dbDao.getCDMVersion(
            trexAlias,
            schemaName,
            dialect
        );
        logger.info(
            `CDM version retrieved for dataset ${datasetId} with schema name ${schemaName} with dialect ${dialect} is ${JSON.stringify(cdmVersion)}`
        );
        let hanaKey = "CDM_VERSION";
        let cdmVersionKey =
            dialect === ANALYTICS_DB_DIALECTS.HANA
                ? hanaKey
                : dbUtils.convertNameToPg(hanaKey);
        // Result-set key casing varies by source dialect: the trex query layer surfaces the
        // column as written in the DAO's `SELECT CDM_VERSION` literal (UPPERCASE) for a
        // Snowflake-sourced cache, whereas postgres/hana fold to the convertNameToPg key.
        // Resolve the key case-insensitively so the version is found regardless of dialect.
        const cdmRow = cdmVersion[0] ?? {};
        const matchedKey = Object.keys(cdmRow).find(
            (k) => k.toLowerCase() === cdmVersionKey.toLowerCase()
        );
        let cdmVersionValue = matchedKey ? cdmRow[matchedKey] : undefined;
        if (cdmVersionValue) {
            //Cater to scenarios if vx.x is stored in the CDM schema
            cdmVersionValue = cdmVersionValue.toUpperCase().startsWith("V")
                ? cdmVersionValue.slice(1)
                : cdmVersionValue;
        } else if (cdmVersion.length === 0) {
            // DQD and DC both read the CDM version before they can create a flow
            // run, so an empty CDM_SOURCE stopped them with an error that named
            // neither the table nor the schema it had looked in.
            throw new Error(
                `No rows in ${schemaName}.CDM_SOURCE for dataset ${datasetId} ` +
                    `(database '${trexAlias}', dialect '${dialect}'). DQD and data ` +
                    `characterization read the CDM version from this table; populate ` +
                    `it in the source schema so every cache build inherits it.`
            );
        } else {
            throw new Error(
                `${schemaName}.CDM_SOURCE for dataset ${datasetId} has no usable ` +
                    `'${cdmVersionKey}' value (columns returned: ` +
                    `${Object.keys(cdmRow).join(", ") || "none"}).`
            );
        }
        logger.info(
            `CDM version returned for dataset ${datasetId} with schema name ${schemaName} with dialect ${dialect} is ${cdmVersionValue}`
        );
        res.status(200).json(cdmVersionValue);
    } catch (err) {
        logger.error(`Error retrieving CDM version: ${err}`);
        // The reason, not a placeholder. The throws above name the schema, the
        // dataset and the dialect they looked in, and a missing CDM_SOURCE
        // arrives here from the query itself as "Catalog Error: Table with name
        // CDM_SOURCE does not exist!" — all of which used to be replaced with
        // "Something went wrong when retrieving data" and left in the log. Both
        // callers surface the body, so a DQD run that cannot start now says
        // which table it could not read instead of only which flow it was
        // submitting.
        const httpResponse = {
            status: 500,
            message: err instanceof Error ? err.message : String(err),
            data: [],
        };
        res.status(500).json(httpResponse);
    }
}

/**
 * The tables DQD and data characterization need before they are worth running,
 * and why each one matters.
 *
 * `requireRows` separates the two failure shapes. A missing or empty CDM_SOURCE
 * stops a run outright, because the CDM version is read from it. An empty
 * OBSERVATION_PERSON is worse than an error: both analyses run to completion and
 * report almost nothing, with no failure at any layer, so it is reported here
 * rather than left to look like a finished run with no findings.
 */
const ANALYSIS_PREREQUISITES: {
    table: string;
    requireRows: boolean;
    why: string;
}[] = [
    {
        table: "cdm_source",
        requireRows: true,
        why: "the CDM version is read from it before a run can be submitted",
    },
    {
        table: "observation_period",
        requireRows: true,
        why: "without it DQD and Achilles complete but report almost nothing",
    },
    { table: "person", requireRows: false, why: "every analysis reads from it" },
];

/**
 * Whether a dataset has what an analysis needs, as a list of specific problems.
 *
 * A precondition that fails should say which precondition failed. Callers used
 * to learn only that the version lookup returned 500, so a schema loaded by an
 * ETL that creates only the tables it writes — a partial CDM, which is easy to
 * reach unintentionally — surfaced as a broken flow rather than a missing table.
 *
 * Always 200 with `ok` and `problems` when the schema could be read: an
 * incomplete dataset is an answer, not a server error. A 500 here means the
 * schema itself could not be inspected.
 */
export async function getDatasetPrerequisites(req, res, next) {
    const datasetId = req.query.datasetId;
    const { dialect, schemaName, databaseCode, cacheId } =
        await new PortalServerAPI().getStudy(datasetId);

    try {
        const { analyticsConnection } = req.dbConnections;
        const dbDao = new DBDAO(analyticsConnection);
        const trexAlias = cacheId ?? databaseCode;

        const tableNames = await dbDao.getSchemaTableNames(
            trexAlias,
            schemaName,
            dialect
        );
        const present = new Set(tableNames.map((t) => t.toLowerCase()));

        const problems: {
            code: string;
            table: string;
            schema: string;
            message: string;
        }[] = [];

        for (const prerequisite of ANALYSIS_PREREQUISITES) {
            const { table, requireRows, why } = prerequisite;
            if (!present.has(table)) {
                problems.push({
                    code: "MISSING_TABLE",
                    table,
                    schema: schemaName,
                    message: `${table} is missing from ${trexAlias}.${schemaName} — ${why}.`,
                });
                continue;
            }
            if (!requireRows) continue;

            // Counted one table at a time so a single unreadable table is
            // reported as that table rather than failing the whole check.
            try {
                const rows = await dbDao.countTableRows(
                    trexAlias,
                    schemaName,
                    table,
                    dialect
                );
                if (rows === 0) {
                    problems.push({
                        code: "EMPTY_TABLE",
                        table,
                        schema: schemaName,
                        message: `${table} in ${trexAlias}.${schemaName} has no rows — ${why}.`,
                    });
                }
            } catch (err) {
                problems.push({
                    code: "UNREADABLE_TABLE",
                    table,
                    schema: schemaName,
                    message:
                        `${table} in ${trexAlias}.${schemaName} could not be read — ${why}. ` +
                        `Underlying error: ${err instanceof Error ? err.message : String(err)}`,
                });
            }
        }

        logger.info(
            `Prerequisite check for dataset ${datasetId} (${trexAlias}.${schemaName}): ` +
                `${problems.length} problem(s)`
        );
        res.status(200).json({
            ok: problems.length === 0,
            datasetId,
            databaseCode: trexAlias,
            schemaName,
            problems,
        });
    } catch (err) {
        logger.error(`Error checking dataset prerequisites: ${err}`);
        res.status(500).json({
            status: 500,
            message: err instanceof Error ? err.message : String(err),
            data: [],
        });
    }
}

export async function checkIfSchemaExists(req, res, next) {
    const dialect: string = req.query.dialect;
    const databaseCode: string = req.query.databaseCode;
    const schemaName: string = req.query.schemaName;

    try {
        const { analyticsConnection } = req.dbConnections;
        const dbDao = new DBDAO(analyticsConnection);
        const schemaExists = await dbDao.checkIfSchemaExists(
            databaseCode,
            schemaName,
            dialect
        );
        res.status(200).send(schemaExists);
    } catch (err) {
        logger.error(`Error checking if schema exists: ${err}`);
        const httpResponse = {
            status: 500,
            message: "Something went wrong when checking if schema exists",
            data: [],
        };
        res.status(500).json(httpResponse);
    }
}

export async function getSnapshotSchemaMetadata(req, res, next) {
    const { schema: schemaName, code: databaseName } =
        req.dbCredentials.studyAnalyticsCredential;

    try {
        const { analyticsConnection } = req.dbConnections;
        const dbDao = new DBDAO(analyticsConnection);
        const results = await dbDao.getSnapshotSchemaMetadata(
            databaseName,
            schemaName
        );
        res.status(200).json(results);
    } catch (err: any) {
        logger.error("Error while getting schema snapshot metadata");
        return next(err);
    }
}
