import { StackedBarchartEndpoint } from "../../mri/endpoint/StackedBarchartEndpoint";
import { PatientCountEndpoint } from "../../mri/endpoint/PatientCountEndpoint";
import { PatientListEndpoint } from "../../mri/endpoint/PatientListEndpoint";
import { Settings } from "../../qe/settings/Settings";
import { getUser } from "@alp/alp-base-utils";
import { IMRIRequest } from "../../types";

import { DBError as dbe } from "@alp/alp-base-utils";
import DBError = dbe.DBError;
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { convertZlibBase64ToJson } from "@alp/alp-base-utils";
import { env } from "../../env";

const sqlReturnOn: boolean = env.SQL_RETURN_ON === "true" ? true : false;

let _stripDbgInfo = (result) => {
    if (typeof result === "string") {
        return result;
    }

    ["sql", "sqlParameters", "debug"].forEach((k) => (result[k] = undefined));
    return result;
};
let _processResult = (result) =>
    result && !sqlReturnOn ? _stripDbgInfo(result) : result;
/**
 * Retrieves list of patient count for each study
 * @param req
 * @param res
 * @param next
 */
export async function populationStudyQuery(req: IMRIRequest, res, next) {
    const { analyticsConnection } = req.dbConnections;
    const user = getUser(req);
    const language = user.lang;
    let filterBase64: string = req.query.mriquery;
    let releaseDate: string = req.query.releaseDate;

    const timestamp = (new Date()).valueOf();
    console.log(`time-analytics-svc-populationStudyQuery-${timestamp}`)
    console.time(`time-analytics-svc-populationStudyQuery-${timestamp}`)

    try {
        let body = filterBase64
            ? convertZlibBase64ToJson(filterBase64)
            : null || req.body;

        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        let bookmarkInputStr = JSON.stringify(body);

        body.language = language;
        // Ensure that the requested studies are valid
        const acceptedStudies = req.studiesDbMetadata.studies;
        const isInputStudiesAccepted = body.studies.every((id) =>
            acceptedStudies.some((obj) => {
                return obj.id === id;
            })
        );
        if (!isInputStudiesAccepted) {
            throw new Error("(In populationStudyQuery) Bad study ids input");
        }

        analyticsConnection.setCurrentUserToDbSession(
            user.userObject.userId,
            async (err, data) => {
                if (err) {
                    return console.error(err);
                }
                analyticsConnection.setTemporalSystemTimeToDbSession(
                    releaseDate,
                    async (err, data) => {
                        if (err) {
                            return console.error(err);
                        }
                        try {
                            const datasetIds = body.studies;
                            function _sendResult(err, result) {
                                if (err) {
                                    return res.status(500).send(
                                        MRIEndpointErrorHandler({
                                            err,
                                            language,
                                        })
                                    );
                                }
                                console.timeEnd(`time-analytics-svc-populationStudyQuery-${timestamp}`)
                                res.status(200).send(result);
                            }

                            if (body.filter) {
                                new PatientCountEndpoint(analyticsConnection)
                                    .processMultipleStudyRequest(
                                        req,
                                        datasetIds,
                                        bookmarkInputStr,
                                        language
                                    )
                                    .then((res) => _sendResult(null, res))
                                    .catch((err) => _sendResult(err, null));
                            } else {
                                new PatientCountEndpoint(analyticsConnection)
                                    .processMultipleStudyRequest(
                                        req,
                                        datasetIds,
                                        body,
                                        language
                                    )
                                    .then((res) => _sendResult(null, res))
                                    .catch((err) => _sendResult(err, null));
                            }
                        } catch (err) {
                            console.timeEnd(`time-query-svc-populationStudyQuery-${timestamp}`)
                            return res
                                .status(500)
                                .send(
                                    MRIEndpointErrorHandler({ err, language })
                                );
                        }
                    }
                );
            }
        );
    } catch (err) {
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}

/**
 * Retrieves list of cohort definitions
 * @param req
 * @param res
 * @param next
 */
export async function populationQuery(req: IMRIRequest, res, next) {
    const { analyticsConnection } = req.dbConnections;
    const user = getUser(req);
    const language = user.lang;
    let chartType: string = req.params.chartType;
    let dataFormat: string = req.params.dataFormat;
    let filterBase64: string = req.query.mriquery;
    let releaseDate: string = req.query.releaseDate;

    const timestamp = (new Date()).valueOf();
    console.log(`time-analytics-svc-populationQuery-${timestamp}`)

    try {
        let body = filterBase64
            ? convertZlibBase64ToJson(filterBase64)
            : null || req.body;

        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        let bookmarkInputStr = JSON.stringify(body);

        body.language = language;

        if (body.cohortDefinition && body.cohortDefinition.configData) {
            body.configData = body.cohortDefinition.configData;
        }

        analyticsConnection.setCurrentUserToDbSession(
            user.userObject.userId,
            async (err, data) => {
                if (err) {
                    return console.error(err);
                }
                analyticsConnection.setTemporalSystemTimeToDbSession(
                    releaseDate,
                    async (err, data) => {
                        if (err) {
                            return console.error(err);
                        }
                        let configData = Array.isArray(body)
                            ? body[0].configData
                            : body.configData;
                        if (!configData) {
                            let configMetadata = Array.isArray(body)
                                ? body[0].filter.configMetadata
                                : body.filter.configMetadata;
                            configData = {
                                configId: configMetadata.id,
                                configVersion: configMetadata.version,
                            };
                        }

                        try {
                            const configId = req.paConfigId;
                            const configVersion = req.paConfigVersion;
                            const datasetId = body.datasetId;

                            let sFilename: string =
                                <string>req.query.name ||
                                "MRI_CSV_" + new Date().toISOString() + ".csv";
                            function _sendResult(err, result) {
                                if (err) {
                                    return res.status(500).send(
                                        MRIEndpointErrorHandler({
                                            err,
                                            language,
                                        })
                                    );
                                }
                                console.timeEnd(`time-analytics-svc-populationQuery-${timestamp}`)
                                res.status(200).send(result);
                            }
                            function _sendResultCSV(err, result) {
                                if (err instanceof DBError) {
                                    _sendResult(err, null);
                                } else {
                                    const hasEmptyRawResult =
                                        result?.rawResult &&
                                        !result.rawResult?.data?.length;
                                    if (result === "" || hasEmptyRawResult) {
                                        result =
                                            chartType === "patientlist"
                                                ? "MRI_PA_NO_MATCHING_PATIENTS_GUARDED"
                                                : "MRI_PA_NO_MATCHING_PATIENTS";
                                    }
                                    res.set({
                                        "content-disposition":
                                            "attachment; filename=" + sFilename,
                                        "content-Type": "text/csv",
                                    });
                                    _sendResult(err, _processResult(result));
                                }
                            }
                            console.time(`time-analytics-svc-populationQuery-${timestamp}`)
                            switch (dataFormat) {
                                case "csv":
                                    switch (chartType) {
                                        case "barchart":
                                            sFilename =
                                                <string>req.query.name ||
                                                "PatientAnalytics_Bar-Chart_" +
                                                    new Date().toISOString() +
                                                    ".csv";
                                            await new StackedBarchartEndpoint(
                                                analyticsConnection
                                            )
                                                .processRequestCSV(
                                                    req,
                                                    configId,
                                                    configVersion,
                                                    datasetId,
                                                    bookmarkInputStr,
                                                    language
                                                )
                                                .then((res) =>
                                                    _sendResultCSV(null, res)
                                                )
                                                .catch((err) =>
                                                    _sendResultCSV(err, null)
                                                );
                                            break;
                                        default:
                                            next(
                                                new Error(
                                                    "MRI_PA_INVALID_ACTION: " +
                                                        chartType
                                                ),
                                                null
                                            );
                                            break;
                                    }
                                    break;
                                case "json":
                                default:
                                    switch (chartType) {
                                        case "barchart":
                                            await new StackedBarchartEndpoint(
                                                analyticsConnection
                                            )
                                                .processRequest(
                                                    req,
                                                    configId,
                                                    configVersion,
                                                    datasetId,
                                                    bookmarkInputStr,
                                                    language
                                                )
                                                .then((res) =>
                                                    _sendResult(null, res)
                                                )
                                                .catch((err) =>
                                                    _sendResult(err, null)
                                                );
                                            break;
                                        case "patientlist":
                                            new PatientListEndpoint(
                                                analyticsConnection,
                                                false
                                            )
                                                .processRequest2(
                                                    req,
                                                    configId,
                                                    configVersion,
                                                    datasetId,
                                                    bookmarkInputStr,
                                                    language
                                                )
                                                .then((res) =>
                                                    _sendResult(null, res)
                                                )
                                                .catch((err) =>
                                                    _sendResult(err, null)
                                                );
                                            break;
                                        case "patientcount":
                                            if (body.filter) {
                                                new PatientCountEndpoint(
                                                    analyticsConnection
                                                )
                                                    .processRequest(
                                                        req,
                                                        configId,
                                                        configVersion,
                                                        datasetId,
                                                        bookmarkInputStr,
                                                        language
                                                    )
                                                    .then((res) =>
                                                        _sendResult(null, res)
                                                    )
                                                    .catch((err) =>
                                                        _sendResult(err, null)
                                                    );
                                            } else {
                                                new PatientCountEndpoint(
                                                    analyticsConnection
                                                )
                                                    .processRequest(
                                                        req,
                                                        configId,
                                                        configVersion,
                                                        datasetId,
                                                        body,
                                                        language
                                                    )
                                                    .then((res) =>
                                                        _sendResult(null, res)
                                                    )
                                                    .catch((err) =>
                                                        _sendResult(err, null)
                                                    );
                                            }
                                            break;
                                        default:
                                            next(
                                                new Error(
                                                    "MRI_PA_INVALID_ACTION: " +
                                                        chartType
                                                ),
                                                null
                                            );
                                            break;
                                    }
                                    break;
                            }
                        } catch (err) {
                            console.timeEnd(`time-analytics-svc-populationQuery-${timestamp}`)
                            return res
                                .status(500)
                                .send(
                                    MRIEndpointErrorHandler({ err, language })
                                );
                        }
                    }
                );
            }
        );
    } catch (err) {
        res.status(500).send(MRIEndpointErrorHandler({ err, language }));
    }
}
