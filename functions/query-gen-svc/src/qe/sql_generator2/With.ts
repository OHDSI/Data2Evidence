import { AstElement } from "./AstElement";
import { Def } from "./Def";
import { Query } from "./Query";
import { EntityConfig } from "../qe_config_interface/EntityConfig";
import { Utils } from "./Utils";
import { isPropExists, getUniqueSeperatorString } from "@alp/alp-base-utils";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

export class With extends AstElement {
    public entityConfig: EntityConfig;
    private joinElements = {};

    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);

        if (!isPropExists(node, "alias")) {
            throw new Error("[WITH] alias does not exists");
        }

        if (!isPropExists(node, "expression")) {
            throw new Error("[WITH] expression does not exists");
        }

        if (!isPropExists(node, "type")) {
            throw new Error("[WITH] type does not exists");
        }
    }

    public getInteractionName(): string {
        return this.entityConfig.__config.interactionName;
    }

    public getBaseEntity(): string {
        return this.entityConfig.getBaseEntity();
    }

    public getDefaultFilter(): string {
        return this.entityConfig.__config.defaultFilter;
    }

    public getInteractionIdColumn(baseEntity: string): string {
        return (
            '"patient.' +
            this.node.alias +
            '"' +
            "." +
            AstElement.getConfig().getColumn(`${baseEntity}.INTERACTION_ID`)
        );
    }

    public getConditionName(): string {
        return this.entityConfig.getConditionName();
    }

    public getConditionIdColumn(baseEntity: string): string {
        return (
            '"patient.' +
            this.node.alias +
            '"' +
            "." +
            AstElement.getConfig().getColumn(`${baseEntity}.CONDITION_ID`)
        );
    }

    public getPatientIdColumn(baseEntity: string): string {
        return (
            '"patient.' +
            this.node.alias +
            '"' +
            "." +
            AstElement.getConfig().getColumn(`${baseEntity}.PATIENT_ID`)
        );
    }

    public getScopeConfigAndAliasEntityMapping() {
        let defRoot = this.resolveDefChild(this.parent);
        if (defRoot != null) {
            let defNode = defRoot.parent;
            if (defNode instanceof Def) {
                defNode.addEntity(this.node.alias, this);
            }
        }
    }

    public getAttributeConfig() {
        if (this.node.expression && this.node.expression.getType() === "ExpressionRef") {
            return
        }
        let self = this;
        let defaultFilter: string = this.getDefaultFilter();
        if (defaultFilter) {
            let df = defaultFilter.replace(/@[^.^\s]+/g, (x) => {
                let tmp = self.getTableAlias(
                    self.entityConfig.placeholderMap[x] +
                        getUniqueSeperatorString() +
                        self.entityConfig.getDefaultFilterHash()
                );
                return tmp ? tmp.alias : null;
            });

            if (df !== defaultFilter) {
                self.addOnFilter(QueryObject.format("%UNSAFE", df));
            }
        }
    }

    public addTableAlias(
        tableObj: { baseEntity: string; table: string },
        basetable,
        joinType = "LEFT JOIN"
    ) {
        if (!(tableObj.table in this.joinElements)) {
            let tablealiasArr = tableObj.table.split(".");
            let tablealias = tablealiasArr[tablealiasArr.length - 1]
                .replace(/"/g, "")
                .replace(/'/g, "")
                .replace("::", "");
            this.joinElements[tableObj.table] = {
                alias: '"patient.' + this.node.alias + "" + tablealias + '"',
                on: [],
                basetable: false,
                joinType,
                baseEntity: tableObj.baseEntity,
            };

            // In case for a left join, the tables have to be joined based on condition id
            if (this.node.joinUsingConditionId) {
                this.joinElements[tableObj.table].joinUsingConditionId =
                    this.node.joinUsingConditionId;
            }
            if (this.getBaseTableAlias()) {
                if (tableObj.baseEntity === "@REF" || tableObj.baseEntity === "@TEXT") {
                    // For @REF - This is a special case where there is no explicit base join condition between @REF and other base entity. Its usually 1=1. Because @REF is not a standard interaction entity rather a special entity for vocab lookup. The additional join condition between @REF & base entity would be configured in the attribute config as part of the defaultFilter / Filter expression in the UI.

                    // For @TEXT - Its for Including descendant concepts and the joining key is added in property.ts
                    this.addBaseTableJoinForRef(
                        tableObj,
                        this.getDefaultFilter()
                    );
                } else {
                    this.addBaseTableJoin(tableObj.table);
                }
            }
        } else if (joinType !== "LEFT JOIN") {
            if (this.joinElements[tableObj.table].joinType !== "left join") {
                this.joinElements[tableObj.table].joinType = joinType;
            }
        }

        let parentJoinCondition = "";

        if (basetable) {
            this.joinElements[tableObj.table].alias =
                '"patient.' + this.node.alias + '"';
            this.joinElements[tableObj.table].basetable = true;
            this.addBaseTableJoins();
            let queryNode = this.resolveQuery(this.parent);
            this.parent.addScopeTableFilterMapping(
                this.node.alias,
                tableObj.table
            );
            if (queryNode instanceof Query) {
                let joinState = queryNode.joinState;
                if (
                    (this.getType() === "With") ||
                    this.node.joinUsingConditionId
                ) {
                    if(tableObj.baseEntity === "@EXPRESSIONREF") {
                        parentJoinCondition = joinState.getPatientId() +
                        " = " + `"patient.${tableObj.table}"."patient.attributes.pid"`;
                    } else if (joinState.getConditionId(this.getConditionName())) {
                        parentJoinCondition =
                            joinState.getConditionId(this.getConditionName()) +
                            " = " +
                            this.getConditionIdColumn(tableObj.baseEntity);
                    } else {
                        parentJoinCondition =
                            joinState.getPatientId() +
                            " = " +
                            this.getPatientIdColumn(tableObj.baseEntity);

                        // Add Entry Exit CAST(CURRENT_DATE AS DATE)
                        if(Object.keys(this.parent.parent.aliasEntityMap).includes("PatientRequestEntryExit")) {
                            const dimPlaceHolderTableMap = this.entityConfig.getTableTypePlaceholderMap(tableObj.baseEntity)
                            if(dimPlaceHolderTableMap?.time) {
                                parentJoinCondition += ` AND 
                                                            CAST("patient.${this.node.alias}".${this.entityConfig.placeholderMap[`${tableObj.baseEntity}.START`]} AS DATE) >= CAST("patient.PatientRequestEntryExit"."entry" AS DATE) AND 
                                                            CAST("patient.${this.node.alias}".${this.entityConfig.placeholderMap[`${tableObj.baseEntity}.END`]} AS DATE) <= CAST("patient.PatientRequestEntryExit"."exit" AS DATE)`
                            }
                        }
                        joinState.setConditionId(this);
                    }
                } else {
                    parentJoinCondition =
                        joinState.getPatientId() +
                        " = " +
                        this.getPatientIdColumn(tableObj.baseEntity);

                    // Add Entry Exit CAST(CURRENT_DATE AS DATE)
                    if(Object.keys(this.parent.parent.aliasEntityMap).includes("PatientRequestEntryExit")) {
                        const dimPlaceHolderTableMap = this.entityConfig.getTableTypePlaceholderMap(tableObj.baseEntity)
                        if(dimPlaceHolderTableMap?.time) {
                            parentJoinCondition += ` AND 
                                                        CAST("patient.${this.node.alias}".${this.entityConfig.placeholderMap[`${tableObj.baseEntity}.START`]} AS DATE) >= CAST("patient.PatientRequestEntryExit"."entry" AS DATE) AND 
                                                        CAST("patient.${this.node.alias}".${this.entityConfig.placeholderMap[`${tableObj.baseEntity}.END`]} AS DATE) <= CAST("patient.PatientRequestEntryExit"."exit" AS DATE)`
                        }
                    }
                }
            }
            this.joinElements[tableObj.table].on.push(
                QueryObject.format("%UNSAFE", parentJoinCondition)
            );
        }
    }

    public addOnFilter(queryObj) {
        let expression = queryObj.queryString;
        let tables_used = Object.keys(this.joinElements).filter(
            (x) =>
                expression.search(new RegExp(this.joinElements[x].alias)) >=
                    0 && !this.joinElements[x].basetable
        );
        if (tables_used.length > 0) {
            if (this.getType() === "With" || this.getType() === "LeftJoin") {
                this.joinElements[tables_used[0]].on.push(queryObj);
            } else {
                this.joinElements[this.getBaseTableAlias()].on.push(queryObj);
            }
        } else {
            this.joinElements[this.getBaseTableAlias()].on.push(queryObj);
        }
    }

    public addOnFilterWithOperand(operand) {
        // To Review
        if (operand.__type === "And") {
            operand.node.operand.forEach((element) => {
                this.addOnFilterWithOperand(element);
            });
        } else {
            this.addOnFilter(operand.getSQL());
        }
    }

    public addBaseTableJoin(tableName: string) {
        let interactionIdColumn = AstElement.getConfig().getColumn(
            this.entityConfig.getBaseEntity() + ".INTERACTION_ID"
        );
        let referenceInteractionIdColumn = AstElement.getConfig().getColumn(
            `${this.joinElements[tableName].baseEntity}.INTERACTION_ID`
        );
        let baseTableJoin =
            this.getTableAlias(this.getBaseTableAlias()).alias +
            "." +
            interactionIdColumn +
            " = " +
            this.joinElements[tableName].alias +
            "." +
            referenceInteractionIdColumn;

        this.joinElements[tableName].on.push(
            QueryObject.format("%UNSAFE", baseTableJoin)
        );
    }

    public addBaseTableJoinForRef(
        tableObj: { baseEntity: string; table: string },
        defaultFilter: string
    ) {
        let baseTableJoin = defaultFilter;
        this.joinElements[tableObj.table].on.push(
            QueryObject.format("%UNSAFE", baseTableJoin)
        );
    }

    public addBaseTableJoins() {
        Object.keys(this.joinElements).map((x) =>
            !this.joinElements[x].basetable ? this.addBaseTableJoin(x) : -1
        );
    }

    public getTableAlias(table) {
        if (this.parent.getType() === "Query") {
            if (table in this.parent.sourceTable) {
                return this.parent.sourceTable[table];
            }
        }
        return this.joinElements[table];
    }

    public getTableAliasByBaseEntity(baseEntity: string) {
        const key = Object.keys(this.joinElements)
                                .find(key => this.joinElements[key].baseEntity === baseEntity)
        return this.joinElements[key].alias;
    }

    public getBaseTableAlias() {
        let tmp = Object.keys(this.joinElements).filter(
            (x) => this.joinElements[x].basetable
        );
        if (tmp.length !== 1) {
            return null;
        }
        return tmp[0];
    }

    public afterVisit() {
        if (
            "suchThat" in this.node &&
            this.node.suchThat.getSQL().queryString !== ""
        ) {
            let queryParent = <Query>this.resolveQuery(this.parent);
            this.getType() === "With"
                ? queryParent.addWhere(this.node.suchThat)
                : this.addOnFilterWithOperand(this.node.suchThat);
        }

        //If there are expressions present for "JoinOn", then they would be part of the "ON" clause in sql join
        if (
            "joinOn" in this.node &&
            this.node.joinOn.getSQL().queryString !== ""
        ) {
            this.addOnFilterWithOperand(this.node.joinOn);
        }
        super.afterVisit();
    }

    public getSQL() {
        this.handleEntryExitJoin(this)
        let that = this;
        let nonBaseTablesJoinCount = 0;
        let nonBaseTablesJoin = QueryObject.format("").join(
            Object.keys(this.joinElements).map((joins) => {
                if (!that.joinElements[joins].basetable) {
                    nonBaseTablesJoinCount++;

                    let filteredOn = that
                        .getTableAlias(joins)
                        .on.filter(
                            (x) =>
                                x.queryString !== "" && x.queryString !== "TRUE"
                        );

                    if (filteredOn.length > 0) {
                        return QueryObject.format(
                            " %UNSAFE %UNSAFE %UNSAFE ON (%Q)",
                            that.getType() === "With"
                                ? that.getTableAlias(joins).joinType
                                : that.getType() === "LeftJoin"
                                ? "LEFT JOIN"
                                : "JOIN",
                            joins.split(getUniqueSeperatorString())[0],
                            that.getTableAlias(joins).alias,
                            QueryObject.format(" AND ").join(filteredOn)
                        );
                    } else {
                        return QueryObject.format(
                            " JOIN %UNSAFE %UNSAFE ",
                            joins.split(getUniqueSeperatorString())[0],
                            that.getTableAlias(joins).alias
                        );
                    }
                } else {
                    return QueryObject.format("");
                }
            })
        );

        return QueryObject.format("").join(
            Object.keys(this.joinElements).map((joins) => {
                if (!that.joinElements[joins].basetable) {
                    return QueryObject.format("");
                }

                let filteredOn = that
                    .getTableAlias(joins)
                    .on.filter(
                        (x) => x.queryString !== "" && x.queryString !== "TRUE"
                    );
                if (filteredOn.length > 0) {
                    return QueryObject.format(
                        " %UNSAFE %UNSAFE %UNSAFE %UNSAFE %Q %UNSAFE ON (%Q)",
                        that.getType() === "With"
                            ? that.joinElements[joins].basetable
                                ? "INNER JOIN"
                                : that.getTableAlias(joins).joinType
                            : that.joinElements[joins].basetable
                            ? "LEFT JOIN"
                            : "INNER JOIN",
                        nonBaseTablesJoinCount > 0 ? "(" : "",
                        joins.split(getUniqueSeperatorString())[0],
                        that.getTableAlias(joins).alias,
                        nonBaseTablesJoin,
                        nonBaseTablesJoinCount > 0 ? ")" : "",
                        QueryObject.format(" AND ").join(filteredOn)
                    );
                } else {
                    return QueryObject.format(
                        " INNER JOIN %UNSAFE %UNSAFE %Q",
                        joins.split(getUniqueSeperatorString())[0],
                        that.getTableAlias(joins).alias,
                        nonBaseTablesJoin
                    );
                }
            })
        );
    }

    private handleEntryExitJoin(node: With){
        //Detect if its PatientEntryExitRequest
        if(node.parent.joinState["patientId"].indexOf("PEE") > -1) {
            Object.keys(node.joinElements).forEach((interaction) => {
                node.joinElements[interaction].on.forEach((queryObject) => {
                    if(queryObject.queryString.indexOf("entry") > -1 || queryObject.queryString.indexOf("exit") > -1){
                        let conditionTokens = queryObject.queryString.split(" AND ")
                        conditionTokens = conditionTokens.filter((condition) => {
                            return (condition.indexOf("entry") === -1 && condition.indexOf("exit") === -1)
                        })
                        queryObject.queryString =  conditionTokens.join(" AND ")
                    }
                })
            })
        }
    }
}
