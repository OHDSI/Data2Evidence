import { AstElement } from "./AstElement";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { Literal } from "./Literal";
import { Property } from "./Property";
import { sqlFormat } from "@alp/alp-base-utils";
import { env } from "../../env";

export class Operator extends AstElement {
    constructor(
        public node,
        public path,
        public name,
        public parent,
        private op
    ) {
        super(node, path, name, parent);
    }

    public getSQL(format: number) {
        if (this.op.trim() === "IS NULL" || this.op.trim() === "IS NOT NULL") {
            return QueryObject.format(
                "(%Q %UNSAFE)",
                this.node.operand[0].getSQL(),
                this.op
            );
        } else if (this.op.trim() === "UNION") {
            switch (format) {
                case sqlFormat.NESTED:
                    return QueryObject.format(
                        " %Q ",
                        QueryObject.format(" " + this.op + " ").join(
                            this.node.operand.map((x) =>
                                QueryObject.format(
                                    "SELECT * FROM  (%Q)",
                                    x.getSQL(format)
                                )
                            )
                        )
                    );
                case sqlFormat.TEMP_RESULTSET:
                default:
                    return QueryObject.format(
                        " %Q ",
                        QueryObject.format(" " + this.op + " ").join(
                            this.node.operand.map((x) =>
                                QueryObject.format(
                                    " SELECT * FROM  %Q ",
                                    x.getSQL()
                                )
                            )
                        )
                    );
            }
        } else if (this.op.trim() === "FULL OUTER JOIN") {
            if (!this.node.operand || this.node.operand.length < 2) {
                throw new Error(
                    "Minimum 2 operands must exist in Special Xor Type"
                );
            }

            let aWithoutFirstElement = this.node.operand.slice(1); // cut off the first element from the array

            let sMainQuery = "SELECT * FROM %Q %Q ";
            let aParameters = [];
            aParameters.push(
                QueryObject.format(
                    " (SELECT * FROM  %Q) FULL OUTER JOIN ",
                    this.node.operand[0].getSQL()
                )
            );

            /*
                Full Outer join query structure will be different if
                there are just two definitions when compared to another case where
               more than two definitions are involved
            **/
            if (aWithoutFirstElement.length >= 2) {
                sMainQuery += "%Q ";
                aParameters.push(
                    QueryObject.format(" ON 1<>1 " + this.op + " ").join(
                        aWithoutFirstElement.map((x) =>
                            QueryObject.format(
                                " (SELECT * FROM  %Q) ",
                                x.getSQL()
                            )
                        )
                    )
                );
                aParameters.push(QueryObject.format(" ON 1<>1 "));
            } else {
                aParameters.push(
                    QueryObject.format(
                        " (SELECT * FROM %Q) ON 1<>1 ",
                        aWithoutFirstElement[0].getSQL()
                    )
                );
            }

            aParameters.unshift(sMainQuery); // insert it as the first element in the array
            return QueryObject.format.apply(null, aParameters);
        } else if (this.op.trim() === "CONTAINS") {
            if (!this.node.operand || this.node.operand.length !== 2) {
                throw new Error("Exactly 2 operands must exist in Contains");
            }
            let fuzzySettings = 0;

            // Get fuzziness Configuration
            let property = this.node.operand.find((x) => x instanceof Property);
            fuzzySettings = property.getConfigProperty("fuzziness");

            if (fuzzySettings) {
                return QueryObject.format(
                    "%UNSAFE(%Q, FUZZY(%UNSAFE))",
                    this.op,
                    QueryObject.format(",").join(
                        this.node.operand.map((x) => x.getSQL())
                    ),
                    fuzzySettings
                );
            } else {
                return QueryObject.format(
                    "%UNSAFE(%Q)",
                    this.op,
                    QueryObject.format(",").join(
                        this.node.operand.map((x) => x.getSQL())
                    )
                );
            }

            // contains(column1, 'catz', FUZZY(0.8))
        } else if (this.op.trim() === "DAYS_BETWEEN") {
            if (!this.node.operand || this.node.operand.length !== 2) {
                throw new Error(
                    "Exactly 2 operands must exist in Days Between"
                );
            }

            return QueryObject.format(
                "(%UNSAFE(%Q))",
                this.op,
                QueryObject.format(",").join(
                    this.node.operand.map((x) => x.getSQL())
                )
            );
        } else if (this.op.trim() === "!=" || this.name === "joinOn") {
            //To handle != check for identical filtercards. Both with & without AND / OR operators.
            if (this.op.trim() === "!=") {
                const parent =
                    this.name === "joinOn" ? this.parent : this.parent.parent;
                const baseTableAlias =
                    parent.joinElements[
                        Object.keys(parent.joinElements).find((e) => {
                            if (
                                parent.joinElements[e].alias.indexOf(
                                    parent.node.alias
                                ) > -1
                            )
                                return e;
                        })
                    ].alias;

                const baseTableJoinConditionColumn =
                    parent.entityConfig.placeholderMap[
                        `${parent.entityConfig.baseEntity}.INTERACTION_ID`
                    ];

                let qos: QueryObject[] = this.node.operand.map(
                    (identicalOperand) => {
                        return QueryObject.format(
                            ` ${baseTableAlias}.${baseTableJoinConditionColumn} != "patient.${identicalOperand.node.alias}".${baseTableJoinConditionColumn} `
                        );
                    }
                );

                return new QueryObject().join(qos);
            } else if (this.op.trim() === "AND" || this.op.trim() === "OR") {
                const sql = QueryObject.format(
                    "(%Q)",
                    QueryObject.format(" " + this.op + " ").join(
                        this.node.operand.map((x) => {
                            return QueryObject.format(x.sql.queryString);
                        })
                    )
                );
                return sql;
            } else {
                throw new Error("Invalid structure for JoinOn Type");
            }
        } else if (this.node.operand.length === 2) {
            let literal = this.node.operand.find((x) => x instanceof Literal);

            if (literal && typeof literal.node.value === "string") {
                let IDCompare = false;
                let listOfIDColumns = AstElement.getConfig().getIDColumns();
                this.node.operand.forEach((element) => {
                    if (
                        listOfIDColumns.filter(
                            (val) =>
                                element.getSQL().queryString.indexOf(val) > -1
                        ).length > 0
                    ) {
                        IDCompare = true;
                    }
                });
                if (env.USE_LIKE_SEARCH === "true") {
                    this.op = "LIKE"
                }
                return QueryObject.format(
                    "(%Q)",
                    QueryObject.format(" " + this.op + " ").join(
                        this.node.operand.map((x) =>
                            x instanceof Literal && IDCompare
                                ? x.getSQLNoCase()
                                : x.getSQL()
                        )
                    )
                );
            } else {
                return QueryObject.format(
                    "(%Q)",
                    QueryObject.format(" " + this.op + " ").join(
                        this.node.operand.map((x) => x.getSQL())
                    )
                );
            }
        } else if (this.node.operand.length === 1) {
            return QueryObject.format(
                "(%UNSAFE(%Q))",
                this.op,
                QueryObject.format(",").join(
                    this.node.operand.map((x) => x.getSQL())
                )
            );
        } else if (this.node.operand.length > 2) {
            return QueryObject.format(
                "(%Q)",
                QueryObject.format(" " + this.op + " ").join(
                    this.node.operand.map((x) => x.getSQL())
                )
            );
        } else {
            return QueryObject.format("");
        }
    }
}
