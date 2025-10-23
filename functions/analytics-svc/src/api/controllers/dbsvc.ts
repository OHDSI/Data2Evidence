import { Logger } from "@alp/alp-base-utils";
import { ANALYTICS_DB_DIALECTS } from "../../types";
import * as dbUtils from "../../utils/DBSvcDBUtils";
import { DBDAO } from "../../dao/DBDAO";
import PortalServerAPI from "../PortalServerAPI";
import { env } from "../../env";

const logger = Logger.CreateLogger("analytics-log");

export async function getCDMVersion(req, res, next) {
    const datasetId = req.query.datasetId;

    const { dialect, schemaName } = await new PortalServerAPI().getStudy(
        req.headers.authorization,
        datasetId
    );

    // TODO: Discuss how to handle bigquery connections for dbsvc code in analytics-svc
    // Always send 5.3.1 if dialect is bigquery
    if (dialect === ANALYTICS_DB_DIALECTS.BIGQUERY) {
        return res.status(200).send(env.BIGQUERY_CDM_VERSION);
    }

    try {
        const { analyticsConnection } = req.dbConnections;
        let dbDao = new DBDAO(analyticsConnection);
        const cdmVersion = await dbDao.getCDMVersion(schemaName);

        let hanaKey = "CDM_VERSION";
        let cdmVersionKey =
            dialect === ANALYTICS_DB_DIALECTS.HANA
                ? hanaKey
                : dbUtils.convertNameToPg(hanaKey);
        let cdmVersionValue = cdmVersion[0][cdmVersionKey];
        if (cdmVersionValue) {
            //Cater to scenarios if vx.x is stored in the CDM schema
            cdmVersionValue = cdmVersionValue.toUpperCase().startsWith("V")
                ? cdmVersionValue.slice(1)
                : cdmVersionValue;
        } else {
            throw new Error("Invalid cdm version value");
        }
        res.status(200).json(cdmVersionValue);
    } catch (err) {
        logger.error(`Error retrieving CDM version: ${err}`);
        const httpResponse = {
            status: 500,
            message: "Something went wrong when retrieving data",
            data: [],
        };
        res.status(500).json(httpResponse);
    }
}

export async function checkIfSchemaExists(req, res, next) {
    const dialect: string = req.query.dialect;
    const databaseCode: string = req.query.databaseCode;
    const schemaName: string = req.query.schemaName;

    // TODO: Discuss how to handle bigquery connections for dbsvc code in analytics-svc
    // Always send true if dialect is bigquery
    if (dialect === ANALYTICS_DB_DIALECTS.BIGQUERY) {
        return res.status(200).send(true);
    }

    try {
        const { analyticsConnection } = req.dbConnections;
        const dbDao = new DBDAO(analyticsConnection);
        const schemaExists = await dbDao.checkIfSchemaExists(
            databaseCode,
            schemaName
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
    const _datasetId = req.query.datasetId;
    const { schema: SchemaName, code: databaseName } =
        req.dbCredentials.studyAnalyticsCredential;

    try {
        const { analyticsConnection } = req.dbConnections;
        const dbDao = new DBDAO(analyticsConnection);
        const results = await dbDao.getSnapshotSchemaMetadata(
            databaseName,
            SchemaName
        );
        res.status(200).json(results);
    } catch (err: any) {
        logger.error("Error while getting schema snapshot metadata");
        return next(err);
    }
}
