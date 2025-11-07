import { BaseCohortSvc } from "./BaseCohortSvc";
import * as utils from "@alp/alp-base-utils";
import { utils as utilsLib } from "@alp/alp-base-utils";
import ConnectionInterface = utils.Connection.ConnectionInterface;
import { getAstFactory } from "../../qe/sql_generator2/AstFactory";
import { Utils } from "../../qe/sql_generator2/Utils";
import { Config } from "../../qe/qe_config_interface/Config";
import {
    buildFAST,
    formSelectedAttributesRequest,
} from "../../qe/query_builder/PluginQueryBuilder";
import {
    PluginColumnType,
    CohortQueryType,
    IMRIRequest,
    BarcharCohortQueryType,
} from "../../types";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

export class StackedBarChartCohortSvc extends BaseCohortSvc {
    /* 
        This method is to actually get the alias of selected columns from a generated query. 
        Which alias to pick is based on the measure expression defined consisting of placeholders and db column names.
    */
    private getYAxisColumnFromQuery(query, placeholderAndColumn) {
        const map = {};

        if (placeholderAndColumn && placeholderAndColumn.length > 0) {
            placeholderAndColumn.forEach((token) => {
                const column = token.split(".")[1];
                //magic code to get the alias
                const regex = new RegExp(
                    `\.${column} AS (\"[a-zA-Z0-9_.]+\")`,
                    "g"
                );
                const alias = regex.exec(query);
                map[token] = alias[1]; //get the alias from captured group
            });
        } else {
            throw new Error("Placeholders not defined for measure expression");
        }
        return map;
    }

    public async generateQuery(): Promise<BarcharCohortQueryType> {
        const pholderTableMap =
            this.props.backendConfig.advancedSettings.tableMapping;
        let astFactory = getAstFactory(
            new Config(this.props.backendConfig, pholderTableMap)
        );

        // list of bookmarks and its generated query
        const bookmarkSubqueryList = await this.getcohortsql();
        let censoringThreshold = this.props.backendConfig.chartOptions
            .minCohortSize
            ? this.props.backendConfig.chartOptions.minCohortSize
            : 0;

        // check if the selected attributes are valid and can be mapped from backend config
        let xSelectedAttributes = [];

        if (
            this.props.userSelectedAttributes &&
            this.props.userSelectedAttributes.length > 0
        ) {
            xSelectedAttributes = formSelectedAttributesRequest({
                config: this.props.backendConfig,
                userSelectedAttributes: this.props.userSelectedAttributes,
            });
        }

        // generate SQL for each FAST object
        const xAxisQueries = buildFAST(xSelectedAttributes).map(
            ({ fast }, index) => {
                let nql = astFactory.astElementFactory(
                    JSON.parse(JSON.stringify(fast.statement)),
                    "statement",
                    "statement",
                    null
                );
                nql.generateSQL();
                let patientIdAlias =
                    fast.statement.def[0].expression.groupBy.find(
                        (g) => g.path === "pid"
                    ).alias;
                return {
                    patientIdAlias,
                    contextName: `X${index + 1}`,
                    querystring: Utils.getContextSQL(nql, "patient"),
                };
            }
        );
        xAxisQueries.forEach((el, idx) => {
            el[`configPath`] = xSelectedAttributes[idx].configPath;
        });

        // check if the selected attributes are valid and can be mapped from backend config
        let ySelectedAttributes = formSelectedAttributesRequest({
            config: this.props.backendConfig,
            userSelectedAttributes: [
                {
                    configPath: this.props.yaxis,
                    seq: null,
                    order: null,
                },
            ],
            supportMeasureExpr: true,
        });

        // generate SQL for each FAST object
        const yAxisQueries = buildFAST(ySelectedAttributes).map(
            ({ entity, fast }, index) => {
                let nql = astFactory.astElementFactory(
                    JSON.parse(JSON.stringify(fast.statement)),
                    "statement",
                    "statement",
                    null
                );
                nql.generateSQL();
                return {
                    contextName: `YAXIS`,
                    querystring: Utils.getContextSQL(nql, "patient"),
                    configPath: "",
                    otherYAxisInProjection: "",
                };
            }
        );

        if (!yAxisQueries || yAxisQueries.length === 0) {
            throw new Error("Invalid Y Axis selected");
        }

        yAxisQueries.forEach((el, idx) => {
            el.configPath = ySelectedAttributes[idx].configPath;
            let jsonWalk = utilsLib.getJsonWalkFunction(
                this.props.backendConfig
            );
            let configAttrObj: any = jsonWalk(ySelectedAttributes[idx].id);
            if (configAttrObj && configAttrObj.length > 0) {
                if (configAttrObj[0].obj.expression) {
                    el.otherYAxisInProjection = `, AVG(YAXIS."${ySelectedAttributes[idx].id}") AS 
                                                                "${ySelectedAttributes[idx].id}"`;
                } else if (configAttrObj[0].obj.measureExpression) {
                    let measureExpression =
                        configAttrObj[0].obj.measureExpression;
                    const mapAlias = this.getYAxisColumnFromQuery(
                        el.querystring.queryString,
                        measureExpression.match(/@\w+\.\"[a-zA-Z0-9_.]+\"/g)
                    );

                    //Global Replace placeholders with alias picked up from "YAXIS" query
                    for (let placeholder in mapAlias) {
                        measureExpression = measureExpression.replace(
                            new RegExp(placeholder, "g"),
                            `YAXIS.${mapAlias[placeholder]}`
                        );
                    }
                    el.otherYAxisInProjection = `, ${measureExpression} 
                                                    AS "${ySelectedAttributes[idx].id}"`;
                }
            }
        });

        //We are only looking into the first index of y axis as there is only 1 attribute selectable
        const otherYAxisInProjection = yAxisQueries[0][`otherYAxisInProjection`]
            ? yAxisQueries[0][`otherYAxisInProjection`]
            : `, COUNT(DISTINCT(%(cohortPatientIdColumn)UNSAFE)) as               "patient.attributes.pcount"`;

        const axisQueries = [...yAxisQueries, ...xAxisQueries];

        // array of bookmark id's and query result
        const queryList = await Promise.all(
            bookmarkSubqueryList.map(
                async ({ cohortSubquery, bmkId, bookmarkname }) => {
                    let cohortdict = {
                        cohortPatientIdColumn: `CohortContext."patient.attributes.pcount.0"`,
                    };

                    let dict = {
                        ...cohortdict,
                        bmkId,
                        bookmarkname,
                        cohortSubquery,

                        // each value in xaxis will have its own context
                        xaxisContext:
                            axisQueries.length > 0
                                ? QueryObject.format(", ").concat(
                                      QueryObject.format(", ").join(
                                          axisQueries.map((axis) =>
                                              QueryObject.formatDict(
                                                  " %(contextName)UNSAFE AS (%(querystring)Q) ",
                                                  axis
                                              )
                                          )
                                      )
                                  )
                                : QueryObject.format(""),

                        //
                        xaxisJoin:
                            axisQueries.length > 0
                                ? QueryObject.format(" ").join(
                                      axisQueries.map((axis) =>
                                          QueryObject.formatDict(
                                              ` LEFT JOIN %(contextName)UNSAFE ON CAST(%(cohortPatientIdColumn)UNSAFE AS VARCHAR) = %(contextName)UNSAFE."${
                                                  axis[`configPath`]
                                              }.attributes.pid" `,
                                              { ...cohortdict, ...axis }
                                          )
                                      )
                                  )
                                : QueryObject.format(""),

                        groupBy:
                            xSelectedAttributes.length > 0
                                ? QueryObject.format(", ").concat(
                                      QueryObject.format("").join(
                                          xSelectedAttributes.map((attribute) =>
                                              QueryObject.formatDict(
                                                  `"%(id)UNSAFE"`,
                                                  attribute
                                              )
                                          )
                                      )
                                  )
                                : QueryObject.format(""),

                        groupByExpr:
                            xSelectedAttributes.length > 0
                                ? QueryObject.format("GROUP BY ").concat(
                                      QueryObject.format("").join(
                                          xSelectedAttributes.map((attribute) =>
                                              QueryObject.formatDict(
                                                  `"%(id)UNSAFE"`,
                                                  attribute
                                              )
                                          )
                                      )
                                  )
                                : QueryObject.format(""),
                    };

                    let sql = `WITH CohortContext AS (%(cohortSubquery)Q)
                    %(xaxisContext)Q 
                    SELECT
                    '%(bmkId)UNSAFE' as "cohortId",
                    '%(bookmarkname)UNSAFE' as "cohortName" 
                    ${otherYAxisInProjection}
                    %(groupBy)Q 
                    FROM CohortContext %(xaxisJoin)Q
                    %(groupByExpr)Q
                    HAVING COUNT(DISTINCT(%(cohortPatientIdColumn)UNSAFE)) >= ${censoringThreshold}`;

                    let query = QueryObject.formatDict(sql, dict);

                    return new Promise<CohortQueryType>((resolve) => {
                        resolve({
                            bmkId,
                            query,
                        });
                    });
                }
            )
        );

        return { queryList, ySelectedAttributes };
    }
}
