/**
 * Request processor for the patient detail endpoint (e.g. for the patient list).
 */
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { BaseQueryEngineEndpoint } from "./BaseQueryEngineEndpoint";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import * as utilsLib from "@alp/alp-base-utils";
import { AuditLogger } from "../../utils/AuditLogger";
import { generateQuery } from "../../utils/QueryGenSvcProxy";
import {
    QuerySvcResultType,
    MRIEndpointResultMeasureType,
    MRIEndpointResultCategoryType,
} from "../../types";

// Max length of the channel is 16 (limitation in audit server), hence we use abbreviations to shorten it.
const AUDITLOG_CHANNEL_PATIENTLIST = "MRI Pt. List";

export class PatientListEndpoint extends BaseQueryEngineEndpoint {
    constructor(
        connection: ConnectionInterface,
        private forCsvDownload: Boolean,
        unitTestMode?: boolean
    ) {
        super(connection, unitTestMode ? unitTestMode : false);
    }

    /**
     * Since pholdertableMap is not required for this endpoint, processRequest2 is to be used.
     * A more elegant solution is needed as this is inherited from BaseQueryEngineEndpoint
     */
    public processRequest(
        req,
        configId,
        configVersion,
        datasetId,
        ifrRequest,
        language
    ) {
        throw new Error("processRequest is not yet implemented");
    }

    private _addPIDAxis(request: any) {
        if (request.axes) {
            request.axes.unshift({
                aggregation: "string_agg",
                axis: "y",
                configPath: "patient",
                id: "patient.attributes.pid",
                instanceID: "patient",
                isFiltercard: true,
                seq: 0,
            });
            request.axes.forEach((el, idx) => {
                el.seq = idx;
            });
        }
        return request;
    }

    private _addInteractionId(request: any) {
        let newAxes = [];
        let uniqueInteractions = [];
        if (request && request.axes) {
            request.axes.forEach((el) => {
                if (
                    el.configPath.indexOf("patient.attributes") === -1 &&
                    el.configPath.indexOf("interactions") !== -1
                ) {
                    if (uniqueInteractions.indexOf(el.instanceID) === -1) {
                        uniqueInteractions.push(el.instanceID);
                        let id = `${el.instanceID}.attributes._interaction_id`;
                        newAxes.push({
                            aggregation: "string_agg",
                            axis: "y",
                            configPath: el.configPath,
                            id,
                            instanceID: el.instanceID,
                            isFiltercard: false,
                            seq: 0,
                        });
                    }
                }
                newAxes.push(el);
            });
        }
        newAxes.forEach((el, idx) => {
            el[`seq`] = idx;
        });
        request[`axes`] = newAxes;
        return request;
    }

    public processRequest2(
        httpReq,
        configId,
        configVersion,
        datasetId,
        bookmarkInputStr,
        language,
        auditLogChannel?: string,
        fileName?: string
    ) {
        return new Promise(async (resolve, reject) => {
            try {
                let emptyResult: any = {
                    sql: "",
                    data: [],
                    measures: [],
                    categories: [],
                    totalPatientCount: 0,
                };

                auditLogChannel =
                    !auditLogChannel || auditLogChannel === ""
                        ? AUDITLOG_CHANNEL_PATIENTLIST
                        : auditLogChannel;

                const querySvcParams = {
                    queryParams: {
                        configId,
                        configVersion,
                        datasetId,
                        queryType: "patientdetail",
                        bookmarkInputStr,
                        language,
                    },
                };
                let queryResponse: QuerySvcResultType = await generateQuery(
                    httpReq,
                    querySvcParams
                );
                let finalQueryObject = queryResponse.queryObject;
                let nql: QueryObject = new QueryObject(
                    finalQueryObject.queryString,
                    finalQueryObject.parameterPlaceholders,
                    finalQueryObject.sqlReturnOn
                );
                let fast: any = queryResponse.fast;
                let measures: MRIEndpointResultMeasureType[] =
                    queryResponse.measures;
                let categories: MRIEndpointResultCategoryType[] =
                    queryResponse.categories;
                let cdmConfigMetaData: any = queryResponse.cdmConfigMetaData;
                let ifrRequest = queryResponse.ifrRequest;

                nql.executeQuery(this.connection, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    result.measures = measures;
                    result.categories = categories;

                    if (
                        !ifrRequest.axes ||
                        (ifrRequest.axes && ifrRequest.axes.length === 0)
                    ) {
                        //If no columns are selected in the patient list front end
                        result.data = [];
                        result.categories = [];
                        result.measures = [];
                    } else if (result.data.length === 0) {
                        result.noDataReason =
                            "MRI_PA_NO_MATCHING_PATIENTS_GUARDED";
                        result.totalPatientCount = 0;
                    } else {
                        result.data.forEach((row) => {
                            Object.keys(row).forEach((column) => {
                                if (typeof row[column] === "string") {
                                    row[column] = row[column]
                                        .split(utilsLib.uniqueSeparatorString)
                                        .filter((value, index, self) => {
                                            return (
                                                self.indexOf(value) === index
                                            );
                                        });
                                }
                            });
                        });
                        result.totalPatientCount = result.data[0].totalpcount;
                    }
                    /*             AuditLogger.getAuditLogger().log(
                                    "patient.attributes.pid",
                                    AUDITLOG_CHANNEL_PLUGIN_SERVICES,
                                    pList,
                                    true,
                                    resultcb,
                                    undefined,
                                    selectedAttributes); */
                    AuditLogger.getAuditLogger({})
                        .withCDMConfigMetaData(cdmConfigMetaData)
                        .log(
                            "patient.attributes.pid",
                            auditLogChannel,
                            result.data,
                            true,
                            (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    this.responseDbgInfo(result, {
                                        FAST: fast.statement,
                                        nql,
                                    });
                                    resolve(result);
                                }
                            },
                            ["totalpcount"],
                            undefined,
                            fileName
                                ? { id: fileName, name: fileName }
                                : undefined
                        );
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}
