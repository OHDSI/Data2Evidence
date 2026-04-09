/**
 * Request processor for the aggregation endpoint (e.g. for the bar-chart).
 */
import {
    QueryObject as qo,
    Logger,
} from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { QuerySvcResultType } from "../../types";
import { BaseQueryEngineEndpoint } from "./BaseQueryEngineEndpoint";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import * as utilsLib from "@alp/alp-base-utils";
import { generateQuery } from "../../utils/QueryGenSvcProxy";
const log = Logger.CreateLogger("analytics-log");

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
}
