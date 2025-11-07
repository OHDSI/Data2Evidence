import { AstElement } from "./AstElement";
import { JoinState } from "./JoinState";
import { Operator } from "./Operator";
import { QueryObject as qo, assert, isPropExists } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { Statement } from "./Statement";

export class Query extends AstElement {
    public joinState: JoinState;
    public sourceTable = {};
    public scopeTableFilterMapping = {};
    private whereList: Operator[];

    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);

        if (!isPropExists(node, "groupBy")) {
            throw new Error("[EXPRESSION] groupBy does not exists");
        }
        if (!isPropExists(node, "source")) {
            throw new Error("[EXPRESSION] source does not exists");
        }
        if (!isPropExists(node, "type")) {
            throw new Error("[EXPRESSION] type does not exists");
        }
        let patient = AstElement.getConfig()
            .getSettings()
            .getFactTablePlaceholder();
        this.joinState = new JoinState(
            `${this.getSourceAlias()}.${AstElement.getConfig().getColumn(
                patient + ".PATIENT_ID"
            )}`
        );
        this.whereList = new Array<Operator>();
    }

    public addScopeTableFilterMapping(scope: string, table) {
        this.scopeTableFilterMapping[scope] = table;
    }

    public getScopeTableFilterMapping(scope: string) {
        return this.scopeTableFilterMapping[scope];
    }

    public getSourceAlias() {
        return this.node.source[0].node.alias;
    }

    public addWhere(operator: Operator) {
        this.whereList.push(operator);
    }

    public resolveDefChild(cur_parent: AstElement) {
        if (cur_parent.parent === null) {
            return null;
        } else if (cur_parent.parent.name === "def") {
            return cur_parent;
        } else {
            return this.resolveDefChild(cur_parent.parent);
        }
    }

    public beforeVisit() {
        let statement = <Statement>(
            this.resolveStatementChild(this.parent).parent
        );

        if (statement != null) {
            statement.addContextDep(this.getID());
        }
    }

    public getSQL(format: number) {
        let queryObjects = [];

        queryObjects.push(QueryObject.format("SELECT"));

        if ("groupBy" in this.node && this.node.groupBy.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    "%Q",
                    QueryObject.format(", ").join(
                        this.node.groupBy.map((x) => x.getSQLWithAlias())
                    )
                )
            );

            if (this.node.actionType === "kmquery") {
                queryObjects.push(
                    QueryObject.format(
                        ', "km.all.interactions"."KM_MAX_DATE" AS "KM_MAX_DATE"'
                    )
                );
            }
        }
        
        if (this.joinState && this.joinState["patientId"].indexOf("PEE") > -1 && this.node.measure?.length > 0) {
            queryObjects.push(
                QueryObject.format(
                    ", %Q",
                    QueryObject.format(", ").join(
                        this.node.measure.map((x) => x.getSQLWithAlias())
                    )
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

        if ("relationship" in this.node) {
            queryObjects.push(
                QueryObject.format(" ").join(
                    this.node.relationship.map((x) => x.getSQL())
                )
            );
        }

        if (this.node.actionType === "kmquery") {
            // the patient id might be different from placeholder to placeholder defaultPatientIdColumn is the alias we use
            let defaultPatientIdColumn: string = "KM_PATIENT_ID";

            let patient = AstElement.getConfig()
                .getSettings()
                .getFactTablePlaceholder();
            let patientTablePIDColumn: string =
                AstElement.getConfig().getColumn(`${patient}.PATIENT_ID`);

            //Query Structure (If both default and custom interactions exist)
            /*Select Field1, Field2 from (
                (default interactions)
                    union (custom interaction..1)
                    union (custom interaction..n)
                ) "tablename" group by Field1, Field2
            */

            //Default Interaction
            if (
                this.node.kmParams.node.filterList &&
                this.node.kmParams.node.filterList.length > 0
            ) {
                let kmInteractions: any[] = [];

                AstElement.getConfig()
                    .getSettings()
                    .getDimTablePlaceholders()
                    .forEach((placeholder) => {
                        let defaultInteractionExist: boolean = false;
                        let customInteractionExist: boolean = false;
                        let placeholderFilterList =
                            this.node.kmParams.node.filterList.filter(
                                (kmfilter) => {
                                    if (!Deno.env.get("TESTSCHEMA")) {
                                        assert(
                                            kmfilter.node.kmBasePlaceholder,
                                            "Error kmBasePlaceholder is null"
                                        );
                                    }
                                    if (kmfilter.node.kmBasePlaceholder) {
                                        return (
                                            kmfilter.node.kmBasePlaceholder ===
                                            placeholder
                                        );
                                    } else {
                                        return placeholder === "@INTERACTION";
                                    }
                                }
                            );
                        if (placeholderFilterList.length > 0) {
                            let kmWhere = QueryObject.format(
                                `${AstElement.getConfig().getColumn(
                                    placeholder + ".END"
                                )} <= CURRENT_DATE`
                            );
                            let patientIdColumn: string =
                                AstElement.getConfig().getColumn(
                                    placeholder + ".PATIENT_ID"
                                );

                            placeholderFilterList.forEach((item) => {
                                if (
                                    item.node.customTable === false &&
                                    !defaultInteractionExist
                                ) {
                                    defaultInteractionExist = true;
                                }
                                if (
                                    item.node.customTable === true &&
                                    !customInteractionExist
                                ) {
                                    customInteractionExist = true;
                                }
                            });

                            if (defaultInteractionExist) {
                                kmWhere = QueryObject.format(
                                    `${AstElement.getConfig().getColumn(
                                        placeholder + ".END"
                                    )} <= CURRENT_DATE AND (%Q)`,
                                    QueryObject.format(" OR ").join(
                                        placeholderFilterList
                                            .map((filter) => {
                                                if (
                                                    filter.node.customTable ===
                                                    false
                                                ) {
                                                    return QueryObject.format(
                                                        filter.node
                                                            .defaultFilter
                                                    );
                                                }
                                            })
                                            .filter((x) => {
                                                return typeof x !== "undefined";
                                            })
                                    )
                                );

                                kmInteractions.push(
                                    QueryObject.format(
                                        [
                                            " (SELECT %UNSAFE AS %UNSAFE ,MAX(%UNSAFE) km_max_date",
                                            "FROM %UNSAFE WHERE %Q GROUP BY %UNSAFE) ",
                                        ].join(" "),
                                        patientIdColumn,
                                        defaultPatientIdColumn,
                                        AstElement.getConfig().getColumn(
                                            placeholder + ".END"
                                        ),
                                        this.node.source[0].entityConfig
                                            .placeholderMap[placeholder],
                                        kmWhere,
                                        patientIdColumn
                                    )
                                );
                            }

                            if (customInteractionExist) {
                                placeholderFilterList.forEach((interaction) => {
                                    if (interaction.node.customTable === true) {
                                        let kmCustomWhere = QueryObject.format(
                                            `${AstElement.getConfig().getColumn(
                                                placeholder + ".END"
                                            )} <= CURRENT_DATE AND (%Q)`,
                                            QueryObject.format(
                                                interaction.node.defaultFilter
                                            )
                                        );

                                        kmInteractions.push(
                                            QueryObject.format(
                                                [
                                                    " (SELECT %UNSAFE AS %UNSAFE ,MAX(%UNSAFE) km_max_date",
                                                    "FROM %UNSAFE WHERE %Q GROUP BY %UNSAFE) ",
                                                ].join(" "),
                                                patientIdColumn,
                                                defaultPatientIdColumn,
                                                AstElement.getConfig().getColumn(
                                                    placeholder + ".END"
                                                ),
                                                interaction.node[placeholder],
                                                kmCustomWhere,
                                                patientIdColumn
                                            )
                                        );
                                    }
                                });
                            }
                        }
                    });

                /*if (kmInteractions.length === 1) {
                    //For those which doesnt need union and have only one kind of interaction type
                    queryObjects.push(QueryObject.format(
                        [
                            " LEFT JOIN ( %Q ) \"km.all.interactions\"",
                            "ON %UNSAFE.%UNSAFE = \"km.all.interactions\".%UNSAFE",
                        ].join(" "),
                        kmInteractions[0],
                        this.getSourceAlias(),
                        patientTablePIDColumn,
                        defaultPatientIdColumn));
                } else if (kmInteractions.length > 1) {*/

                let allInteractionsQueryObject: QueryObject;

                //prefix default interactions table
                kmInteractions.forEach((interaction, index) => {
                    if (index === 0) {
                        allInteractionsQueryObject = QueryObject.format(
                            "%Q ",
                            interaction
                        );
                    } else {
                        allInteractionsQueryObject =
                            allInteractionsQueryObject.concat(
                                QueryObject.format("  UNION %Q ", interaction)
                            );
                    }
                });

                //Merge to the final query object
                queryObjects.push(
                    QueryObject.format(
                        [
                            " LEFT JOIN ( SELECT %UNSAFE ,MAX(%UNSAFE) km_max_date FROM ",
                            '( %Q ) "allInteractions" GROUP BY %UNSAFE) "km.all.interactions"',
                            'ON %UNSAFE.%UNSAFE = "km.all.interactions".%UNSAFE',
                        ].join(" "),
                        defaultPatientIdColumn,
                        "KM_MAX_DATE",
                        allInteractionsQueryObject,
                        defaultPatientIdColumn,
                        this.getSourceAlias(),
                        patientTablePIDColumn,
                        defaultPatientIdColumn
                    )
                );
                //}
            } else {
                // If there are no interactions selected for verifying vital status
                queryObjects.push(
                    QueryObject.format(
                        [
                            ' LEFT JOIN (SELECT null as KM_MAX_DATE FROM dummy) "km.all.interactions"',
                            "ON 1=1",
                        ].join(" ")
                    )
                );
            }
        }

        if ("where" in this.node || this.whereList.length) {
            queryObjects.push(
                QueryObject.format(
                    " WHERE %Q ",
                    QueryObject.format(" AND ").join(
                        this.whereList
                            .concat(
                                this.node.where instanceof Operator
                                    ? [this.node.where]
                                    : []
                            )
                            .map((x) => x.getSQL(format))
                    )
                )
            );
        }

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

            if (this.node.actionType === "kmquery") {
                queryObjects.push(
                    QueryObject.format(', "km.all.interactions"."KM_MAX_DATE"')
                );
            }
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

        return QueryObject.format(" ").join(queryObjects);
    }
}
