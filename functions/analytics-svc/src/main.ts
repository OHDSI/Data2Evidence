// tslint:disable:no-console
import * as dotenv from "dotenv";
import {
    DBConnectionUtil as dbConnectionUtil,
    getUser,
    Logger,
    QueryObject,
    EnvVarUtils,
    healthCheckMiddleware,
    User,
    utils,
    Connection,
    translateHanaToDuckdb,
} from "@alp/alp-base-utils";
import * as pathx from "https://deno.land/std@0.188.0/path/mod.ts";

import express from "express";
import https from "https";
import helmet from "helmet";
import path from "path";
import yaml from "npm:yaml";
import { access, constants } from "node:fs/promises";
import * as mri2 from "./mri/endpoint/analytics";
import * as xsenv from "@sap/xsenv";
import { AuditLogger } from "./utils/AuditLogger";
import { Settings } from "./qe/settings/Settings";
//import * as swagger from "@alp/swagger-node-runner";
import MRIEndpointErrorHandler from "./utils/MRIEndpointErrorHandler";
import noCacheMiddleware from "./middleware/NoCache";
import timerMiddleware from "./middleware/Timer";
import studyDbCredentialMiddleware from "./middleware/StudyDbCredential";
import { MriConfigConnection } from "@alp/alp-config-utils";
import { StudiesDbMetadata, StudyDbMetadata, IMRIRequest } from "./types";
import PortalServerAPI from "./api/PortalServerAPI";
import { getDuckdbDBConnection } from "./utils/DuckdbConnection";
import { getCachedbDbConnections } from "./utils/cachedb/cachedb.ts";
import { DB } from "./utils/DBSvcConfig";
import { env } from "./env";
import addCorrelationIDToHeader from "./middleware/AddCorrelationId.ts";
dotenv.config();
const log = console; //Logger.CreateLogger("analytics-log");
const mriConfigConnection = new MriConfigConnection(
    env.SERVICE_ROUTES?.paConfig
);
const envVarUtils = new EnvVarUtils(Deno.env.toObject());
/**
 * Declare variables
 */
let alpPortalStudiesDbMetadataCacheTTLSeconds: number;
let studiesDbMetadata: StudiesDbMetadata;
let publicStudiesDbMetadata: StudiesDbMetadata;

/**
 * Declare Startup Functions
 */

const initRoutes = async (app: express.Application) => {
    app.use(helmet());
    app.use(express.json({ strict: false, limit: "50mb" }));
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));
    app.use(noCacheMiddleware);

    // set request correlation ID to logger (if available)
    app.use(addCorrelationIDToHeader);

    let analyticsCredentials;

    if (envVarUtils.isStageLocalDev()) {
        app.use(timerMiddleware());
    }

    alpPortalStudiesDbMetadataCacheTTLSeconds =
        env.ANALYTICS_SVC__STUDIES_METADATA__TTL_IN_SECONDS || 600;

    analyticsCredentials = env.VCAP_SERVICES["mridb"]
        .filter((x) => x["tags"]?.indexOf("analytics") > -1)
        //.filterServices({ tag: "analytics" })
        .reduce((acc, item) => {
            // Reduce credentials so that key of object is databaseCode
            acc[item.credentials.code] = item.credentials;
            return acc;
        }, {});

    // Calls Alp-Portal for studies db metadata and cache it
    // Ignore Alp-Portal check for readiness probe check
    app.use(async (req: IMRIRequest, res, next) => {
        // log.debug(
        //     `🚀 ~ file: main.ts ~ line 107 ~ app.use ~ req.headers: ${JSON.stringify(
        //         req.headers,
        //         null,
        //         2
        //     )}`
        // );
        const hasExpiredStudiesDbMetadataCache = (studiesDb): boolean => {
            if (!studiesDb?.studies) {
                return true;
            }
            const timeToLiveInMilliseconds: number =
                alpPortalStudiesDbMetadataCacheTTLSeconds * 1000;
            return studiesDb.cachedAt + timeToLiveInMilliseconds < Date.now();
        };

        try {
            if (req.url !== "/check-readiness" && !utils.isClientCredReq(req)) {
                const publicEndpoint = "/analytics-svc/api/services/public";
                let studies: StudyDbMetadata[];
                // Checks if its public
                if (req.originalUrl.startsWith(publicEndpoint)) {
                    log.info("getting public studies metadata");
                    if (
                        hasExpiredStudiesDbMetadataCache(
                            publicStudiesDbMetadata
                        )
                    ) {
                        studies =
                            await new PortalServerAPI().getPublicStudies();
                        publicStudiesDbMetadata = {
                            studies,
                            cachedAt: Date.now(),
                        };
                    }
                    req.studiesDbMetadata = publicStudiesDbMetadata;
                } else {
                    if (hasExpiredStudiesDbMetadataCache(studiesDbMetadata)) {
                        // Get Analytics Credential for study based on selected study
                        const timestamp = new Date().valueOf();
                        console.time(
                            `timer-analytics-svc-PortalServerAPI-getStudies-${timestamp}`
                        );
                        const portalServerAPI = new PortalServerAPI();
                        const accessToken =
                            await portalServerAPI.getClientCredentialsToken();
                        studies = await portalServerAPI.getStudies(accessToken);
                        console.timeEnd(
                            `timer-analytics-svc-PortalServerAPI-getStudies-${timestamp}`
                        );
                        studiesDbMetadata = {
                            studies,
                            cachedAt: Date.now(),
                        };
                        // console.log(`studiesDbMetadata ${JSON.stringify(studiesDbMetadata)}`)
                    }
                    req.studiesDbMetadata = studiesDbMetadata; //Because this is cached
                }
            }

            req.dbCredentials = {
                ...req.dbCredentials,
                analyticsCredentials,
            };

            next();
        } catch (err) {
            log.error(err);
            res.status(500);
        }
    });

    // Get Analytics Credential for study based on selected study
    // Otherwise, default it to the first db connection and use default schema in the connection string
    await app.use(studyDbCredentialMiddleware);

    app.use(async (req: IMRIRequest, res, next) => {
        try {
            if (!utils.isHealthProbesReq(req)) {
                let userObj: User;
                try {
                    userObj = getUser(req);
                    // log.debug(
                    //     `req.headers: ${JSON.stringify(req.headers)}\n
                    //         currentUser: ${JSON.stringify(userObj)}\n
                    //         url is: ${req.url}`
                    // );
                } catch (err) {
                    log.debug(`No user found in request:${err.stack}`);
                }

                // Skip getting db connections if request starts with "/analytics-svc/api/services/alpdb/", as these requests are all in dbsvc.ts and uses a separate implementation for database connection
                if (
                    req.originalUrl.startsWith(
                        "/analytics-svc/api/services/alpdb/"
                    )
                ) {
                    log.info(
                        "Skipping middleware to get req.dbConnections for /alpdb/* requests"
                    );
                    return next();
                }

                const credentials = req.dbCredentials.studyAnalyticsCredential;

                // USE_TREX_DB_CONN takes precedence over USE_CACHEDB
                if (
                    env.USE_TREX_DB_CONN === "true" &&
                    credentials.dialect != DB.HANA
                ) {
                    req.dbConnections = getTrexDbConnection({
                        analyticsCredentials: credentials,
                    });
                }
                // Even if USE_CACHEDB is true, For Hana dialect it will use the legacy / non-cachedb connection always. So that both duckdb and Hana datasets can functionally coexist
                else if (
                    env.USE_CACHEDB === "true" &&
                    credentials.dialect != DB.HANA
                ) {
                    req.dbConnections = await getCachedbDbConnections({
                        analyticsCredentials: credentials,
                        userObj: userObj,
                        token: req.headers.authorization,
                        datasetId: req.selectedstudyDbMetadata.id,
                    });
                } else {
                    req.dbConnections = await getDBConnections({
                        analyticsCredentials: credentials,
                        userObj,
                    });
                }
            }

            next();
        } catch (err) {
            next(err);
        }
    });

    app.use((req: IMRIRequest, res, next) => {
        // Skip getting cleanupMiddleware if request starts with "/analytics-svc/api/services/alpdb/", as these requests are all in dbsvc.ts and has a separate implementation for database connection cleanups
        if (req.originalUrl.startsWith("/analytics-svc/api/services/alpdb/")) {
            log.info("Skipping cleanupMiddleware for /alpdb/* requests");
            return next();
        }

        if (!utils.isHealthProbesReq(req)) {
            dbConnectionUtil.DBConnectionUtil.cleanupMiddleware()(
                req as any,
                res,
                next
            );
        } else {
            next();
        }
    });

    app.use("/check-readiness", healthCheckMiddleware);

    app.use(
        "/analytics-svc/pa/services/sessionVars",
        (req: IMRIRequest, res, next) => {
            QueryObject.QueryObject.format(
                `select 
      SESSION_CONTEXT('XS_APPLICATIONUSER') as DB_USER_NAME, 
      SESSION_CONTEXT('APPLICATIONUSER') as APP_USER_NAME from dummy`
            ).executeQuery(
                req.dbConnections.analyticsConnection,
                (err, result) => {
                    if (err) {
                        log.error(err);
                        return next(err);
                    }
                    res.status(200).json(result);
                }
            );
        }
    );

    app.use(
        "/analytics-svc/pa/services/analytics.xsjs",
        async (req: IMRIRequest, res, next) => {
            console.log("ana.xsjs");
            // get user from request
            const user = getUser(req);
            const language = user.lang;
            let action = req.query.action
                ? req.query.action
                : req.method === "POST"
                ? req.body.action
                : "";
            let tmpbody =
                (req.query.data ? JSON.parse(<string>req.query.data) : null) ||
                req.body;
            let body;
            body = typeof tmpbody === "object" ? tmpbody : JSON.parse(tmpbody);
            body.language = language;
            const csvParam = req.query.csvparam
                ? JSON.parse(<string>req.query.csvparam)
                : req.body.csvParam;

            const { analyticsConnection } = req.dbConnections;

            let configResults;
            let datasetId;
            switch (action) {
                case "getMyConfig":
                case "getMyConfigList":
                case "getMyStudyConfigList":
                    datasetId =
                        typeof req.query?.datasetId === "string"
                            ? req.query.datasetId
                            : null;
                    let queryParams = {
                        action: "getMyConfig",
                        datasetId,
                        configId: req.paConfigId,
                    };

                    configResults = await mriConfigConnection.getMriConfig(
                        req,
                        queryParams
                    );

                    if (!configResults) {
                        res.status(500).send(
                            MRIEndpointErrorHandler({
                                err: {
                                    name: "mri-pa",
                                    message: `Error in getting the list of configs!`,
                                },
                                language,
                            })
                        );
                    } else {
                        // Handle error from mriConfigConnection.getMriConfig
                        if (configResults.statusCode) {
                            const statusCode = configResults.statusCode;
                            const message = configResults.message;
                            if (statusCode >= 400 && statusCode < 600) {
                                log.error(message);
                                res.status(statusCode).send(
                                    MRIEndpointErrorHandler({
                                        err: {
                                            name: "mri-pa",
                                            message: message,
                                        },
                                        language,
                                    })
                                );
                            }
                        } else {
                            res.status(200).json(configResults);
                        }
                    }
                    break;
                case "getFrontendConfig":
                case "setDefault":
                case "clearDefault":
                    datasetId =
                        typeof req.query?.datasetId === "string"
                            ? req.query.datasetId
                            : null;
                    let qParams = {
                        action: "getMyConfig",
                        datasetId,
                        configId: req.paConfigId,
                    };
                    configResults = await mriConfigConnection.getMriConfig(
                        req,
                        qParams
                    );
                    if (!configResults) {
                        res.status(500).send(
                            MRIEndpointErrorHandler({
                                err: {
                                    name: "mri-pa",
                                    message: `Error in clearing default config!`,
                                },
                                language,
                            })
                        );
                    } else {
                        // Handle error from mriConfigConnection.getMriConfig
                        if (configResults.statusCode) {
                            const statusCode = configResults.statusCode;
                            const message = configResults.message;
                            if (statusCode >= 400 && statusCode < 600) {
                                log.error(message);
                                res.status(statusCode).send(
                                    MRIEndpointErrorHandler({
                                        err: {
                                            name: "mri-pa",
                                            message: message,
                                        },
                                        language,
                                    })
                                );
                            }
                        }

                        res.status(200).json(configResults);
                    }
                    break;
                default:
                    try {
                        let configId = req.paConfigId;
                        let configVersion = req.paConfigVersion;

                        //Only for tests choose metadata from the request body
                        if (
                            envVarUtils.isTestEnv() ||
                            envVarUtils.isHttpTestRun()
                        ) {
                            let configData = Array.isArray(body)
                                ? body[0].configData
                                : body.configData;

                            if (
                                configData &&
                                (configData.length > 0 ||
                                    Object.keys(configData).length > 0)
                            ) {
                                configId = configData.configId;
                                configVersion = configData.configVersion;
                            } else {
                                throw new Error("Config metadata undefined!");
                            }
                        }

                        const datasetId = req.body.datasetId;
                        const mriConfig =
                            await mriConfigConnection.getStudyConfig(
                                {
                                    req,
                                    action: "getBackendConfig",
                                    configId,
                                    configVersion,
                                    lang: language,
                                    datasetId,
                                },
                                true
                            );
                        let userSpecificSettings =
                            new Settings().initAdvancedSettings(
                                mriConfig.config.advancedSettings
                            );
                        let placeholderMap =
                            userSpecificSettings.getPlaceholderMap();

                        if (
                            [
                                "aggquerycsv",
                                "boxplotcsv",
                                "kmquerycsv",
                                "patientdetailcsv",
                            ].indexOf(action) > -1
                        ) {
                            let sFilename;
                            switch (action) {
                                case "aggquerycsv":
                                    sFilename =
                                        req.query.name ||
                                        "PatientAnalytics_Bar-Chart_" +
                                            new Date().toISOString() +
                                            ".csv";
                                    break;
                                case "boxplotcsv":
                                    sFilename =
                                        req.query.name ||
                                        "PatientAnalytics_Boxplot-Chart_" +
                                            new Date().toISOString() +
                                            ".csv";
                                    break;
                                case "kmquerycsv":
                                    sFilename =
                                        req.query.name ||
                                        "PatientAnalytics_Kaplan-Meier_" +
                                            new Date().toISOString() +
                                            ".csv";
                                    break;
                                case "patientdetailcsv":
                                    sFilename =
                                        req.query.name ||
                                        "PatientAnalytics_Patient-List_" +
                                            new Date().toISOString() +
                                            ".csv";
                                    break;
                                default:
                                    break;
                            }
                            mri2.processRequestCsv(
                                action,
                                req,
                                configId,
                                configVersion,
                                datasetId,
                                body,
                                language,
                                analyticsConnection,
                                csvParam,
                                (err, result) => {
                                    if (err) {
                                        return res.status(500).send(
                                            MRIEndpointErrorHandler({
                                                err,
                                                language,
                                            })
                                        );
                                    }
                                    res.set({
                                        "content-disposition":
                                            "attachment; filename=" + sFilename,
                                        "content-Type": "text/csv",
                                    });
                                    res.status(200).send(result);
                                }
                            );
                        } else {
                            mri2.processRequest(
                                req,
                                action,
                                configId,
                                configVersion,
                                datasetId,
                                body,
                                language,
                                mriConfig.config,
                                analyticsConnection,
                                (err, result) => {
                                    if (err) {
                                        return res.status(500).send(
                                            MRIEndpointErrorHandler({
                                                err,
                                                language,
                                            })
                                        );
                                    }
                                    res.status(200).json(result);
                                }
                            );
                        }
                    } catch (err) {
                        return res
                            .status(500)
                            .send(MRIEndpointErrorHandler({ err, language }));
                    }
                    break;
            }
        }
    );

    /**Access rights: End User */

    log.info("Initialized express routes..");
    Promise.resolve();
};

const initSwaggerRoutes = async (app: express.Application) => {
    const swaggerFile = yaml.parse(
        await Deno.readTextFile(
            path.dirname(pathx.fromFileUrl(import.meta.url)).slice(0, -3) +
                "api/swagger/swagger.yaml"
        )
    );
    const basePath = swaggerFile["basePath"];
    for (const [path, value] of Object.entries(swaggerFile["paths"])) {
        // Skip swagger route
        if (path === "/swagger") {
            log.info(
                "Skipping '/swagger' route as it is not linked to a x-swagger-router-controller file"
            );
            continue;
        }

        const controllerFile = value["x-swagger-router-controller"];
        try {
            const controller = await import(
                `./api/controllers/${controllerFile}.ts`
            );
            const url = `${basePath}${path.slice(1)}`.replace(
                /\{(.+?)\}/g,
                ":$1"
            );
            for (const [k, v] of Object.entries(value)) {
                switch (k) {
                    case "get":
                        app.get(url, controller[v["operationId"]]);
                        //console.log("add" + url)
                        break;
                    case "post":
                        app.post(url, controller[v["operationId"]]);
                        //console.log("add" + url)

                        break;
                    case "put":
                        app.put(url, controller[v["operationId"]]);
                        //console.log("add" + url)

                        break;
                    case "delete":
                        app.delete(url, controller[v["operationId"]]);
                        //console.log("add" + url)

                        break;
                    default:
                        if (k != "x-swagger-router-controller")
                            console.log("unknown method " + k);
                }
            }
        } catch (e) {
            console.log(controllerFile);
            console.log(e);
        }
    }

    /*swagger.create(config, (err, swaggerRunner) => {
        if (err) {
            return Promise.reject(err);
        }
        try {
            let swaggerExpress = swaggerRunner.expressMiddleware();
            swaggerExpress.register(app); // install middleware
            log.info("Swagger routes Initialized..");
            Promise.resolve();
        } catch (err) {
            log.error("Error initializing swagger routes: " + err);
            Promise.reject(err);
        }
    });*/
};

let initSettingsFromEnvVars = () => {
    EnvVarUtils.loadDevSettings();
};

const getTrexDbConnection = ({
    analyticsCredentials,
}): { analyticsConnection: Connection.ConnectionInterface } => {
    try {
        const dbm = Trex.databaseManager();
        const trex_publication = dbm.getFirstPublication(
            analyticsCredentials.code
        );
        const trex_pg_direct_connection_alias = `${trex_publication}_trexpg`;

        const parseSql = (
            temp: string,
            schemaNames: string,
            vocabSchemaNames: string,
            parameters: any
        ): string => {
            // Specifically for trex db connection, direct pg connection alias is different from cachedb.
            // $$$$SCHEMA$$$$ is the replacement, but will appear in the string as $$SCHEMA$$
            temp = temp.replace(
                /\$\$SCHEMA_DIRECT_CONN\$\$./g,
                `${trex_pg_direct_connection_alias}.$$$$SCHEMA$$$$.`
            );
            return translateHanaToDuckdb(
                temp,
                schemaNames,
                vocabSchemaNames,
                parameters
            );
        };
        const conn = dbm.getConnection(
            analyticsCredentials.code,
            analyticsCredentials.schema,
            analyticsCredentials.vocabSchema,
            { duckdb: parseSql }
        );

        return { analyticsConnection: conn };
    } catch (error) {
        console.log("Error getting trex connection, ", error);
        throw error;
    }
};

const getDBConnections = async ({
    analyticsCredentials,
    userObj,
}): Promise<{
    analyticsConnection: Connection.ConnectionInterface;
}> => {
    // Define defaults for both analytics & Vocab connections
    let analyticsConnectionPromise;
    if (env.USE_DUCKDB === "true" && analyticsCredentials.dialect !== DB.HANA) {
        // Use duckdb as analyticsConnection if USE_DUCKDB flag is set to true
        const duckdbSchemaFileName = `${analyticsCredentials.code}_${analyticsCredentials.schema}`;
        const duckdbVocabSchemaFileName = `${analyticsCredentials.code}_${analyticsCredentials.vocabSchema}`;

        try {
            // Check duckdb dataset access
            await access(
                path.join(env.DUCKDB__DATA_FOLDER, duckdbSchemaFileName),
                constants.R_OK
            );
            await access(
                path.join(env.DUCKDB__DATA_FOLDER, duckdbVocabSchemaFileName),
                constants.R_OK
            );
            log.debug(
                `Duckdb accessible at paths ${path.join(
                    env.DUCKDB__DATA_FOLDER,
                    duckdbSchemaFileName
                )} AND ${path.join(
                    env.DUCKDB__DATA_FOLDER,
                    duckdbVocabSchemaFileName
                )}`
            );

            // resolve error from getDuckdbDBConnection so that PA screen continues to load and user is able to select other datasets.
            analyticsConnectionPromise = new Promise(
                async (resolve, _reject) => {
                    try {
                        const conn = await getDuckdbDBConnection(
                            duckdbSchemaFileName,
                            duckdbVocabSchemaFileName
                        );
                        resolve(conn);
                    } catch (err) {
                        resolve(err);
                    }
                }
            );
        } catch (e) {
            log.error(e);
            log.warn(
                `Duckdb Inaccessible at following paths ${path.join(
                    env.DUCKDB__DATA_FOLDER,
                    duckdbSchemaFileName
                )} OR ${path.join(
                    env.DUCKDB__DATA_FOLDER,
                    duckdbVocabSchemaFileName
                )}. Hence fallback to Postgres dialect connection`
            );
        }
    }

    if (!analyticsConnectionPromise) {
        //Initialize if not yet until this point
        // node hdb library checks for these to use TLS
        // TLS does not work with deno for self signed certs
        if (!analyticsCredentials.useTLS) {
            delete analyticsCredentials.key;
            delete analyticsCredentials.cert;
            delete analyticsCredentials.ca;
            delete analyticsCredentials.pfx;
        }

        if (
            analyticsCredentials.dialect === DB.HANA &&
            analyticsCredentials.authentication_mode === "JWT"
        ) {
            delete analyticsCredentials.user;
            delete analyticsCredentials.password;
            if (userObj.thirdPartyToken) {
                analyticsCredentials["token"] = userObj.thirdPartyToken;
            } else {
                throw new Error(
                    "Intermediary IDP token doesnt exist for HANA JWT Authentication!"
                );
            }
            analyticsCredentials[
                "SESSIONVARIABLE:APPLICATION"
            ] = `${env.PROJECT_NAME}-cohorts`;
            analyticsCredentials["SESSIONVARIABLE:APPLICATIONUSER"] =
                userObj.getUser();
        }

        analyticsConnectionPromise =
            dbConnectionUtil.DBConnectionUtil.getDBConnection({
                credentials: analyticsCredentials,
                schemaName: analyticsCredentials.schema,
                vocabSchemaName: analyticsCredentials.vocabSchema,
                userObj,
            });
    }

    const [analyticsConnection] = await Promise.all([
        analyticsConnectionPromise,
    ]);

    return {
        analyticsConnection,
    };
};
const main = async () => {
    /**
     * Handle Environment Variables
     */
    const mountPath =
        env.NODE_ENV === "production" ? env.ENV_MOUNT_PATH : "../../";
    const envFile = `${mountPath}default-env.json`;
    xsenv.loadEnv(envVarUtils.getEnvFile(envFile));
    const port = env.ANALYTICS_SVC__PORT || 3000;

    //initialize Express
    const app = express();

    app.use("/check-liveness", healthCheckMiddleware);

    //Since browser triggers this request automatically, handling this else a JWT not found error would be returned.
    app.get("/favicon.ico", (req, res) => {
        res.sendStatus(204); //HTTP status no content
    });

    /**
     * Call Startup Functions
     */

    initSettingsFromEnvVars();
    await initRoutes(app);
    await initSwaggerRoutes(app);
    //utils.setupGlobalErrorHandling(app, log);

    /*const server = https.createServer(
        {
            key: env.TLS__INTERNAL__KEY?.replace(/\\n/g, "\n"),
            cert: env.TLS__INTERNAL__CRT?.replace(/\\n/g, "\n"),
            maxHeaderSize: 8192 * 10,
        },
        app
    );*/
    app.listen(port);
    log.info(
        `🚀 MRI Application started successfully!. Server listening on port ${port}`
    );
};

try {
    main();
} catch (err) {
    log.error(`
        MRI failed to start! Kindly fix the error and restart the application. ${err.message}
        ${err.stack}`);
    //process.exit(1);
}
