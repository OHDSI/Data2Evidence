/**
 * Request processor for the aggregation endpoint (e.g. for the bar-chart).
 */
import {
    QueryObject as qo,
    DBConnectionUtil as dbConnectionUtil,
    getUser,
    User,
    Logger,
} from "@alp/alp-base-utils";
import { MriConfigConnection } from "@alp/alp-config-utils";
import QueryObject = qo.QueryObject;
import { QuerySvcResultType } from "../../types";
import { BaseQueryEngineEndpoint } from "./BaseQueryEngineEndpoint";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import * as utilsLib from "@alp/alp-base-utils";
import { generateQuery } from "../../utils/QueryGenSvcProxy";
import { env } from "../../env";
const log = Logger.CreateLogger("analytics-log");
const mriConfigConnection = new MriConfigConnection(
    env.SERVICE_ROUTES?.paConfig
);

export class PatientCountEndpoint extends BaseQueryEngineEndpoint {
    constructor(connection: ConnectionInterface, unitTestMode?: boolean) {
        super(connection, unitTestMode ? unitTestMode : false);
    }

    public getAnnotationPath(config, annotation) {
        let jsonWalker = utilsLib.getJsonWalkFunction(config);
        let elements = jsonWalker("**.interactions.*.attributes.*");
        let path;
        elements.forEach((element) => {
            if (
                element.obj.annotations &&
                element.obj.annotations.indexOf(annotation) !== -1
            ) {
                path = element.path.split(".attributes.").join(".attributes.");
            }
        });
        if (path) {
            return path;
        } else {
            throw new Error(
                "Error finding annotation in MRI PA configuration."
            );
        }
    }

    public processRequest(
        req,
        configId,
        configVersion,
        datasetId,
        bookmarkInputStr: string,
        language
    ) {
        log.addRequestCorrelationID(req);
        return new Promise(async (resolve, reject) => {
                try {
                    const querySvcParams = {
                        queryParams: {
                            configId,
                            configVersion,
                            datasetId,
                            queryType: "totalpcount",
                            bookmarkInputStr,
                            language,
                        },
                    };
                    let queryResponse: QuerySvcResultType = await generateQuery(
                        req,
                        querySvcParams
                    );
                    let finalQueryObject = queryResponse.queryObject;
                    let nql: QueryObject = new QueryObject(
                        finalQueryObject.queryString,
                        finalQueryObject.parameterPlaceholders,
                        finalQueryObject.sqlReturnOn
                    );
                    let fast: any = queryResponse.fast;

                    nql.executeQuery(this.connection, (err, result) => {
                        if (err) {
                            reject(err);
                        } else {
                            // if nothing is returned set the result to 0
                            if (result.data.length !== 1) {
                                result.data = [{ "patient.attributes.pcount": 0 }];
                            }

                            this.responseDbgInfo(result, {
                                FAST: fast.statement,
                                nql,
                            });

                            resolve(result);
                        }
                    });
            } catch(err) {
                reject(err);
            }
        });
    }

    // Theres a chance that this might be done by unauth user
    public async processMultipleStudyRequest(
        req,
        datasetIds: string[],
        bookmarkInputStr: string,
        language
    ) {
        log.addRequestCorrelationID(req);
        const promises = [];

        const configId = req.paConfigId;
        const configVersion = req.paConfigVersion;

        // Generate DB Credentials for each datasetId
        const dbCreds = {};
        const analyticsCredentials = req.dbCredentials.analyticsCredentials;

        let userObj: User;
        userObj = getUser(req);

        datasetIds.forEach(async (datasetId) => {
            // Get metadata for datasetId
            const currMetadata = req.studiesDbMetadata.studies.find(
                (metadata) => metadata.id === datasetId
            );
            // Retrieve dbName from metadata or default to first db
            const currStudyDBname: string =
                currMetadata?.databaseName ||
                analyticsCredentials[Object.keys(analyticsCredentials)[0]]
                    .databaseName;
            // Retrieve schema from metadata or default to empty string
            const currStudySchemaName: string = currMetadata
                ? currMetadata.schemaName
                : "";

            // Create StudyAnalyticsCredential for study
            const studyAnalyticsCredential = {
                ...analyticsCredentials[currStudyDBname],
            };
            studyAnalyticsCredential.schema = currStudySchemaName
                ? currStudySchemaName.toUpperCase()
                : studyAnalyticsCredential.probeSchema.toUpperCase();

            dbCreds[datasetId] = studyAnalyticsCredential;
        });

        // Get Config
        datasetIds.forEach((datasetId) => {
            promises.push(
                new Promise(async (resolve, reject) => {
                    try{
                            const querySvcParams = {
                                queryParams: {
                                    configId,
                                    configVersion,
                                    datasetId,
                                    queryType: "totalpcount",
                                    bookmarkInputStr,
                                    language,
                                },
                            };

                            let queryResponse: QuerySvcResultType = await generateQuery(
                                req,
                                querySvcParams
                            );
                            let finalQueryObject = queryResponse.queryObject;
                            let nql: QueryObject = new QueryObject(
                                finalQueryObject.queryString,
                                finalQueryObject.parameterPlaceholders,
                                finalQueryObject.sqlReturnOn
                            );

                            let fast: any = queryResponse.fast;
                            const ac = dbCreds[datasetId];
                            const analyticsConnection =
                                await dbConnectionUtil.DBConnectionUtil.getDBConnection(
                                    {
                                        credentials: ac,
                                        schemaName: ac.schemaName,
                                        vocabSchemaName: ac.vocabSchemaName,
                                        userObj,
                                    }
                                );

                            nql.executeQuery(analyticsConnection, (err, result) => {
                                if (err) {
                                    log.enrichErrorWithRequestCorrelationID(err, req);
                                    reject(err);
                                } else {
                                    // if nothing is returned set the result to 0
                                    if (result.data.length !== 1) {
                                        result.data = [
                                            { "patient.attributes.pcount": 0 },
                                        ];
                                    }

                                    this.responseDbgInfo(result, {
                                        FAST: fast.statement,
                                        nql,
                                    });

                                    // Attach studyID to result
                                    result.datasetId = datasetId;

                                    resolve(result);
                                }
                            });
                    } catch(err) {
                        reject(err)
                    }
                })
            );
        });
        return Promise.all(promises);
    }
}
