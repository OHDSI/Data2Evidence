import { createEndpointFromRequest } from "../../mri/endpoint/CreatePluginEndpoint";
import { Connection as connLib } from "@alp/alp-base-utils";
import { Logger, getUser } from "@alp/alp-base-utils";
import CreateLogger = Logger.CreateLogger;
import CallBackInterface = connLib.CallBackInterface;
import {
    PluginEndpointResultType,
    PluginEndpointStreamResultType,
    PluginEndpointFormatType,
    RecontactPatientListRequestType,
    IMRIRequest,
    PluginEndpointRequestType,
    CohortDefinitionType,
    StudyDbMetadata,
} from "../../types";
import {
    getJsonWalkFunction,
    convertZlibBase64ToJson,
} from "@alp/alp-base-utils";
import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import TrexCsvStreamWriter from "../../utils/TrexCsvStreamWriter";
import csvWriter from "csv-write-stream";
import * as crypto from "crypto";
import * as parquet from "parquetjs";
import { pipeline } from "stream";
import PortalServerAPI from "../PortalServerAPI";
import PsConfigServerAPI from "../PsConfigServerAPI";
import { PluginEndpoint } from "../../mri/endpoint/PluginEndpoint";

let log = CreateLogger("analytics-log");

let emptyResult: PluginEndpointResultType = {
    sql: "",
    data: [],
    totalPatientCount: 0,
};

const emptyStreamResult: PluginEndpointStreamResultType = {
    entity: "",
    data: undefined,
};

async function retrieveDataset(
    req: IMRIRequest,
    format: PluginEndpointFormatType,
    callback: CallBackInterface
) {
    const fileName = req.fileName;
    const language = getUser(req).lang;
    let query;
    if (req.query.query) {
        query = (req.query.query as string).split(",");
    }
    let releaseDate: string = req.query.mriquery.releaseDate;
    let patientId: string = req.query.patientId ? req.query.patientId : null;
    const { analyticsConnection } = req.dbConnections;

    analyticsConnection.setTemporalSystemTimeToDbSession(
        releaseDate,
        async (err, data) => {
            if (err) {
                return console.error(err);
            }
            try {
                const { cohortDefinition, datasetId, pluginEndpoint } =
                    await createEndpointFromRequest(req);
                pluginEndpoint.setRequest(req);
                const pluginResult = await pluginEndpoint.retrieveData({
                    cohortDefinition,
                    datasetId,
                    language,
                    dataFormat: format,
                    requestQuery: query,
                    patientId: patientId,
                    auditLogChannelName:
                        req.usage === "EXPORT"
                            ? "MRI Pt. List Exp"
                            : "MRI Pt. List",
                });

                callback(null, pluginResult);
            } catch (err) {
                callback(err, emptyResult);
            }
        }
    );
}

async function streamDataset(req: IMRIRequest, callback: CallBackInterface) {
    let releaseDate: string = req.query.releaseDate;
    const { analyticsConnection } = req.dbConnections;

    let { datasetId }: PluginEndpointRequestType = {
        ...convertZlibBase64ToJson(req.query.mriquery),
    };

    analyticsConnection.setTemporalSystemTimeToDbSession(
        releaseDate,
        async (err, data) => {
            if (err) {
                return console.error(err);
            }
            try {
                const { cohortDefinition, pluginEndpoint } =
                    await createEndpointFromRequest(req);
                pluginEndpoint.setRequest(req);
                const pluginResult = await pluginEndpoint.retrieveDataStream({
                    cohortDefinition,
                    auditLogChannelName: "MRI Pt. List Stream",
                    datasetId,
                });

                callback(null, pluginResult);
            } catch (err) {
                callback(err, emptyStreamResult);
            }
        }
    );
}

const maplist = {
    STRING: "UTF8",
    INT: "INT64",
    VAL32: "INT64",
    VAL64: "INT64",
};

async function getParquetSchema(tableMetadata: []) {
    const fields = tableMetadata.reduce((acc, { columnName, typeName }) => {
        return {
            ...acc,
            [columnName]: { type: maplist[typeName], optional: true },
        };
    }, {});

    let schema = new parquet.ParquetSchema(fields);
    return schema;
}

/**
 * Retrieves patient and corresponding interaction datasets by providing cohort definition and required data format (csv, json)
 * @param req
 * @param res
 * @param next
 */
export function retrieveDatasetInFormat(req: IMRIRequest, res) {
    const language = getUser(req).lang;
    let format = req.query.dataFormat ? req.query.dataFormat : "json";
    let sendResponse;

    if (format.toUpperCase() === "CSV") {
        req.usage = "EXPORT";
        sendResponse = (result) => {
            if (result.data && result.data.length === 0) {
                return res.status(200).json(result.noDataReason);
            }
            return res.status(200).json(result);
        };
    } else {
        sendResponse = (result) => {
            return res.status(200).json(result);
        };
    }
    retrieveDataset(req, format, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send(MRIEndpointErrorHandler({ err, language }));
        } else {
            sendResponse(result);
        }
    });
}

/**
 * Retrieve patient or corresponding interaction dataset stream by providing cohort definition
 * Always return a single dataset stream per request
 * @param req
 * @param res
 * @param next
 */
export function retrieveDatasetStream(req: IMRIRequest, res) {
    const language = getUser(req).lang;
    let format = req.query.dataFormat ? req.query.dataFormat : "csv";
    let returnOnlyCount = req.query.returnOnlyPatientCount
        ? JSON.parse(req.query.returnOnlyPatientCount.toLowerCase())
        : false;

    const sendPatientCountResponse = async (
        result: PluginEndpointStreamResultType
    ) => {
        if (result.noDataReason) {
            return res.status(200).json(result);
        } else {
            let rowCount = 0;
            let rows = [];

            if (
                result.data.constructor.prototype.toString() ===
                "[object AsyncGenerator]"
            ) {
                for await (const data of result.data) {
                    rowCount++; //Seems to return 1 object at a time
                }
                //Detach Native DB
                await req.dbConnections.analyticsConnection.deactivate_nativedb_communication(
                    req.dbConnections.analyticsConnection.conn[
                        "duckdbNativeDBName"
                    ]
                );
                let response = {
                    entity: result.entity,
                    rowCount: rowCount,
                };
                res.status(200).send(response);
            } else {
                result.data.on("readable", () => {
                    let data;
                    while (true) {
                        data = result.data.read();
                        if (null !== data) {
                            rows.push(data);
                            rowCount += rows.length;
                            rows = [];
                        } else {
                            break;
                        }
                    }
                });

                result.data.on("end", () => {
                    log.debug(
                        `total number of rows for ${result.entity}: ${rowCount}`
                    );
                    let response = {
                        entity: result.entity,
                        rowCount: rowCount,
                    };
                    res.status(200).send(response);
                });
            }
        }
    };
    const sendCSVResponse = (result: PluginEndpointStreamResultType) => {
        if (result.noDataReason) {
            return res.status(200).json(result);
        } else {
            let entityNameInParts = result.entity.split(".");
            let lastPartOfEntityName =
                entityNameInParts[entityNameInParts.length - 1].toLowerCase();
            let lastPartOfEntityNameInCamelCase = lastPartOfEntityName.replace(
                /[a-z?]/,
                lastPartOfEntityName[0].toUpperCase()
            );

            req.fileName = `${lastPartOfEntityNameInCamelCase}-List_${new Date().toISOString()}.csv`;

            res.setHeader(
                "Content-Disposition",
                "attachment; filename=" + req.fileName
            );
            res.setHeader("Content-Type", "text/csv");

            let csvStreamTransform;
            if (
                result.data.constructor.prototype.toString() ===
                "[object ReadableStream]"
            ) {
                // Trex connection returns stream results as a ReadableStream
                const trexCsvStreamWriter = new TrexCsvStreamWriter();
                csvStreamTransform = trexCsvStreamWriter;
            } else {
                const csvStreamWriter: NodeJS.ReadWriteStream = csvWriter();
                csvStreamWriter.on("drain", () => {
                    log.debug("DRAIN csvStreamWriter");
                });
                csvStreamWriter.on("error", (err) => {
                    log.error(
                        `${req.fileName}==========csvStreamWriter error=========`
                    );
                    log.error(err);
                });
                csvStreamTransform = csvStreamWriter;
            }

            //Exception for duckdb
            if (
                result.data.constructor.prototype.toString() !==
                    "[object AsyncGenerator]" &&
                result.data.constructor.prototype.toString() !==
                    "[object ReadableStream]"
            ) {
                result.data.on("error", (err) => {
                    log.error(
                        `${req.fileName}==========data2 finish error=========`
                    );
                    log.error(err);
                });
            }

            res.on("error", (err) => {
                log.error(`${req.fileName}==========res error=========`);
                log.error(err);
            });

            pipeline(result.data, csvStreamTransform, res, async (err) => {
                if (
                    result.data.constructor.prototype.toString() ===
                    "[object AsyncGenerator]"
                ) {
                    //Detach Native DB -> At this point duckdb complains connection is closed already (Since res.end might have been called already)
                }
                if (err) {
                    console.error("Pipeline failed", err);
                    console.error(err.stack);
                } else {
                    res.end();
                }
            });
        }
    };

    const sendParquetResponse = async (
        result: PluginEndpointStreamResultType
    ) => {
        if (result.noDataReason) {
            return res.status(200).json(result);
        } else {
            let entityNameInParts = result.entity.split(".");
            let lastPartOfEntityName =
                entityNameInParts[entityNameInParts.length - 1].toLowerCase();
            let lastPartOfEntityNameInCamelCase = lastPartOfEntityName.replace(
                /[a-z?]/,
                lastPartOfEntityName[0].toUpperCase()
            );

            let data: any = result.data;
            let tableMetadata = data.resultset.getColumnInfo();
            let schema = await getParquetSchema(tableMetadata);
            let parquetTransform = new parquet.ParquetTransformer(schema);
            req.fileName = `${lastPartOfEntityNameInCamelCase}-List_${new Date().toISOString()}.parquet`;
            res.setHeader(
                "Content-Disposition",
                "attachment; filename=" + req.fileName
            );
            res.setHeader("Content-Type", "text/plain");

            result.data
                .pipe(parquetTransform)
                .pipe(res)
                .on("finish", () => {
                    return res.status(200);
                });
        }
    };

    streamDataset(req, async (err, result: PluginEndpointStreamResultType) => {
        if (err) {
            log.error(err);
            return res
                .status(500)
                .send(MRIEndpointErrorHandler({ err, language }));
        }
        if (returnOnlyCount) {
            await sendPatientCountResponse(result);
        } else if (format.toUpperCase() === "PARQUET") {
            sendParquetResponse(result);
        } else {
            sendCSVResponse(result);
        }
    });
}

/**
 * Retrieve patient data by providing cohort definition
 * Always return the data in an encrypted format
 * @param req
 * @param res
 * @param next
 */
export async function getRecontactPatientList(req: IMRIRequest, res) {
    const language = getUser(req).lang;
    let format = "json";
    let response;
    let body: RecontactPatientListRequestType = {
        ...convertZlibBase64ToJson(req.query.mriquery),
    };
    let cohortName = body.name;
    try {
        const study = await new PortalServerAPI().getStudy(
            req.headers.authorization,
            body.datasetId
        );
        const { attributes } = study;
        let queryParams = formatQueryParams(
            body.cohortDefinition.cards.content
        );
        let oVersion = attributes.find((a) => a.attributeId === "version");
        let datasetVersion = oVersion ? oVersion.value : "";

        retrieveDataset(
            req,
            <PluginEndpointFormatType>format,
            (err, result) => {
                if (err) {
                    log.debug(err);
                    return res
                        .status(500)
                        .send(MRIEndpointErrorHandler({ err, language }));
                }
                let data = result.data;
                let pseudonymIds = data.map((p) => p[`patient.attributes.pid`]);
                let distribution = {
                    gender: genderDistribution(data),
                    age: ageDistribution(data),
                };
                response = JSON.stringify({
                    cohort: {
                        name: cohortName,
                        datasetVersion,
                        pseudonymIds,
                        queryParams,
                        distribution,
                    },
                });

                return res.status(200).send(encryptData(response));
            }
        );
    } catch (err) {
        log.debug(err);
        return res.status(500).send(err);
    }
}

/**
 * Retrieve patient data by providing cohort definition
 * Always return the data in an encrypted format
 * @param req
 * @param res
 * @param next
 */
export async function getPatientSummary(req: IMRIRequest, res) {
    const language = getUser(req).lang;
    let format = "json";
    try {
        retrieveDataset(
            req,
            <PluginEndpointFormatType>format,
            (err, result) => {
                if (err) {
                    log.debug(err);
                    return res
                        .status(500)
                        .send(MRIEndpointErrorHandler({ err, language }));
                }
                let data = result.data;
                let patientData = data[0].data[0];
                let response = {
                    masterData: {
                        attributes: {},
                    },
                    interactionTypes: {},
                };
                Object.keys(patientData).forEach((key) => {
                    if (key.indexOf("patient.attributes.") > -1) {
                        response.masterData.attributes[
                            key.replace(`patient.attributes.`, "")
                        ] = [patientData[key]];
                    } else if (Array.isArray(patientData[key])) {
                        response.interactionTypes[key] = patientData[key].map(
                            (obj) => {
                                let attributes = {};
                                Object.keys(obj).forEach((k) => {
                                    attributes[
                                        k.replace(`${key}.attributes.`, "")
                                    ] = [obj[k]];
                                });
                                return {
                                    attributes,
                                };
                            }
                        );
                    }
                });
                return res.status(200).send(JSON.stringify(response));
            }
        );
    } catch (err) {
        log.debug(err);
        return res.status(500).send(err);
    }
}

function genderDistribution(data) {
    let distribution = [
        { gender: "MALE", count: 0 },
        { gender: "FEMALE", count: 0 },
        { gender: "OTHER", count: 0 },
    ];
    data.forEach((p) => {
        switch (p[`patient.attributes.Gender`]) {
            case "MALE":
            case "M":
                distribution[0][`count`]++;
                break;
            case "FEMALE":
            case "F":
                distribution[1][`count`]++;
                break;
            default:
                distribution[2][`count`]++;
        }
    });
    return distribution;
}

function ageDistribution(data) {
    const d = new Date();
    let distribution = [
        { min: 0, max: 9, count: 0 },
        { min: 10, max: 19, count: 0 },
        { min: 20, max: 29, count: 0 },
        { min: 30, max: 39, count: 0 },
        { min: 40, max: 49, count: 0 },
        { min: 50, max: 59, count: 0 },
        { min: 60, max: 69, count: 0 },
        { min: 70, max: 79, count: 0 },
        { min: 80, max: 89, count: 0 },
        { min: 90, count: 0 },
        { count: 0 },
    ];
    data.forEach((p) => {
        try {
            const age =
                d.getUTCFullYear() - p[`patient.attributes.yearOfBirth`];
            const rangeIndex = Math.floor(age / 10);
            rangeIndex >= 9
                ? distribution[9][`count`]++
                : distribution[rangeIndex][`count`]++;
        } catch (error) {
            distribution[10][`count`]++;
        }
    });
    return distribution;
}

function formatQueryParams(boolContainers) {
    const returnObj = [];
    try {
        for (let i = 0; i < boolContainers.length; i += 1) {
            if (boolContainers[i].content.length > 0) {
                const content = [];
                // filtercard
                for (
                    let ii = 0;
                    ii < boolContainers[i].content.length;
                    ii += 1
                ) {
                    const visibleAttributes = [];
                    let attributes = boolContainers[i].content[ii].attributes;
                    let isExcluded = false;
                    let filterCardName = boolContainers[i].content[ii].name;
                    // Excluded filter cards have attributes one level further down
                    if (!attributes) {
                        attributes =
                            boolContainers[i].content[ii].content[0].attributes;
                        isExcluded = true;
                        filterCardName =
                            boolContainers[i].content[ii].content[0].name;
                    }
                    for (
                        let iii = 0;
                        iii < attributes.content.length;
                        iii += 1
                    ) {
                        if (
                            attributes.content[iii].constraints.content &&
                            attributes.content[iii].constraints.content.length >
                                0
                        ) {
                            const name = attributes.content[iii].configPath;
                            const visibleConstraints = [];
                            const constraints =
                                attributes.content[iii].constraints;
                            for (
                                let iv = 0;
                                iv < constraints.content.length;
                                iv += 1
                            ) {
                                if (constraints.content[iv].content) {
                                    for (
                                        let v = 0;
                                        v <
                                        constraints.content[iv].content.length;
                                        v += 1
                                    ) {
                                        visibleConstraints.push(
                                            `${constraints.content[iv].content[v].operator}${constraints.content[iv].content[v].value}`
                                        );
                                    }
                                } else if (
                                    constraints.content[iv].operator === "="
                                ) {
                                    // NOTE: hardcoded "sProcess" to identify location constraint in genetic filtercard
                                    // TODO: remove hardcoded "sProcess" and clean code to handle such exceptions neatly
                                    try {
                                        const val = JSON.parse(
                                            constraints.content[iv].value
                                        );
                                        if (
                                            typeof val === "object" &&
                                            val.hasOwnProperty("sProcess")
                                        ) {
                                            visibleConstraints.push(val.text);
                                        } else {
                                            visibleConstraints.push(
                                                constraints.content[iv].value
                                            );
                                        }
                                    } catch (e) {
                                        visibleConstraints.push(
                                            constraints.content[iv].value
                                        );
                                    }
                                } else {
                                    visibleConstraints.push(
                                        `${constraints.content[iv].operator}${constraints.content[iv].value}`
                                    );
                                }
                            }
                            const attributeObj = {
                                name,
                                constraints: visibleConstraints,
                            };
                            visibleAttributes.push(attributeObj);
                        }
                    }
                    const filterCardObj = {
                        attributes: visibleAttributes,
                        isExcluded,
                        name: filterCardName,
                    };
                    content.push(filterCardObj);
                }
                const boolContainerObj = { content };
                returnObj.push(boolContainerObj);
            }
        }
    } finally {
    }
    return returnObj;
}

function encryptData(data) {
    let nonce = crypto.randomBytes(12); // 96bit key
    let key = Buffer.alloc(32, process.env.MRI_RECONTACT_ENCRYPT_KEY); // 256bit key
    let cipher = crypto.createCipheriv("chacha20-poly1305", key, nonce, {
        authTagLength: 16,
    });
    const ciphertext = cipher.update(data, "utf8", "hex");
    cipher.final();
    const tag = cipher.getAuthTag().toString("hex");

    return `${nonce.toString("hex")}${ciphertext}${tag}`;
}

/**
 *
 * Retrieves patient data
 * @export
 * @param {any} req
 * @param {any} res
 */
export async function getSinglePatientRoute(req, res) {
    const dataFormat = req.query.dataFormat ? req.query.dataFormat : "json";
    const requestInteractionTypes: string[] = req.query.interactionTypes
        ? req.query.interactionTypes
        : null;
    const patientId = req.params.patientId;
    const configId = req.paConfigId;
    const configVersion = req.paConfigVersion;
    const datasetId = req.query.datasetId;
    const { analyticsConnection } = req.dbConnections;
    const lang = getUser(req).lang;

    if (!patientId) {
        return res.status(500).send("patient id is required");
    }
    try {
        const result = await getSinglePatient({
            req,
            dataFormat,
            requestInteractionTypes,
            patientId,
            configId,
            configVersion,
            lang,
            analyticsConnection,
            datasetId,
        });

        return res.status(200).json(result);
    } catch (err) {
        log.debug(err);
        return res.status(500).send(err);
    }
}

export async function getSinglePatient({
    req,
    dataFormat,
    requestInteractionTypes,
    patientId,
    configId,
    configVersion,
    lang,
    analyticsConnection,
    datasetId,
}): Promise<PluginEndpointResultType> {
    return new Promise<PluginEndpointResultType>(async (resolve, reject) => {
        try {
            const configData = {
                configId,
                configVersion,
            };
            const psConfigServerAPI = new PsConfigServerAPI();
            const accessToken =
                await psConfigServerAPI.getClientCredentialsToken();
            const cdmConfig = await psConfigServerAPI.getCDWConfig(
                { action: "getCDWConfig", configId, configVersion, lang },
                accessToken
            );

            let requestWalker = getJsonWalkFunction(cdmConfig);
            const masterData = requestWalker("patient.attributes.*").map(
                ({ path }) => path
            );

            // get interaction types from request or get from dependent config
            const interactionTypes = Array.isArray(requestInteractionTypes)
                ? requestInteractionTypes.reduce((list, interaction) => {
                      list.push(
                          ...requestWalker(`${interaction}.attributes.*`).map(
                              ({ path }) => path
                          )
                      );
                      return list;
                  }, [])
                : requestWalker("**.interactions.**.attributes.*").map(
                      ({ path }) => path
                  );

            let cohortDefinition: CohortDefinitionType = {
                cards: { content: [{ content: [] }, { content: [] }] },
                axes: [],
                limit: undefined,
                offset: undefined,
                columns: [...masterData, ...interactionTypes].map((path) => ({
                    configPath: path,
                    order: "",
                    seq: 0,
                })),
                configData,
            };
            const studyMetadata: StudyDbMetadata =
                req.studiesDbMetadata.studies.find((o) => o.id === datasetId);
            const studySchemaName = studyMetadata?.schemaName;
            if (studySchemaName) {
                //Use schemaname from analyticsConnection, since duckdb doesnt follow the same naming convention as other dbs
                let pluginEndpoint = new PluginEndpoint(
                    analyticsConnection,
                    analyticsConnection.schemaName
                );
                pluginEndpoint.setRequest(req);
                let pluginResult: PluginEndpointResultType = <
                    PluginEndpointResultType
                >await pluginEndpoint.retrieveData({
                    cohortDefinition,
                    datasetId,
                    language: lang,
                    dataFormat: dataFormat,
                    patientId: patientId,
                    auditLogChannelName: "Patient Summary",
                });
                return resolve(pluginResult);
            } else {
                throw "Invalid dataset Id";
            }
        } catch (err) {
            log.debug(err);
            return reject(err);
        }
    });
}
