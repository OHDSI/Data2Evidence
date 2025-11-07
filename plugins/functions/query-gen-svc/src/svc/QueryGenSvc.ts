import { Fast } from "../req_transformation/fast";
import { QuerySvcResultType, PluginSelectedAttributeType } from "../types";
import { Config } from "../qe/qe_config_interface/Config";
import { getAstFactory } from "../qe/sql_generator2/AstFactory";
import { QueryObject as qo, Logger } from "@alp/alp-base-utils";
import { Utils } from "../qe/sql_generator2/Utils";
import QueryObject = qo.QueryObject;
import * as utilsLib from "@alp/alp-base-utils";
import { AstElement } from "../qe/sql_generator2/AstElement";
import {
    buildFAST,
    formSelectedAttributesRequest,
} from "../qe/query_builder/PluginQueryBuilder";
import * as queryEngine from "../qe/sql_generator2/SqlGenerator";
const logger = Logger.CreateLogger("query-gen-log");


export class QueryGenSvc {
    private isNormalizedCsv: boolean = false;
    private forCsvDownload;
    private uniquePatientTempTableName;
    constructor(
        private queryType: string,
        private ifrRequest: any,
        private config: any,
        private settings: any,
        private placeholderTableMap: any,
        private pluginOptionalParams: any,
        private censoringThreshold?: string
    ) {}
    public async generateQuery(): Promise<QuerySvcResultType> {
        return new Promise<QuerySvcResultType>(async (resolve, reject) => {
            try {
                let result: QuerySvcResultType;

                const emptyResult: QuerySvcResultType = {
                    queryObject: {
                        queryString: "",
                        parameterPlaceholders: [],
                        sqlReturnOn: false,
                    },
                    pCountQueryObject: {
                        queryString: "",
                        parameterPlaceholders: [],
                        sqlReturnOn: false,
                    },
                    fast: {},
                    config: {},
                    measures: [],
                    categories: [],
                    groupAttrAliases: [],
                    cdmConfigMetaData: {},
                    selectedAttributes: [],
                    entityQueryMap: {},
                    ifrRequest: {},
                };

                if (this._isEmptyRequest(this.ifrRequest)) {
                    resolve(emptyResult);
                }
                this.enrichIFRRequest();
                if (this.queryType === "patientdetail") {
                    this._enrichPatientListIFRRequest(this.ifrRequest);
                }
                if (Object.keys(this.ifrRequest).length === 0) {
                    resolve(emptyResult);
                }
                this.enrichConfig();

                let fast = new Fast(
                    this.queryType,
                    this.ifrRequest,
                    this.config,
                    this.placeholderTableMap,
                    this.censoringThreshold
                );

                if (fast.message.noDataReason) {
                    result = emptyResult;
                    result.fast = JSON.parse(JSON.stringify(fast));
                    resolve(result);
                }
                let fastObjectToProcess = fast.statement.statement;
                const confHelper = new Config(
                    this.config,
                    this.placeholderTableMap
                );
                const astFactory = getAstFactory(confHelper);
                let nql;
                if (this.isNormalizedCsv) {
                    fastObjectToProcess = this._transformFastToNormalize(
                        fastObjectToProcess,
                        this.config
                    );
                    nql = astFactory.astElementFactory(
                        JSON.parse(JSON.stringify(fastObjectToProcess)),
                        "statement",
                        "statement",
                        null
                    );
                } else {
                    nql = astFactory.astElementFactory(
                        JSON.parse(JSON.stringify(fast.statement.statement)),
                        "statement",
                        "statement",
                        null
                    );
                }

                if (!nql) {
                    resolve(emptyResult);
                }
                const measures = this.getMeasures(fast, confHelper);
                const categories = this.getCategories(fast, confHelper);
                const groupAttrAliases = this.getGroupAttrAliases(fast);
                const selectedAttributes: PluginSelectedAttributeType[] =
                    this.getSelectedAttributes();
                const finalQueryObject: QueryObject =
                    this.appendChartSpecificQueries(
                        nql,
                        fast,
                        confHelper,
                        measures,
                        categories,
                        groupAttrAliases
                    );
                const entityQueryMap =
                    this.createPluginEntityQueryMap(selectedAttributes);
                const finalResults: QuerySvcResultType = {
                    queryObject: this.serializeQueryObject(finalQueryObject),
                    pCountQueryObject: this.getPCountQueryObject(nql),
                    fast: JSON.parse(JSON.stringify(fast)),
                    config: this.config,
                    measures,
                    categories,
                    groupAttrAliases,
                    cdmConfigMetaData: {
                        id: "",
                        version: "",
                    },
                    selectedAttributes,
                    entityQueryMap,
                    ifrRequest: this.ifrRequest,
                };
                resolve(finalResults);
            } catch (err) {
                logger.error(err);
                reject(err);
            }
        });
    }

    private getSelectedAttributes(): PluginSelectedAttributeType[] {
        if (this.queryType !== "plugin") {
            return null;
        }
        const requestQuery = this.pluginOptionalParams.requestQuery;
        const metadataType = this.pluginOptionalParams.metadataType;
        const annotated = this.pluginOptionalParams.annotated;
        const postFilters = this.pluginOptionalParams.postFilters;
        const selectedAttributes = formSelectedAttributesRequest({
            config: this.config,
            requestQuery,
            metadataType,
            userSelectedAttributes: this.ifrRequest.columns,
        });

        return selectedAttributes;
    }

    private createPluginEntityQueryMap(
        selectedAttributes: PluginSelectedAttributeType[]
    ) {
        if (this.queryType !== "plugin") {
            return null;
        }
        const interactionFAST = buildFAST(
            selectedAttributes,
            this.pluginOptionalParams.annotated,
            this.pluginOptionalParams.postFilters
        );
        const { tempTableConfig, tempTablePholderTable } =
            this._getTempTableConfigurations(
                this.config,
                this.placeholderTableMap,
                this.uniquePatientTempTableName
            );
        return interactionFAST.map((fast) => ({
            entity: fast.entity,
            query: queryEngine.getSQL(
                tempTableConfig,
                tempTablePholderTable,
                fast.fast
            ),
        }));
    }

    private enrichIFRRequest() {
        switch (this.queryType) {
            case "kmquery":
                this.ifrRequest.kmParams.filterList = JSON.parse(
                    JSON.stringify(
                        this.config.chartOptions.km.selectedInteractions
                    )
                );
                break;
            case "patientdetail":
                if (this.ifrRequest.normalizeCsv) {
                    this.isNormalizedCsv = true;
                    delete this.ifrRequest[`normalizeCsv`];
                }
                this.forCsvDownload = this.ifrRequest.forCsvDownload;
                delete this.ifrRequest[`forCsvDownload`];
                break;
            case "plugin":
                this.uniquePatientTempTableName =
                    this.ifrRequest.uniquePatientTempTableName;
                delete this.ifrRequest[`uniquePatientTempTableName`];
                break;
            default:
        }
    }

    private enrichConfig() {
        //TODO: this function only works for the new config. _interaction_id is added directly in test_configs.ts for mri tests
        switch (this.queryType) {
            case "patientdetail":
                let interactionId: string = "_interaction_id";
                for (const [Key, Value] of Object.entries(
                    this.config.patient.interactions
                )) {
                    let attributeKeys = Object.keys(
                        this.config.patient.interactions[Key].attributes
                    );
                    let interactionAttributeKey = attributeKeys.filter(
                        (key) => key.toLowerCase() === Key.toLowerCase() + "id"
                    )[0];
                    this.config.patient.interactions[Key].attributes[
                        interactionId
                    ] =
                        this.config.patient.interactions[Key].attributes[
                            interactionAttributeKey
                        ];
                }
                break;
            default:
        }
    }

    private getPCountQueryObject(nql: AstElement) {
        if (this.queryType !== "plugin") {
            return null;
        }
        let subquery = Utils.getContextSQL(nql, "patient");
        let pCountquery = Utils.getContextSQL(
            nql,
            "population",
            "PatientCount"
        );
        let patientContextIdentifier = Utils.hasMultiRequest(nql)
            ? "PatientRequests"
            : "PatientRequest0";
        let dict = {
            subquery,
            pCountquery,
        };
        let sql = `WITH ${patientContextIdentifier} AS ( %(subquery)Q ) %(pCountquery)Q`;
        let qo = QueryObject.formatDict(sql, dict);
        return this.serializeQueryObject(qo);
    }

    private serializeQueryObject(qo: QueryObject) {
        return {
            queryString: qo.queryString,
            parameterPlaceholders: qo.parameterPlaceholders,
            sqlReturnOn: qo.sqlReturnOn,
        };
    }

    private appendChartSpecificQueries(
        nql: AstElement,
        fast,
        confHelper,
        measures,
        categories,
        groupAttrAliases
    ): QueryObject {
        switch (this.queryType) {
            case "aggquery":
                return this.appendAggQuerySpecificQueries(nql);
            case "boxplot":
                return this.appendBoxplotSpecificQueries(
                    nql,
                    fast,
                    groupAttrAliases
                );
            case "kmquery":
                return this.appendKMSpecificQueries(nql);
            case "patientdetail":
                return this.appendPatientListSpecificQueries(nql);
            case "totalpcount":
                return this.appendTotalPCountSpecificQueries(nql);
            case "plugin":
                return this.appendPluginSpecificQueries(nql, confHelper);
            default:
                return nql.sql;
        }
    }

    private appendAggQuerySpecificQueries(nql: AstElement): QueryObject {
        nql.appendSQL(
            QueryObject.format(
                `TotalPatientCount AS (SELECT COUNT(distinct PatientCount."patient.attributes.pid") as "totalpcount"
                                FROM PatientCount WHERE PatientCount.\"gr_cnt\" >= %UNSAFE )`,
                this.censoringThreshold
            ),
            "TotalPatientCount"
        );
        nql.generateSQLCombineCount();
        return nql.sql;
    }

    private appendPluginSpecificQueries(
        nql: AstElement,
        confHelper
    ): QueryObject {
        nql.generateSQL();
        const insertIntoTempTable = this.pluginOptionalParams.insert;
        const createCohort = this.pluginOptionalParams.createCohort;
        const limit = this.ifrRequest.limit;
        const offset = this.ifrRequest.offset || 0;
        const cohortId = this.ifrRequest.cohortId;
        const limitOffsetQueryString = limit
            ? `LIMIT %(limit)l OFFSET %(offset)l`
            : "";

        const subquery = cohortId
            ? QueryObject.format(
                  `SELECT SUBJECT_ID AS "patient.attributes.pcount.0" FROM $$SCHEMA$$.COHORT WHERE COHORT_DEFINITION_ID = %s`,
                  cohortId
              )
            : Utils.getContextSQL(nql, "patient");

        // For cohort creation, start of the query is added in the cohort controller
        // as QueryObject.formatDict() will not work with insufficient parameters
        // but we want the values to be sent back and populated in analytics svc.
        const startOfQuery = createCohort
            ? ``
            : insertIntoTempTable
            ? `INSERT INTO ${this.uniquePatientTempTableName} SELECT "pTable".*`
            : `SELECT "pTable".${confHelper.getColumn(
                  this.settings.getFactTablePlaceholder() + ".PATIENT_ID"
              )}`;

        const sql = `${startOfQuery}
                        FROM (
                            SELECT ${createCohort ? `*` : `"patient.attributes.pcount.0"`} FROM (%(subquery)Q ${
                                limit ? limitOffsetQueryString : ""
                            }) AS alias2
                        ) AS alias1
                JOIN ${confHelper.getColumn(
                    this.settings.getFactTablePlaceholder()
                )} "pTable"
            ON "patient.attributes.pcount.0" = "pTable".${confHelper.getColumn(
                this.settings.getFactTablePlaceholder() + ".PATIENT_ID"
            )}`;

        // Select dataset, insert patient ids into temp table
        const query = limit
            ? QueryObject.formatDict(sql, {
                  subquery,
                  limit,
                  offset,
              })
            : QueryObject.formatDict(sql, {
                  subquery,
              });

        return query;
    }

    private appendTotalPCountSpecificQueries(nql: AstElement): QueryObject {
        nql.appendSQL(
            QueryObject.format(
                'TotalPatientCount AS (SELECT COUNT(distinct MeasurePopulation."patient.attributes.pid") ' +
                    ' as "patient.attributes.pcount" ' +
                    ' FROM MeasurePopulation  WHERE MeasurePopulation."gr_cnt" >= %UNSAFE )',
                this.censoringThreshold
            ),
            "TotalPatientCount"
        );

        nql.generateSQL();
        return nql.sql;
    }

    private appendBoxplotSpecificQueries(
        nql: AstElement,
        fast,
        groupAttrAliases
    ): QueryObject {
        nql.generateSQL();
        let boxPlotIdentifier = fast.message.boxplotIdentifier;
        let groupIdAttr;
        let groupSelects;
        let selectBits;
        let atabGroupSelects;
        let subquery = Utils.getContextSQL(nql, "patient");
        let pCountQuery = Utils.getContextSQL(
            nql,
            "population",
            "PatientCount"
        );
        let patientContextIdentifier = Utils.hasMultiRequest(nql)
            ? "PatientRequests"
            : "PatientRequest0";
        if (groupAttrAliases.length !== 0) {
            selectBits = groupAttrAliases.map((alias) => {
                return "ifnull(TO_NVARCHAR(" + alias + " ), 'NoValue')";
            });

            groupIdAttr = selectBits.join(" || ',' || ");

            groupSelects = groupAttrAliases
                .map((alias) => {
                    return "MAX(" + alias + ") " + alias;
                })
                .join(",\n");

            atabGroupSelects = groupAttrAliases
                .map((alias) => {
                    return "atab." + alias;
                })
                .join(",\n");
        } else {
            // this handles the case of no x-axis
            groupIdAttr = "CURRENT_USER";
            groupSelects = ["' '"];
            atabGroupSelects = ["' '"];
        }

        let dict = {
            groupAttrAliases,
            subquery,
            pCountQuery,
            y: '"' + boxPlotIdentifier + '"',
            groupSelects,
            atabGroupSelects,
            censoringThreshold: this.censoringThreshold,
        };

        // We calculate the quartiles using "Tukey's hinges".
        // (See http://en.wikipedia.org/wiki/Quartile)
        //
        // This methods works as follows:
        //
        // Use the median to divide the ordered data set into two
        // halves. Include the median in both halves.  The lower
        // quartile value is the median of the lower half of the
        // data. The upper quartile value is the median of the
        // upper half of the data.  The values found by this method
        // are also known as "Tukey's hinges".

        let sql = `with ${patientContextIdentifier} as (
                --begin subquery
                    %(subquery)Q
                --end standard subquery
            ), 
            PatientCount AS (
                    %(pCountQuery)Q
                ), 
            TotalPatientCount AS (
                    SELECT COUNT(DISTINCT PatientCount."patient.attributes.pid") AS "totalpcount"
                    FROM PatientCount
                    WHERE PatientCount."gr_cnt" >= %(censoringThreshold)f
                ), 
            BoxPlot AS (
                    select 
                    %(atabGroupSelects)UNSAFE,
                        count(distinct "patient.attributes.pid") num_entries,
                    MIN(y) MIN_VAL,
                    MEDIAN(ntile_q1) Q1,
                    MEDIAN(y) MEDIAN,
                    MEDIAN(ntile_q3) Q3, 
                    max(y) MAX_VAL
                    from (
                        select %(groupIdAttr)UNSAFE as GroupId, to_double(%(y)UNSAFE) y, 
                            case when %(y)UNSAFE is not NULL
                                    and ntile(2) over (partition by %(groupIdAttr)UNSAFE, case when %(y)UNSAFE is NULL then 0 else 1 end
                                                        order by %(y)UNSAFE asc) =1 
                                then to_double(%(y)UNSAFE) end ntile_q1, 
                            case when %(y)UNSAFE is not NULL
                                    and ntile(2) over (partition by %(groupIdAttr)UNSAFE, case when %(y)UNSAFE is NULL then 0 else 1 end
                                                        order by %(y)UNSAFE desc) =1 
                                then to_double(%(y)UNSAFE) end ntile_q3, * 
                        from ${patientContextIdentifier}
                    ) atab
                    group by %(atabGroupSelects)UNSAFE 
                    having count(distinct "patient.attributes.pid") >= %(censoringThreshold)f
                    order by %(atabGroupSelects)UNSAFE
                )
            SELECT * FROM BoxPlot FULL JOIN TotalPatientCount ON 1 = 1`;

        let qo = QueryObject.formatDict(sql, dict);
        return qo;
    }

    private appendKMSpecificQueries(nql): QueryObject {
        nql.generateSQL();

        let populationContext = Utils.getContextSQL(
            nql,
            "population",
            "MeasurePopulation"
        );
        let patientContext = Utils.getContextSQL(nql, "patient");
        let pCountQuery = Utils.getContextSQL(
            nql,
            "population",
            "PatientCount"
        );
        let censoringThreshold = this.censoringThreshold;
        let xAxesDetails = this.ifrRequest.kmParams.xAxesDetails;
        let kmStartEventOccurence =
            this.ifrRequest.kmParams.kmStartEventOccurence;
        let kmEndEventOccurence = this.ifrRequest.kmParams.kmEndEventOccurence;

        populationContext.queryString = populationContext.queryString.replace(
            "%(censoringThreshold)UNSAFE",
            censoringThreshold
        );
        let patientContextIdentifier = Utils.hasMultiRequest(nql)
            ? "PatientRequests"
            : "PatientRequest0";
        let prefixPatientContext;
        let suffixPatientContext;
        let partitionClause =
            xAxesDetails.length > 0
                ? `partition by ${xAxesDetails.substring(
                      0,
                      xAxesDetails.length - 1
                  )}`
                : "";

        /*Scenario 1: First the start event date is ordered and ranked, then the end date is ordered and ranked with
        respect to the start event date. Finally the first occuring start event and first occuring end event after the start event is picked.
        */
        if (
            kmStartEventOccurence === "start_min" &&
            kmEndEventOccurence === "end_min"
        ) {
            prefixPatientContext = `SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                            ,"patient.attributes.pid"
                                            ,"KM_START"
                                            ,"KM_END"
                                            ,"KM_MAX_DATE"
                                            ,"startEventNum"
                                            ,"endEventNum"
                                            ,"hasEndEvent"
                                            , COUNT(1) over(${partitionClause}) as "gr_cnt" 

                                        FROM (
                                            SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                ,"patient.attributes.pid"
                                                ,"KM_START"
                                                ,"KM_END"
                                                ,"KM_MAX_DATE"
                                                ,"startEventNum"
                                                ,"endEventNum"
                                                ,"hasEndEvent"
                                            FROM (
                                                SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                    ,"patient.attributes.pid"
                                                    ,"KM_START"
                                                    ,CASE
                                                    WHEN "KM_END" > CURRENT_DATE
                                                        THEN NULL
                                                    ELSE "KM_END"
                                                    END "KM_END"
                                                    ,"KM_MAX_DATE"
                                                    ,DENSE_RANK() OVER (
                                                        PARTITION BY "patient.attributes.pid" ORDER BY "KM_START"
                                                        ) "startEventNum"
                                                    ,CASE WHEN (
                                                        "KM_END" IS NULL
                                                        OR "KM_END" > CURRENT_DATE
                                                        ) THEN 0
                                                    ELSE DENSE_RANK() OVER (
                                                        PARTITION BY "patient.attributes.pid"
                                                        ,"KM_START" ORDER BY "KM_END"
                                                        ) END AS "endEventNum"
                                                    ,CASE 
                                                        WHEN (SUM(CASE WHEN "KM_END" <=CURRENT_DATE THEN 1 ELSE 0 END) 
                                                            OVER (PARTITION BY "patient.attributes.pid")) > 0
                                                        THEN true
                                                        ELSE false
                                                    END AS "hasEndEvent"
                                                FROM `;

            suffixPatientContext = ` ))  WHERE "startEventNum" = 1 AND (("endEventNum" = 1 AND "hasEndEvent" = true)
                                                                        or ("endEventNum" = 0 AND "hasEndEvent" = false)) `;
        } else if (
            kmStartEventOccurence === "start_min" &&
            kmEndEventOccurence === "end_max"
        ) {
            /*Scenario 2: First the start event date is ordered and ranked, then the end date is ordered and ranked with
            respect to the start event date. Finally the first occuring start event and last occuring end event after the start event is picked.
            MAXENDEvent column name is for 2nd scenario only.
            */

            prefixPatientContext = `SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                            ,"patient.attributes.pid"
                                            ,"KM_START"
                                            ,"KM_END"
                                            ,"KM_MAX_DATE"
                                            ,"startEventNum"
                                            ,"endEventNum"
                                            ,"MAXENDEvent"
                                            ,"hasEndEvent"
                                            , COUNT(1) over(${partitionClause}) as "gr_cnt" 
                                        FROM (
                                            SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                ,"patient.attributes.pid"
                                                ,"KM_START"
                                                ,"KM_END"
                                                ,"KM_MAX_DATE"
                                                ,"startEventNum"
                                                ,"endEventNum"
                                                ,MAX("endEventNum") OVER (
                                                    PARTITION BY "patient.attributes.pid"
                                                    ,"startEventNum"
                                                    ) AS "MAXENDEvent"
                                                ,"hasEndEvent"
                                            FROM (
                                                SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                    ,"patient.attributes.pid"
                                                    ,"KM_START"
                                                    ,CASE
                                                    WHEN "KM_END" > CURRENT_DATE
                                                        THEN NULL
                                                    ELSE "KM_END"
                                                    END "KM_END"
                                                    ,"KM_MAX_DATE"
                                                    ,DENSE_RANK() OVER (
                                                        PARTITION BY "patient.attributes.pid" ORDER BY "KM_START"
                                                        ) "startEventNum"
                                                    ,CASE WHEN (
                                                        "KM_END" IS NULL
                                                        OR "KM_END" > CURRENT_DATE
                                                        ) THEN 0
                                                    ELSE DENSE_RANK() OVER (
                                                        PARTITION BY "patient.attributes.pid"
                                                        ,"KM_START" ORDER BY "KM_END"
                                                        ) END AS "endEventNum"
                                                    ,CASE 
                                                    WHEN (SUM(CASE WHEN "KM_END" <=CURRENT_DATE THEN 1 ELSE 0 END) 
                                                        OVER (PARTITION BY "patient.attributes.pid")) > 0
                                                    THEN true
                                                    ELSE false
                                                END AS "hasEndEvent"
                                                FROM `;
            suffixPatientContext = `))  WHERE "startEventNum" = 1 AND (("endEventNum" = "MAXENDEvent" AND "hasEndEvent" = true)
                                                                        or ("endEventNum" = 0 AND "hasEndEvent" = false))`;
        } else if (
            kmStartEventOccurence === "start_before_end" &&
            kmEndEventOccurence === "end_min"
        ) {
            /*Scenario 3: First the start event date and end event date is ordered and ranked.
            The first occuring end date date with a pair of start event that immediately occurs before the end event is picked.
            */
            prefixPatientContext = `SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                            ,"patient.attributes.pid"
                                            ,"KM_START"
                                            ,"KM_END"
                                            ,"KM_MAX_DATE"
                                            ,"startEventNum"
                                            ,"endEventNum"
                                            ,"MAXStartEventWoEE"
                                            ,"hasEndEvent"
                                            ,"minDaysBetweenRank"
                                            , COUNT(1) over(${partitionClause}) as "gr_cnt" 
                                        FROM (
                                            SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                ,"patient.attributes.pid"
                                                ,"KM_START"
                                                ,"KM_END"
                                                ,"KM_MAX_DATE"
                                                ,"startEventNum"
                                                ,"endEventNum"
                                                ,"MAXStartEventWoEE"
                                                ,"hasEndEvent"
                                                ,CASE
                                                    WHEN "daysBetweenWEE" is null
                                                        THEN 0
                                                    ELSE DENSE_RANK() OVER (
                                                                    PARTITION BY "patient.attributes.pid" ORDER BY "daysBetweenWEE" desc
                                                                    )
                                                    END AS "minDaysBetweenRank"
                                            FROM (
                                                SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                    ,"patient.attributes.pid"
                                                    ,"KM_START"
                                                    ,"KM_END"
                                                    ,"KM_MAX_DATE"
                                                    ,"startEventNum"
                                                    ,"endEventNum"
                                                    ,"hasEndEvent"
                                                    ,CASE
                                                        WHEN "hasEndEvent" = true
                                                            AND "KM_END" IS NOT NULL AND "endEventNum" = 1
                                                                THEN days_between("KM_END","KM_START")
                                                            ELSE null
                                                            END AS "daysBetweenWEE"
                                                    ,CASE
                                                        WHEN "hasEndEvent" = false
                                                            THEN MAX("startEventNum") OVER (PARTITION BY "patient.attributes.pid")
                                                        END AS "MAXStartEventWoEE"
                                                FROM (
                                                    SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                        ,"patient.attributes.pid"
                                                        ,"KM_START"
                                                        ,CASE
                                                        WHEN "KM_END" > CURRENT_DATE
                                                            THEN NULL
                                                        ELSE "KM_END"
                                                        END "KM_END"
                                                        ,"KM_MAX_DATE"
                                                        ,DENSE_RANK() OVER (
                                                            PARTITION BY "patient.attributes.pid" ORDER BY "KM_START"
                                                            ) "startEventNum"
                                                        ,CASE WHEN (
                                                            "KM_END" IS NULL
                                                            OR "KM_END" > CURRENT_DATE
                                                            ) THEN 0
                                                        ELSE DENSE_RANK() OVER (
                                                            PARTITION BY "patient.attributes.pid"
                                                            ,"KM_START" ORDER BY "KM_END"
                                                            ) END AS "endEventNum"
                                                        ,CASE 
                                                        WHEN (SUM(CASE WHEN "KM_END" <=CURRENT_DATE THEN 1 ELSE 0 END) 
                                                            OVER (PARTITION BY "patient.attributes.pid")) > 0
                                                        THEN true
                                                        ELSE false
                                                    END AS "hasEndEvent"
                                                    FROM `;
            suffixPatientContext = ` )))
                                WHERE (
                                        "endEventNum" = 1
                                        AND "hasEndEvent" = true
                                        AND "minDaysBetweenRank" = 1
                                        )
                                    OR (
                                        "startEventNum" = "MAXStartEventWoEE"
                                        AND "endEventNum" = 0
                                        AND "hasEndEvent" = false
                                        ) `;
        } else if (
            kmStartEventOccurence === "start_before_end" &&
            kmEndEventOccurence === "end_max"
        ) {
            /*Scenario 4: First the start event date and end event date is ordered and ranked.
            The last occuring end date date with a pair of start event that immediately occurs before the end event is picked.
            */
            prefixPatientContext = `SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                            ,"patient.attributes.pid"
                                            ,"KM_START"
                                            ,"KM_END"
                                            ,"KM_MAX_DATE"
                                            ,"startEventNum"
                                            ,"endEventNum"
                                            ,"MAXStartEventWoEE"
                                            ,"hasEndEvent"
                                            ,"rankEventWEE"
                                            ,"MAXRankEventWEE"
                                            , COUNT(1) over(${partitionClause}) as "gr_cnt" 
                                        FROM (
                                            SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                ,"patient.attributes.pid"
                                                ,"KM_START"
                                                ,"KM_END"
                                                ,"KM_MAX_DATE"
                                                ,"startEventNum"
                                                ,"endEventNum"
                                                ,"MAXStartEventWoEE"
                                                ,"hasEndEvent"
                                                ,"rankEventWEE"
                                                ,MAX("rankEventWEE") OVER (PARTITION BY "patient.attributes.pid") "MAXRankEventWEE"
                                            FROM (
                                                SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                    ,"patient.attributes.pid"
                                                    ,"KM_START"
                                                    ,"KM_END"
                                                    ,"KM_MAX_DATE"
                                                    ,"startEventNum"
                                                    ,"endEventNum"
                                                    ,"hasEndEvent"
                                                    ,CASE 
                                                        WHEN "hasEndEvent" = true
                                                            AND "KM_END" IS NULL
                                                            THEN 0
                                                        WHEN "hasEndEvent" = true
                                                            AND "KM_END" IS NOT NULL
                                                            THEN DENSE_RANK() OVER (
                                                                    PARTITION BY "patient.attributes.pid" ORDER BY "KM_START"
                                                                        ,"KM_END"
                                                                    )
                                                        END AS "rankEventWEE"
                                                    ,CASE 
                                                        WHEN "hasEndEvent" = false
                                                            THEN MAX("startEventNum") OVER (PARTITION BY "patient.attributes.pid")
                                                        END AS "MAXStartEventWoEE"
                                                FROM (
                                                    SELECT ${xAxesDetails} "patient.attributes.pcount.0"
                                                        ,"patient.attributes.pid"
                                                        ,"KM_START"
                                                        ,CASE
                                                        WHEN "KM_END" > CURRENT_DATE
                                                            THEN NULL
                                                        ELSE "KM_END"
                                                        END "KM_END"
                                                        ,"KM_MAX_DATE"
                                                        ,DENSE_RANK() OVER (
                                                            PARTITION BY "patient.attributes.pid" ORDER BY "KM_START"
                                                            ) "startEventNum"
                                                        ,CASE WHEN (
                                                            "KM_END" IS NULL
                                                            OR "KM_END" > CURRENT_DATE
                                                            ) THEN 0
                                                        ELSE DENSE_RANK() OVER (
                                                            PARTITION BY "patient.attributes.pid"
                                                            ,"KM_START" ORDER BY "KM_END"
                                                            ) END AS "endEventNum"
                                                        ,CASE 
                                                        WHEN (SUM(CASE WHEN "KM_END" <=CURRENT_DATE THEN 1 ELSE 0 END) 
                                                            OVER (PARTITION BY "patient.attributes.pid")) > 0
                                                        THEN true
                                                        ELSE false
                                                    END AS "hasEndEvent"
                                                    FROM `;
            suffixPatientContext = `	)))
                                        WHERE (
                                                "rankEventWEE" = "MAXRankEventWEE"
                                                AND "endEventNum" <> 0
                                                AND "hasEndEvent" = true
                                                )
                                            OR (
                                                "startEventNum" = "MAXStartEventWoEE"
                                                AND "endEventNum" = 0
                                                AND "hasEndEvent" = false
                                                ) `;
        }

        let dict = {
            populationContext,
            patientContext,
            pCountQuery,
            censoringThreshold,
            prefixPatientContext,
            suffixPatientContext,
        };

        let sql = `WITH
                    ${patientContextIdentifier} AS (%(prefixPatientContext)UNSAFE 
                                                        (%(patientContext)Q)
                                                    %(suffixPatientContext)UNSAFE
                    ),
                    PopulationContext AS (%(populationContext)Q),
                    PatientCount AS (%(pCountQuery)Q),
                    TotalPatientCount
                    AS (
                        SELECT COUNT(DISTINCT PatientCount."patient.attributes.pid") AS "totalpcount"
                        FROM PatientCount
                        WHERE PatientCount."gr_cnt" >= %(censoringThreshold)f
                    ),
                    KaplanMeier
                    AS (
                        SELECT "Series"
                        ,"SurvivalDays"
                        ,SUM("Censored") as "Censored"
                        ,SUM("Event") as "Deceased" FROM PopulationContext
                        GROUP BY "Series","SurvivalDays"
                        ORDER BY "Series" ASC,"SurvivalDays" ASC
                    )
                    SELECT * FROM KaplanMeier FULL JOIN TotalPatientCount on 1=1
                    WHERE "SurvivalDays" IS NOT NULL 
                        AND "SurvivalDays" >= 0 
                    ORDER BY "Series" ASC
                        ,"SurvivalDays" ASC`;

        let qo = QueryObject.formatDict(sql, dict);
        return qo;
    }

    private appendPatientListSpecificQueries(nql: AstElement): QueryObject {
        nql.generateSQL();
        let qo;
        if (!this.forCsvDownload) {
            let populationContext = Utils.getContextSQL(
                nql,
                "population",
                "MeasurePopulation"
            );
            let patientContext = Utils.getContextSQL(nql, "patient");
            let patientContextIdentifier = Utils.hasMultiRequest(nql)
                ? "PatientRequests"
                : "PatientRequest0";
            let dict = {
                populationContext,
                patientContext,
            };

            // let sql = `WITH
            // ${patientContextIdentifier} AS (%(patientContext)Q),
            // PopulationContext AS (%(populationContext)Q),
            // TotalPatientCount
            // AS (
            //     SELECT COUNT(DISTINCT ${patientContextIdentifier}."pid") AS "totalpcount"
            //     FROM ${patientContextIdentifier}
            // )
            // SELECT * FROM PopulationContext FULL JOIN TotalPatientCount on 1=1`;

            // modified code to avoid aggregation. limit and offset is also hardcoded
            let sql = `WITH
                    ${patientContextIdentifier} AS (%(patientContext)Q),
                    PopulationContext AS (%(patientContext)Q LIMIT 30 OFFSET 0),
                    TotalPatientCount
                    AS (
                        SELECT COUNT(DISTINCT ${patientContextIdentifier}."pid") AS "totalpcount"
                        FROM ${patientContextIdentifier}
                    )
                    SELECT * FROM PopulationContext FULL JOIN TotalPatientCount on 1=1`;
            qo = QueryObject.formatDict(sql, dict);
        } else {
            qo = nql.sql;
        }
        return qo;
    }

    private getMeasures(
        fast: Fast,
        config: Config,
        selectFilter: (x) => boolean = (x) => true
    ): any {
        let measures = [];

        fast.select.Measure =
            fast.select.Measure instanceof Array
                ? fast.select.Measure
                : [fast.select.Measure];

        fast.select.Measure.filter(selectFilter).forEach((x) => {
            measures.push({
                id: x.pathId,
                value: "{" + x.pathId + "}",
                name: config.getEntityByPath(x.pathId).getConfig().name,
                group: x.seq,
                type: config.getEntityByPath(x.pathId).getConfig().type,
            });
        });

        return measures;
    }

    private getCategories(
        fast: Fast,
        config: Config,
        selectFilter: (x) => boolean = (x) => true
    ): any {
        let categories = [];
        if (
            typeof fast.select.GroupBy === "undefined" ||
            fast.select.GroupBy.length === 0
        ) {
            categories.push({
                id: "dummy_category",
                value: "{dummy_category}",
                axis: 1,
            });
        } else {
            fast.select.GroupBy.forEach((x) => {
                let category: any = {
                    id: x.pathId,
                    value: "{" + x.pathId + "}",
                    name: config.getEntityByPath(x.pathId).getConfig().name,
                    type: config.getEntityByPath(x.pathId).getConfig().type,
                    axis: x.seq > 3 ? 2 : 1,
                    order: x.order,
                };
                if (typeof x.binsize !== "undefined") {
                    category.binsize = x.binsize;
                }
                categories.push(category);
            });

            if (categories.length === 1 && categories[0].axis === 2) {
                categories.unshift({
                    id: "dummy_category",
                    value: "{dummy_category}",
                    axis: 1,
                });
            }
        }

        return categories;
    }

    private getGroupAttrAliases(fast: Fast): any {
        let groupAttrAliases = fast.select.GroupBy.map((x) => `"${x.pathId}"`);
        return groupAttrAliases;
    }

    // This is a hack to transform the fast in order to produce normalized data.
    // TODO: A proper implementation while forming the fast itself should be done in the next release.
    private _transformFastToNormalize(fastObject, config) {
        let normalizedFast = { def: [] };

        // - remove aggregation property from patient defns / add to nvarchar for date and timestamp types
        fastObject.def.forEach((definitionItem) => {
            if (definitionItem.name !== "MeasurePopulation") {
                normalizedFast.def.push(definitionItem);

                if (definitionItem.expression.groupBy) {
                    definitionItem.expression.groupBy.forEach((groupByItem) => {
                        if (groupByItem.aggregation) {
                            delete groupByItem.aggregation;
                        }
                    });
                }
            } else if (definitionItem.name === "MeasurePopulation") {
                // - remove group by from measure population
                normalizedFast.def.push(definitionItem);
                if (definitionItem.expression.groupBy) {
                    delete definitionItem.expression.groupBy;
                }

                //- remove string_agg keyword in measure population of the aggregation property
                if (definitionItem.expression.measure) {
                    definitionItem.expression.measure.forEach((measureItem) => {
                        measureItem.aggregation = "%Q"; //Might need to change
                    });
                }

                //- remove aggregation attribute in order by items of measure population
                if (definitionItem.expression.orderBy) {
                    definitionItem.expression.orderBy.forEach((orderByItem) => {
                        if (orderByItem.aggregation) {
                            delete orderByItem.aggregation;
                        }
                    });
                }
            }
        });

        //scan all the definition's for attributes defined in group by, order by, measure
        //replace them with to_nvarchar as a aggregation property

        return this._examineDateAttribute(normalizedFast, config);
    }

    //Examine all the attributes (groupby, orderby, measure) in the definitions
    private _examineDateAttribute(normalizedFast, config) {
        normalizedFast.def.forEach((definitionItem) => {
            if (definitionItem.expression) {
                if (definitionItem.expression.groupBy) {
                    this._wrapStringFunctionForDateAttribute(
                        definitionItem.expression.groupBy,
                        config
                    );
                }

                if (definitionItem.expression.orderBy) {
                    this._wrapStringFunctionForDateAttribute(
                        definitionItem.expression.orderBy,
                        config
                    );
                }

                if (definitionItem.expression.measure) {
                    this._wrapStringFunctionForDateAttribute(
                        definitionItem.expression.measure,
                        config
                    );
                }
            }
        });
        return normalizedFast;
    }

    //If date or datetime attribute create
    private _wrapStringFunctionForDateAttribute(list, config) {
        list.forEach((item) => {
            let dataType = this._getDataTypeOfOneAttribute(item.alias, config);
            if (dataType === "time" || dataType === "datetime") {
                item.aggregation = "TO_NVARCHAR(%Q)";
            }
        });
    }

    //Get the Data Type of an attribute.
    private _getDataTypeOfOneAttribute(path, config) {
        try {
            path = path.replace(".1", "");
            let matchFunction = utilsLib.getJsonWalkFunction(config);
            return matchFunction(path)[0].obj.type;
        } catch (e) {
            return "";
        }
    }

    /**Returns modified placeholder configuration in order to retrieve interaction id as part of dataset */
    private _getTempTableConfigurations(
        configuration,
        pHolderTable,
        tempTableName: string
    ) {
        //Modifies placeholder table to use temporary table
        const tempTablePholderTable = JSON.parse(JSON.stringify(pHolderTable));
        const tempTableConfig = JSON.parse(JSON.stringify(configuration));
        tempTablePholderTable[
            this.settings.getFactTablePlaceholder()
        ] = `${tempTableName}`;

        //Modifies CDM config, inject interaction_id attributes
        let jsonWalker = utilsLib.getJsonWalkFunction(tempTableConfig);
        let elements = jsonWalker("**.interactions.**.attributes");

        // insert interaction_id attribute in cdm config
        elements.forEach((element) => {
            let attributes = utilsLib.getObjectByPath(
                tempTableConfig,
                element.path
            );
            const parentPathArr = element.path.split(".");
            parentPathArr.pop();
            let { defaultPlaceholder } = utilsLib.getObjectByPath(
                tempTableConfig,
                parentPathArr.join(".")
            );
            attributes._interaction_id = {
                name: [
                    {
                        lang: "",
                        value: "Interaction ID",
                    },
                ],
                type: "text",
                expression: `${defaultPlaceholder}.${
                    tempTablePholderTable[
                        `${defaultPlaceholder}.INTERACTION_ID`
                    ]
                }`,
            };
        });

        return {
            tempTablePholderTable,
            tempTableConfig,
        };
    }

    private _enrichPatientListIFRRequest(ifrRequest) {
        // add PID if it does not exist
        if (
            ifrRequest.axes &&
            !ifrRequest.axes.find((r) => r.id === "patient.attributes.pid")
        ) {
            ifrRequest = this._addPIDAxis(ifrRequest);
        }
        ifrRequest = this._addInteractionId(ifrRequest);

        let req;
        if (ifrRequest.constructor !== Array) {
            req = [ifrRequest];
        } else {
            req = ifrRequest;
        }
        if (req[0].normalizeCsv) {
            ifrRequest[`normalizeCsv`] = req[0].normalizeCsv;
            ifrRequest[`forCsvDownload`] = this.forCsvDownload;
        }
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

    private _isEmptyRequest(request) {
        if (utilsLib.deepEquals(request, { patient: {} })) {
            return true;
        }
        if (utilsLib.deepEquals(request, {})) {
            return true;
        }
        return false;
    }
}
