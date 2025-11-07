import { AstElement } from "./AstElement";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

import { sqlFormat, TextLib } from "@alp/alp-base-utils";

export class Aggregation extends AstElement {
    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);
    }

    getSQL(format: number = sqlFormat.TEMP_RESULTSET) {
        let queryObjects = [];

        if (this.parent.node.name === "PatientCount") {
            this.getTPCSQL(queryObjects);
        } else {
            switch (this.node.actionType) {
                case "totalpcount":
                    this.getTPCSQL(queryObjects);
                    break;
                case "kmquery":
                    this.getKMSQL(queryObjects, format);
                    break;
                case "genomics_values_service":
                    this.getVBSQL(queryObjects, format);
                    break;
                default:
                    this.getDefaultSQL(queryObjects, format);
            }
        }

        this.getLimitAndOffset(queryObjects);

        return QueryObject.format(" ").join(queryObjects);
    }

    getDefaultSQL(queryObjects: any[], format: number) {
        if ("measure" in this.node && this.node.measure.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    " %Q",
                    QueryObject.format(", ").join(
                        this.node.measure.map((x) => x.getSQLWithAlias())
                    )
                )
            );
        }
        if ("groupBy" in this.node && this.node.groupBy.length > 0) {
            queryObjects.length === 0
                ? queryObjects.push(
                      QueryObject.format(
                          " %Q",
                          QueryObject.format(", ").join(
                              this.node.groupBy.map((x) => x.getSQLWithAlias())
                          )
                      )
                  )
                : queryObjects.push(
                      QueryObject.format(
                          ", %Q",
                          QueryObject.format(", ").join(
                              this.node.groupBy.map((x) => x.getSQLWithAlias())
                          )
                      )
                  );
        }
        queryObjects.push(
            QueryObject.format(
                " FROM %Q",
                QueryObject.format("").join(
                    this.node.source.map((x) => x.getSQL(format))
                )
            )
        );

        if ("groupBy" in this.node && this.node.groupBy.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    " GROUP BY %Q",
                    QueryObject.format(", ").join(
                        this.node.groupBy
                            .map((x) => x.getSQL(format))
                            .filter((x) => x !== "ERROR")
                    )
                )
            );
        }
        if ("having" in this.node && this.node.having.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    " HAVING %Q ",
                    QueryObject.format(" AND ").join(
                        this.node.having
                            .map((x) => x.getSQL(format))
                            .filter((x) => x !== "ERROR")
                    )
                )
            );
        }
        if ("orderBy" in this.node && this.node.orderBy.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    " ORDER BY %Q ",
                    QueryObject.format(", ").join(
                        this.node.orderBy
                            .map((x) =>
                                QueryObject.format(
                                    "%Q %UNSAFE",
                                    x.getSQL(format),
                                    x.node.order
                                )
                            )
                            .filter((x) => x !== "ERROR")
                    )
                )
            );
        }
        queryObjects.unshift(QueryObject.format("SELECT"));
    }

    getTPCSQL(queryObjects: any[]) {
        if ("measure" in this.node && this.node.measure.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    "SELECT %Q",
                    QueryObject.format(", ").join(
                        this.node.measure.map((x) =>
                            x.getNonMeasureSQLWithAlias()
                        )
                    )
                )
            );
        }
        let grpByY = this.node.groupBy
            ? this.node.groupBy.filter((x) => x.node.axis === "y")
            : [];
        let grpByX = this.node.groupBy
            ? this.node.groupBy.filter((x) => x.node.axis === "x")
            : [];
        //grpByY handles custom attribute pid inserted for aggregation alias identification at TPC endpoint
        if (grpByY.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    ", %Q",
                    QueryObject.format(", ").join(
                        grpByY.map((x) => x.getNonMeasureSQLWithAlias())
                    )
                )
            );
        }
        if (grpByX.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    ',COUNT(1) over(partition by %Q ) as "gr_cnt"',
                    QueryObject.format(", ").join(grpByX.map((x) => x.getSQL()))
                )
            );
        } else {
            queryObjects.push(
                QueryObject.format(
                    ',COUNT(1) over(partition by CURRENT_USER )  as "gr_cnt"'
                )
            );
        }

        queryObjects.push(
            QueryObject.format(
                " FROM %Q",
                QueryObject.format("").join(
                    this.node.source.map((x) => x.getSQL())
                )
            )
        );

        if ("groupBy" in this.node && this.node.groupBy.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    " GROUP BY %Q",
                    QueryObject.format(", ").join(
                        this.node.groupBy
                            .map((x) => x.getSQL())
                            .filter((x) => x !== "ERROR")
                    )
                )
            );
        }
        if ("having" in this.node && this.node.having.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    " HAVING %Q ",
                    QueryObject.format(" AND ").join(
                        this.node.having
                            .map((x) => x.getSQL())
                            .filter((x) => x !== "ERROR")
                    )
                )
            );
        }
    }

    getLimitAndOffset(queryObjects: any[]) {
        if ("limit" in this.node) {
            queryObjects.push(QueryObject.format("LIMIT %l", this.node.limit));
        }
        if ("offset" in this.node) {
            queryObjects.push(
                QueryObject.format("OFFSET %l", this.node.offset)
            );
        }
    }

    getKMSQL(queryObjects: any[], format: number) {
        let survivalDays = QueryObject.format(
            'DAYS_BETWEEN("KM_START", IFNULL("KM_END", "KM_MAX_DATE"))'
        );
        let censored = QueryObject.format(
            'CASE WHEN "KM_END" IS NULL THEN 1 ELSE 0 END'
        );
        let event = QueryObject.format(
            'CASE WHEN "KM_END" IS NULL THEN 0 ELSE 1 END'
        );
        let startDate = QueryObject.format('"KM_START"');
        let endDate = QueryObject.format('IFNULL("KM_END","KM_MAX_DATE")');

        let kmSelect = [
            QueryObject.format('%Q AS "SurvivalDays"', survivalDays),
            QueryObject.format('%Q AS "Censored"', censored),
            QueryObject.format('%Q AS "Event"', event),
            QueryObject.format('%Q AS "Start_Date"', startDate),
            QueryObject.format('%Q AS "End_Date"', endDate),
        ];

        let kmGroup = [survivalDays, censored, event, startDate, endDate];
        let kmOrder = [survivalDays, censored, event, startDate, endDate];

        let hasMeasure = this.node.measure && this.node.measure.length === 1;
        let measureList: QueryObject[] = [];
        let pId = this.node.measure[0].getnonAggregateExpression();

        if (hasMeasure) {
            measureList = this.node.measure
                .map((x) => x.getnonAggregateExpression())
                .filter((x) => x !== "ERROR");
            kmSelect.push(QueryObject.format(' %Q AS "Patient"', pId));
        }

        if (this.node.groupBy) {
            kmSelect.push(
                QueryObject.format(
                    ' %Q AS "Series" ',
                    QueryObject.format(
                        " || '_UNIQUE_SEPARATOR_STRING_' || "
                    ).join(
                        this.node.groupBy.map((x) =>
                            QueryObject.format(
                                "ifnull(TO_NVARCHAR(%Q), 'NoValue')",
                                x.getSQL(format)
                            )
                        )
                    )
                )
            );
        } else {
            kmSelect.push(
                QueryObject.format(' %s AS "Series" ', "CURRENT COHORT")
            );
        }

        measureList.forEach((element) => {
            kmGroup.push(element);
        });
        if (this.node.groupBy) {
            this.node.groupBy.map((x) => kmGroup.push(x.getSQL(format)));
        }

        measureList.forEach((element) => {
            kmOrder.push(element);
        });
        if (this.node.groupBy) {
            this.node.groupBy.map((x) => kmOrder.push(x.getSQL(format)));
        }

        queryObjects.push(
            QueryObject.format(
                "SELECT DISTINCT %Q ",
                QueryObject.format("%Q", QueryObject.format(",").join(kmSelect))
            )
        );
        queryObjects.push(
            QueryObject.format(
                " FROM %Q ",
                QueryObject.format("").join(
                    this.node.source.map((x) => x.getSQL(format))
                )
            )
        );
        queryObjects.push(
            new QueryObject(` WHERE "gr_cnt" >= %(censoringThreshold)UNSAFE `)
        );
        queryObjects.push(
            QueryObject.format(
                " GROUP BY %Q ",
                QueryObject.format("%Q", QueryObject.format(",").join(kmGroup))
            )
        );
        queryObjects.push(
            QueryObject.format(
                " ORDER BY %Q ",
                QueryObject.format(
                    "%Q ASC",
                    QueryObject.format(",").join(kmOrder)
                )
            )
        );
    }

    getVBSQL(queryObjects: any[], format: number) {
        let sample_id = null;
        let cohort = null;

        if (this.node.groupBy) {
            let lastGroupByIndex = this.node.groupBy.length - 1;
            sample_id = this.node.groupBy[lastGroupByIndex].getSQL();

            let groupByExcludeLast = [];
            for (let i = 0; i < lastGroupByIndex; i++) {
                groupByExcludeLast.push(this.node.groupBy[i]);
            }
            if (groupByExcludeLast.length > 0) {
                cohort = QueryObject.format(" || ',' || ").join(
                    groupByExcludeLast.map((x) =>
                        QueryObject.format(
                            "COALESCE(TO_NVARCHAR(%Q), 'NoValue')",
                            x.getSQL(format)
                        )
                    )
                );
            } else {
                cohort = QueryObject.format(
                    "%s",
                    TextLib.getText("MRI_PA_SERVICES_CURRENT_COHORT")
                );
            }
        }

        let vbSelect = [
            QueryObject.format('%Q AS "COHORT"', cohort),
            QueryObject.format('%Q AS "SAMPLE_ID"', sample_id),
        ];

        queryObjects.push(
            QueryObject.format(
                "SELECT DISTINCT %Q ",
                QueryObject.format("%Q", QueryObject.format(",").join(vbSelect))
            )
        );

        queryObjects.push(
            QueryObject.format(
                " FROM %Q ",
                QueryObject.format("").join(
                    this.node.source.map((x) => x.getSQL(format))
                )
            )
        );
    }
}
