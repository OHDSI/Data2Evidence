import MRIEndpointErrorHandler from "../../utils/MRIEndpointErrorHandler";
import { IMRIRequest } from "../../types";
import { QueryGenSvc } from "../../svc/QueryGenSvc";
import * as settingsLib from "../../qe/settings/Settings";
import { Settings } from "../../qe/settings/Settings";
import { callStudyMRIConfig } from "../../proxy/ConfigSvcProxy";
import { MRIEndpointResultType } from "../../types";
import * as utilsLib from "@alp/alp-base-utils";
import { getConfigElement } from "../request_handler/RequestIterator";
const log = utilsLib.Logger.CreateLogger("query-gen-log");
const utils = utilsLib.utils;
import { bookmarkToIFRBackend } from "../../utils/formatter/BookmarkFormatter";
import { updateIfrWithConcepts } from "../../utils/formatter/ConceptSetToConceptConverter";

/**
 * Retrieves list of cohort definitions
 * @param req
 * @param res
 * @param next
 */
export async function generateQuery(req: IMRIRequest, res, next) {
    log.addRequestCorrelationID(req);
    const emptyResult: MRIEndpointResultType = {
        sql: "",
        data: [],
        measures: [],
        categories: [],
        totalPatientCount: 0,
    };
    const timestamp = (new Date()).valueOf();
    let result: MRIEndpointResultType;
    try {
        const body =
            req.query && req.query.data
                ? JSON.parse(<any>req.query.data)
                : req.body;
        const queryParams = body.queryParams;
        // log.debug(`Input params:\n${JSON.stringify(queryParams)}`);
        const configId = queryParams.configId;
        const configVersion = queryParams.configVersion;
        const datasetId = queryParams.datasetId;
        const queryType = queryParams.queryType;
        const bookmarkInputStr = queryParams.bookmarkInputStr;
        let ifrRequest = queryParams.ifrRequest;
        const language = "en"; //(queryParams.language) ?  queryParams.language : "en";
        const requestQuery = queryParams.requestQuery;
        const metadataType = queryParams.metadataType;
        const annotated = queryParams.annotated;
        const postFilters = queryParams.postFilters;
        const insert = queryParams.insert;
        const pluginOptionalParams = {
            requestQuery,
            metadataType,
            annotated,
            postFilters,
            insert,
        };

        // get backend config for the given configId, configVersion & datasetId
        const configParams = {
            req,
            action: "getBackendConfig",
            configId,
            configVersion,
            lang: language,
            datasetId,
        };
        const configResponse = await callStudyMRIConfig(configParams);
        const config = configResponse.config;

        if (!ifrRequest) {
            if (queryType === "patientdetail") {
                // for Patient list, IFRRequest is already created in UI, hence no need to use BookmarkFormatter
                ifrRequest = JSON.parse(bookmarkInputStr);
            } else {
                // For the the other flows (i.e. except PatientListEndpoint & PluginEndpoint) where the IFRRequest should be created using the BookmarkFormatter
                ifrRequest = await bookmarkToIFRBackend(bookmarkInputStr);
            }
        } else if (queryType === "plugin") {

            // For PluginEndpoint flow, IFRRequest is of type CohortDefinitionType
            if (ifrRequest.cards && ifrRequest.configData) {
                const convertedFilter = await bookmarkToIFRBackend({
                    filter: {
                        cards: ifrRequest.cards,
                        configMetadata: {
                            id: ifrRequest.configData.configId,
                            version: ifrRequest.configData.configVersion,
                        },
                    },
                });
                ifrRequest = {
                    ...ifrRequest,
                    ...convertedFilter,
                };
            } else {
                throw new Error(`Invalid IFRRequest from PluginEndpoint!`);
            }
        }

        validateChartEnabled(res, queryType, result, emptyResult, config);
        validateRequest(queryType, ifrRequest, config);

        const censoringThreshold = getCensoringThreshold(config);

        // get placeholderTableMap
        let userSpecificSettings = new Settings().initAdvancedSettings(
            config.advancedSettings
        );
        let placeholderMap: settingsLib.PholderTableMapType =
            userSpecificSettings.getPlaceholderMap();
        // placeholderMap = placeholderMap || Settings.getDimPlaceholderForAttribute();

        const ifrWithConceptSetConcepts = await updateIfrWithConcepts(
            config,
            ifrRequest,
            datasetId,
            req.headers.authorization
        );

        // generate query
        const queryResponse = await new QueryGenSvc(
            queryType,
            ifrWithConceptSetConcepts,
            config,
            userSpecificSettings,
            placeholderMap,
            pluginOptionalParams,
            censoringThreshold
        ).generateQuery();


        // set cdm config metadata
        queryResponse.cdmConfigMetaData.id =
            configResponse.meta.dependentConfig.configId;
        queryResponse.cdmConfigMetaData.version =
            configResponse.meta.dependentConfig.configVersion;

        // log.debug(`Query response:\n${JSON.stringify(queryResponse)}`);
        res.status(200).send(queryResponse);
    } catch (err) {
        log.enrichErrorWithRequestCorrelationID(err, req);
        console.error(`Error in generating query (${err.stack})!`);
        res.status(500).send(
            MRIEndpointErrorHandler({
                err: {
                    name: "query-gen-log",
                    message: `Error in generating query (${err.stack})!`,
                },
                language: "en",
            })
        );
    }
}

function validateChartEnabled(res, queryType, result, emptyResult, config) {
    result = emptyResult;
    result.messageKey = "ERROR_CHART_IS_DISABLED";
    result.messageLevel = "Warning";
    switch (queryType) {
        case "aggquery":
            if (!config.chartOptions.stacked.enabled) {
                this.logAccessError([result.messageKey, "STACKEDBARCHART"]);
                res.status(200).send(result);
            }
            return;
        case "boxplot":
            if (!config.chartOptions.boxplot.enabled) {
                this.logAccessError([result.messageKey, "BOXPLOT"]);
                res.status(200).send(result);
            }
            return;
        case "kmquery":
            if (!config.chartOptions.km.enabled) {
                this.logAccessError([result.messageKey, "KM"]);
                res.status(200).send(result);
            }
            return;
        case "patientdetail":
            if (!config.chartOptions.list.enabled) {
                this.logAccessError([result.messageKey, "PATIENTLIST"]);
                res.status(200).send(result);
            }
            return;
        default:
    }
}

function validateRequest(queryType, request, config) {
    let req;
    if (request.constructor !== Array) {
        req = [request];
    } else {
        req = request;
    }

    switch (queryType) {
        case "aggquery":
            assertValidRequest(req, config);
            return;
        default:
    }
}

function assertValidRequest(request, config) {
    assertIsObject(config);
    assertIsArray(request);
    request.forEach((req) => {
        assertIsObject(req);
        assertAggregationAllowed(req, config);
    });
}

function isNumericalAttr(config, requestPath) {
    let attrConfig = getConfigElement(config, requestPath);
    if (attrConfig && attrConfig.type === "num") {
        return true;
    }
    return false;
}

function assertAggregationAllowed(request, config) {
    let allowedAggregations = [
        "countDistinct",
        "count",
        "avg",
        "max",
        "min",
        "sum",
    ];
    let numericalAggregations = ["avg", "max", "min"];
    let requestWalker = utilsLib.getJsonWalkFunction(request);
    let requestAttributes = requestWalker("**.attributes.*");

    requestAttributes.forEach((attribute) => {
        attribute.obj.forEach((filter) => {
            if (filter.hasOwnProperty("aggregation")) {
                utilsLib.assert(
                    allowedAggregations.indexOf(filter.aggregation) >= 0,
                    "Aggregation not allowed"
                );
                if (numericalAggregations.indexOf(filter.aggregation) >= 0) {
                    utilsLib.assert(
                        isNumericalAttr(config, attribute.path),
                        "Attribute needs to be numerical"
                    );
                }
            }
        });
    });
}

function assertIsObject(obj) {
    utilsLib.assert(utilsLib.isObject(obj), "Expected an object");
}
function assertIsArray(obj) {
    utilsLib.assert(Array.isArray(obj), "Expected an array");
}

function getCensoringThreshold(config: any): string {
    // TODO: discuss where the censoring threshold should be stored
    return utils.isNotNullOrEmpty(config.chartOptions.minCohortSize) &&
        !Number.isNaN(Number(config.chartOptions.minCohortSize))
        ? config.chartOptions.minCohortSize
        : "10";
}
