// tslint:disable:no-console
import * as utilsLib from "@alp/alp-base-utils";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import * as settingsLib from "../../qe/settings/Settings";
import DBValues = utilsLib.Connection.DBValues;
import {
    MRIEndpointResultCategoryType,
    MRIEndpointResultType,
} from "../../types";

export enum ResultConsumerType {
    CSV,
    UI,
}
type StringOrNumber = string | number;

export class BaseQueryEngineEndpoint {
    /**
     * Add measure and category information (needed by front-end) to a query result.
     */
    public static addMeasuresAndCategories(result, selectAttributes) {
        let newResult = result;
        let measures = [];
        let categories = [];
        selectAttributes.forEach((attr) => {
            let measure = attr.getMeasureForResult();
            if (measure) {
                measures[attr.getProperty("yaxis") - 1] = measure;
            }
            let category = attr.getCategoryForResult();
            if (category) {
                categories[attr.getProperty("xaxis") - 1] = category;
            }
        });
        newResult.measures = measures;
        // Remove empty entries from the categories --> ensures
        // that we can e.g. fill the x1 & x3-axes but leave x2 empty
        // without getting an error
        categories = categories.filter((elem) => {
            return elem !== null;
        });

        // We return a category even if no x-axis was selected at all,
        // because in this case, we want to show just a column with the patient count.
        if (categories.length === 0) {
            categories = [
                {
                    id: "dummy_category",
                    value: "{dummy_category}",
                    axis: 1,
                },
            ];
        } else if (categories.length === 1 && categories[0].axis === 2) {
            categories = [
                {
                    id: "dummy_category",
                    value: "{dummy_category}",
                    axis: 1,
                },
                categories[0],
            ];
        }

        newResult.categories = categories;
        return newResult;
    }

    public static fillMeasuresAndCategories(result: MRIEndpointResultType) {
        let newResult = result;
        if (result.data.length > 0 && "totalpcount" in result.data[0]) {
            newResult.totalPatientCount = result.data[0].totalpcount;
            if (result.data[0].totalpcount === 0) {
                newResult.data = [];
            }
        }

        return newResult;
    }

    /* Check if column or row delimiter like characters are present as part of the values retrieved from database, if yes surround the whole values
       with escape character and double quotes, so that the delimiter like characters present in the actual values are not treated
       as actual delimters but as a whole a single value of a column.
       Ex: value : ab;c must be \"ab;c\" so that semicolon is not used as a delimiter to split a column in a word processing software
    */
    static scanForCharsToEscapeAndSurroundQuotes(
        columnValue: any,
        separatorRegex: RegExp
    ) {
        if (columnValue === DBValues.NOVALUE) {
            return "";
        }
        if (
            columnValue &&
            columnValue.constructor !== Number &&
            columnValue.constructor !== Boolean &&
            columnValue.constructor !== Date
        ) {
            if (columnValue.constructor === Array) {
                columnValue = columnValue.map((value) => {
                    return this.scanForCharsToEscapeAndSurroundQuotes(
                        value,
                        separatorRegex
                    );
                });
                return columnValue;
            } else if (typeof columnValue === "string") {
                return this._surroundWithQuotes(columnValue, separatorRegex);
            } else if (columnValue.constructor === Object) {
                let keys = Object.keys(columnValue);
                if (keys) {
                    keys.forEach((key) => {
                        columnValue[key] =
                            this.scanForCharsToEscapeAndSurroundQuotes(
                                columnValue[key],
                                separatorRegex
                            );
                    });
                }
                return columnValue;
            }
        }
        return columnValue;
    }

    private static _convertFormulaToText(columnValue: string) {
        const rx = new RegExp("^[=@+-](.*)$");
        if (rx.test(columnValue)) {
            columnValue = "'" + columnValue;
        }
        return columnValue;
    }

    private static _surroundWithQuotes(
        columnValue: string,
        separatorRegex: RegExp
    ) {
        if (columnValue && columnValue.search(separatorRegex) !== -1) {
            columnValue = `\"${columnValue}\"`;
        }
        return this._convertFormulaToText(columnValue);
    }

    protected settings: settingsLib.GlobalSettingsType;
    protected defaultPholderTableMap: settingsLib.PholderTableMapType;
    protected defaultGuardedPholderTableMap: settingsLib.PholderTableMapType;
    protected EndpointResultConsumer: ResultConsumerType =
        ResultConsumerType.UI;

    constructor(
        protected connection: ConnectionInterface,
        private unitTestMode: boolean
    ) {
        // if the object is created during unit test then the following initialization will not happen
        if (unitTestMode === false) {
            if (!connection) {
                throw new Error("Connection cannot be empty!");
            }
        }
    }

    public processRequest(
        request,
        configId: string,
        configVersion: string,
        datasetId: string,
        ifrRequest,
        language
    ) {
        // doStuff();
    }

    public processRequest2(
        req,
        configId,
        configVersion,
        datasetId,
        ifrRequest,
        language,
        auditLogChannel?: string,
        fileName?: string
    ) {
        // doStuff();
    }

    public setSettings(settings: settingsLib.GlobalSettingsType) {
        this.settings = settings;
    }

    protected isResultTooLarge(resultCount: number): boolean {
        return resultCount > this.settings.maxResultSize;
    }

    protected responseDbgInfo(result: MRIEndpointResultType, dbg) {
        // if (dbg) {
        //     if (!result.debug) {
        //         result.debug = {};
        //     }
        //     Object.keys(dbg).forEach((k) => {
        //         result.debug[k] = dbg[k];
        //     });
        // }
    }

    protected logAccessError() {
        /*if (!utilsLib.isXS2()) {
            CreateLogger().error("User does not have access: " + errorMsg.join(","));
        }*/
    }
}
