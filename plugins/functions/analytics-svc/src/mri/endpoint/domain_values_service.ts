// TODO: import configLib = require("./config.ts");
import { QueryObject as qo, Logger } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { assert } from "@alp/alp-base-utils";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import { generateQuery } from "../../utils/QueryGenSvcProxy";
import { terminologyRequest } from "../../utils/TerminologySvcProxy";

const log = Logger.CreateLogger("analytics-log");

export async function processRequest(
    req,
    domainValuesRequest,
    connection: ConnectionInterface,
    callback: CallBackInterface
) {
        log.addRequestCorrelationID(req);
        try {
        assert(
            domainValuesRequest.attributePath,
            'The request must contain a property "attributePath"'
        );
        if (domainValuesRequest.attributeType === "conceptSet") {
            const conceptSets = await terminologyRequest(
                req,
                "GET",
                `concept-set?datasetId=${domainValuesRequest.configParams.datasetId}`,
                null
            );
            callback(null, {
                results: {
                    data: conceptSets.map((set) => {
                        return { value: set.id, text: set.name };
                    }),
                },
                httpStatus: 200,
            });
            return;
        }

        // generate the query here and then execute the query
        const queryResponse = await generateQuery(
            req,
            {
                attributePath: domainValuesRequest.attributePath, // assert this
                suggestionLimit: domainValuesRequest.suggestionLimit,
                configParams: domainValuesRequest.configParams,
                searchQuery: domainValuesRequest.searchQuery,
                datasetId: domainValuesRequest.configParams.datasetId
            },
            "domainvalues"
        );
        const { queryString, config } = queryResponse;
        const domainValuesLimit = config.panelOptions.domainValuesLimit || 200;
        const countQueryObject = new QueryObject(
            `WITH DATA_QUERY AS (${queryString}) SELECT COUNT(*) AS "valueCount" FROM DATA_QUERY`
        );
        countQueryObject.executeQuery(
            connection,
            (err, results) => {
                if (err) {
                    return;
                }
                if (results?.data?.[0].valueCount) {
                    // fetch actual data if the count is less than the threshold, else return emtry array
                    if (results.data[0].valueCount <= domainValuesLimit) {
                        // fetch actual data if the count is less than the threshold
                        let queryObject = new QueryObject(queryString);
                        queryObject.executeQuery(
                            connection,
                            (err, results) => {
                                if (err) {
                                    return;
                                }
                                callback(err, {
                                    results,
                                    httpStatus: 200,
                                });
                            },
                            connection.schemaName
                        );
                    } else {
                        callback(err, {
                            results: [],
                            httpStatus: 204,
                        });
                    }
                } else {
                    callback(err, {
                        results: { data: [] },
                        httpStatus: 200,
                    });
                }
            },
            connection.schemaName
        );

    } catch (err) {
        callback(err, null);
    }
}
