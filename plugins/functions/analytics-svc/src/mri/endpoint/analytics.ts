import { StackedBarchartEndpoint } from "./StackedBarchartEndpoint";
import { PatientCountEndpoint } from "./PatientCountEndpoint";
import { PatientListEndpoint } from "./PatientListEndpoint";
import { utils as utilsLib } from "@alp/alp-base-utils";
import { Settings } from "../../qe/settings/Settings";
import { Connection as connLib, DBError as dbe } from "@alp/alp-base-utils";
import DBError = dbe.DBError;
import * as domainValuesService from "./domain_values_service";
import { env } from "../../env";

import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;

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

export async function processRequest(
    action,
    req,
    configId,
    configVersion,
    datasetId,
    body,
    language,
    config,
    connection: ConnectionInterface,
    mainCallback: CallBackInterface
) {
    let callback: CallBackInterface = (err, result) => {
        if (err instanceof DBError) {
            mainCallback(err, null);
        } else {
            mainCallback(err, _processResult(result));
        }
    };

    let bookmarkInputStr = JSON.stringify(body);

    switch (action) {
        case "aggquery":
            await new StackedBarchartEndpoint(connection)
                .processRequest(
                    req,
                    configId,
                    configVersion,
                    datasetId,
                    bookmarkInputStr,
                    language
                )
                .then((res) => callback(null, res))
                .catch((err) => callback(err, null));
            break;
        case "patientdetail":
            await new PatientListEndpoint(connection, false)
                .processRequest2(
                    req,
                    configId,
                    configVersion,
                    datasetId,
                    bookmarkInputStr,
                    language
                )
                .then((res) => callback(null, res))
                .catch((err) => callback(err, null));
            break;
        case "totalpcount":
            if (body.filter) {
                await new PatientCountEndpoint(connection)
                    .processRequest(
                        req,
                        configId,
                        configVersion,
                        datasetId,
                        bookmarkInputStr,
                        language
                    )
                    .then((res) => callback(null, res))
                    .catch((err) => callback(err, null));
            } else {
                await new PatientCountEndpoint(connection)
                    .processRequest(
                        req,
                        configId,
                        configVersion,
                        datasetId,
                        bookmarkInputStr,
                        language
                    )
                    .then((res) => callback(null, res))
                    .catch((err) => callback(err, null));
            }
            break;
        case "domain_values_service":
            domainValuesService.processRequest(
                req,
                _constructDomainValueServiceRequest(body, config),
                connection,
                callback
            );
            break;
        default:
            callback(new Error("MRI_PA_INVALID_ACTION: " + action), null);
    }
}

export async function processRequestCsv(
    action,
    req,
    configId,
    configVersion,
    datasetId,
    body,
    language,
    connection: ConnectionInterface,
    csvParam: { uiColumnDisplayOrder: string[] },
    mainCallback: CallBackInterface
) {
    let callback: CallBackInterface = (err, result) => {
        if (err instanceof DBError) {
            mainCallback(err, null);
        } else {
            mainCallback(err, _processResult(result));
        }
    };

    let bookmarkInputStr = JSON.stringify(body);

    switch (action) {
        case "aggquerycsv":
            await new StackedBarchartEndpoint(connection)
                .processRequestCSV(
                    req,
                    configId,
                    configVersion,
                    datasetId,
                    bookmarkInputStr,
                    language
                )
                .then((res) => callback(null, res))
                .catch((err) => callback(err, null));
            break;
        default:
            throw new Error("MRI_PA_INVALID_ACTION");
    }
}

let _constructDomainValueServiceRequest = (request, config) => {
    utilsLib.assert(
        request.attributePath,
        `The request must contain a property "attributePath"`
    );

    let jsonWalk = utilsLib.getJsonWalkFunction(config);
    let configAttrObj = jsonWalk(request.attributePath)[0].obj;

    let newRequest = {
        attributePath: request.attributePath,
        config,
        suggestionsLimit:
            request.suggestionLimit || configAttrObj.suggestionLimit || 100,
        useRefText: configAttrObj.useRefText,
        exprToUse: configAttrObj.useRefValue
            ? "referenceExpression"
            : "expression",
    };

    return newRequest;
};
