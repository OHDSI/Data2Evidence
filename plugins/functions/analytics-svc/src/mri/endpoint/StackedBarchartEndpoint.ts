/**
 * Request processor for the aggregation endpoint (e.g. for the bar-chart).
 */
import * as utilsLib from "@alp/alp-base-utils";
import {
    Connection as connLib,
    QueryObject as qo,
    EnvVarUtils,
    Logger,
} from "@alp/alp-base-utils";
import {
    MRIEndpointResultType,
    QuerySvcResultType,
    MRIEndpointResultMeasureType,
    MRIEndpointResultCategoryType,
} from "../../types";
import {
    BaseQueryEngineEndpoint,
    ResultConsumerType,
} from "./BaseQueryEngineEndpoint";
import { generateQuery } from "../../utils/QueryGenSvcProxy";
import QueryObject = qo.QueryObject;
import ConnectionInterface = connLib.ConnectionInterface;
import { postProcessBarChartData } from "../../utils/PostProcessBarChartData";

const log = Logger.CreateLogger("mri-log");
export class StackedBarchartEndpoint extends BaseQueryEngineEndpoint {
    constructor(connection: ConnectionInterface, unitTestMode?: boolean) {
        super(connection, unitTestMode ? unitTestMode : false);
        this.EndpointResultConsumer = ResultConsumerType.UI;
    }

    public isEmptyRequest(request) {
        if (utilsLib.deepEquals(request, { patient: {} })) {
            return true;
        }
        if (utilsLib.deepEquals(request, {})) {
            return true;
        }
        return false;
    }

    public processRequest(
        req,
        configId,
        configVersion,
        datasetId,
        bookmarkInputStr,
        language
    ): Promise<MRIEndpointResultType> {
        let emptyResult: MRIEndpointResultType = {
            sql: "",
            data: [],
            measures: [],
            categories: [],
            totalPatientCount: 0,
        };
        return new Promise<MRIEndpointResultType>(async (resolve, reject) => {
            try {
                const querySvcParams = {
                    queryParams: {
                        configId,
                        configVersion,
                        datasetId,
                        queryType: "aggquery",
                        bookmarkInputStr,
                        language,
                    },
                };
                if (bookmarkInputStr === "{}") {
                    return resolve(emptyResult);
                }
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
                let config: any = queryResponse.config;
                let measures: MRIEndpointResultMeasureType[] =
                    queryResponse.measures;
                let categories: MRIEndpointResultCategoryType[] =
                    queryResponse.categories;

                // set settings to BaseQueryEngineEndpoint
                this.setSettings(config.advancedSettings.settings);

                let qeCallback = (err, result: MRIEndpointResultType) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    result.measures = measures;
                    result.categories = categories;

                    result =
                        BaseQueryEngineEndpoint.fillMeasuresAndCategories(
                            result
                        );
                    let shouldFormatBinningLabels = false;
                    if (result.data.length === 0) {
                        result.noDataReason = "MRI_PA_NO_MATCHING_PATIENTS";
                    } else {
                        shouldFormatBinningLabels = !(
                            this.EndpointResultConsumer ===
                                ResultConsumerType.UI &&
                            this.isResultTooLarge(result.data.length)
                        );

                        if (!shouldFormatBinningLabels) {
                            result = emptyResult;
                            result.messageKey =
                                "MRI_PA_SERVICES_ERROR_TOO_MANY_RESULTS";
                            result.messageLevel = "Warning";
                            result.noDataReason =
                                "MRI_PA_SERVICES_ERROR_TOO_MANY_RESULTS";
                        }
                    }

                    this.responseDbgInfo(result, {
                        FAST: fast.statement,
                        nql,
                    });

                    result.postProcessingConfig = {
                        fillMissingValuesEnabled:
                            config.chartOptions.stacked
                                .fillMissingValuesEnabled,
                        NOVALUE: utilsLib.Connection.DBValues.NOVALUE,
                        shouldFormatBinningLabels,
                    };

                    // NOTE: Post processing steps have been moved to the client side.
                    // Currently the vue-mri project has the implementation.
                    // Future clients that require the same shape of data will
                    // need to do the post processing after getting this result.
                    resolve(result);
                };
                nql.executeQuery(this.connection, qeCallback);
            } catch (err) {
                reject(err);
            }
        });
    }

    public processRequestCSV(
        req,
        configId,
        configVersion,
        datasetId,
        bookmarkInputStr,
        language
    ) {
        return new Promise(async (resolve, reject) => {
            this.EndpointResultConsumer = ResultConsumerType.CSV;
            await this.processRequest(
                req,
                configId,
                configVersion,
                datasetId,
                bookmarkInputStr,
                language
            )
                .then(postProcessBarChartData)
                .then((rawResult) => {
                    let result = this._convertToCsv(
                        rawResult,
                        language,
                        EnvVarUtils.getCSVDelimiter()
                    );
                    resolve(result);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public _convertToCsv(
        result: MRIEndpointResultType,
        language: string,
        delimiter?
    ): string {
        let headerRow = [];
        let headerColumns = [];
        let realDelimiter = delimiter || ";";
        let rowSeparator = "\r\n";
        let universalNewLineSeparator = "\n";
        let separatorRegex = new RegExp(
            `${realDelimiter}|${rowSeparator}|${universalNewLineSeparator}`,
            "g"
        );
        result.categories.forEach((category) => {
            headerRow.push(
                category.id === "dummy_category"
                    ? "No Category"
                    : BaseQueryEngineEndpoint.scanForCharsToEscapeAndSurroundQuotes(
                          category.name,
                          separatorRegex
                      )
            );
            headerColumns.push(category.id);
        });
        result.measures.forEach((measure) => {
            headerRow.push(
                BaseQueryEngineEndpoint.scanForCharsToEscapeAndSurroundQuotes(
                    measure.name,
                    separatorRegex
                )
            );
            headerColumns.push(measure.id);
        });

        let tableBody = [];
        result.data.forEach((dataRow) => {
            let tableRow = [];
            headerColumns.forEach((headerColumn) => {
                tableRow.push(
                    headerColumn === "dummy_category"
                        ? utilsLib.TextLib.getText(
                              "MRI_PA_SERVICES_CURRENT_COHORT",
                              language
                          )
                        : BaseQueryEngineEndpoint.scanForCharsToEscapeAndSurroundQuotes(
                              dataRow[headerColumn],
                              separatorRegex
                          )
                );
            });
            tableBody.push(tableRow.join(realDelimiter));
        });

        return result.categories.length === 0 &&
            result.measures.length === 0 &&
            result.data.length === 0
            ? ""
            : headerRow.join(realDelimiter) +
                  rowSeparator +
                  tableBody.join(rowSeparator);
    }
}
