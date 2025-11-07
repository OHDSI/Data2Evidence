import { BaseQueryEngineEndpoint } from "./BaseQueryEngineEndpoint";
import { Connection as connLib } from "@alp/alp-base-utils";
import { generateQuery } from "../../utils/QueryGenSvcProxy";
import ConnectionInterface = connLib.ConnectionInterface;
import { Logger, QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import {
    MRIEndpointResultCategoryType,
    MRIEndpointResultMeasureType,
    StackedBarchartQueryResultType,
} from "../../types";

export class CohortCompareEndpoint extends BaseQueryEngineEndpoint {
    cohortSubqueryList: string[];
    schemaName: string;
    constructor(
        connection: ConnectionInterface,
        schemaName: string,
        unitTestMode?: boolean
    ) {
        super(connection, unitTestMode ? unitTestMode : false);
        this.schemaName = schemaName;
    }

    public async processStackedBarcharCohortRequest(req, querySvcParams) {
        const { queryList, ySelectedAttributes } = (await generateQuery(
            req,
            querySvcParams,
            "cohortCompare"
        )) as any;

        const result: Array<{
            bmkId: string;
            queryResult: StackedBarchartQueryResultType;
        }> = await Promise.all(
            queryList.map(async ({ bmkId, query }) => {
                let queryObject = new QueryObject(
                    query.queryString,
                    query.parameterPlaceholders,
                    query.sqlReturnOn
                );

                let queryResult = await queryObject.executeQuery(
                    this.connection,
                    null,
                    this.schemaName
                );

                return new Promise<{
                    bmkId: string;
                    queryResult: Object;
                }>((resolve) => {
                    resolve({
                        bmkId,
                        queryResult,
                    });
                });
            })
        );

        const data = result.reduce(
            (
                merged,
                cohort: {
                    bmkId: string;
                    queryResult: StackedBarchartQueryResultType;
                }
            ) => {
                return [...merged, ...cohort.queryResult.data];
            },
            []
        );

        const categories: MRIEndpointResultCategoryType[] = [
            {
                axis: 1,
                id: "cohortId",
                name: "cohort",
                order: "ASC",
                type: "text",
                value: "{cohortId}",
            },
        ];

        if (
            querySvcParams.queryParams.userSelectedAttributes &&
            querySvcParams.queryParams.userSelectedAttributes.length > 0
        ) {
            categories.push(
                ...querySvcParams.queryParams.userSelectedAttributes.map(
                    (x, index) => ({
                        axis: 1,
                        id: x.configPath,
                        name: "",
                        order: "ASC",
                        type: "text",
                        value: `{${x.configPath}}`,
                    })
                )
            );
        }

        const measures: MRIEndpointResultMeasureType[] = [
            {
                group: 1,
                id: ySelectedAttributes[0].id,
                name: "Patient Count",
                type: "num",
                value: `{${ySelectedAttributes[0].id}}`,
            },
        ];

        let barchartresult = {
            categories: categories,
            measures: measures,
            data: data,
            noDataReason: null,
        };

        if (barchartresult.data && barchartresult.data.length === 0) {
            barchartresult.noDataReason = "MRI_PA_NO_MATCHING_PATIENTS";
        }

        return barchartresult;
    }
}
