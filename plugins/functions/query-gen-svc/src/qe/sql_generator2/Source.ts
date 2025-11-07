import { AstElement } from "./AstElement";
import { EntityConfig } from "../qe_config_interface/EntityConfig";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { getUniqueSeperatorString } from "@alp/alp-base-utils";
import { Query } from "./Query";

export class Source extends AstElement {
    public entityConfig: EntityConfig;
    private joinElements = {};

    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);
    }

    public getScopeConfigAndAliasEntityMapping() {
        if (this.parent.getType() === "Query") {
            if (this.parent.parent.getType() === "def") {
                this.parent.parent.addEntity(this.node.alias, this);
            }
        }
    }

    public getAttributeConfig() {
        if (this.parent.getType() === "Query") {
            this.parent.addScopeTableFilterMapping(
                this.node.alias,
                this.entityConfig.getContextTable()
            );
            this.parent.sourceTable[
                this.entityConfig.getContextTable().toString()
            ] = { alias: this.node.alias };
        }
    }

    public addTableAlias(
        tableObj: { baseEntity: string; table: string },
        ignoreThisParameter = false,
        joinType = "LEFT JOIN"
    ) {
        if (!(tableObj.table in this.joinElements)) {
            let tablealiasArr = tableObj.table.split(".");
            let tablealias = tablealiasArr[tablealiasArr.length - 1]
                .replace(/"/g, "")
                .replace(/'/g, "")
                .replace("::", "");
            this.joinElements[tableObj.table] = {
                alias: this.node.alias + "" + tablealias,
                on: [],
                basetable: false,
                joinType,
            };

            let queryNode = this.resolveQuery(this.parent);
            if (queryNode instanceof Query) {
                //This is a special case where there is no explicit base join condition between @REF and other base entity. Its usually 1=1. Because @REF is not a standard interaction entity rather a special entity for vocab lookup. The additional join condition between @REF & base entity would be configured in the attribute config as part of the defaultFilter / Filter expression in the UI.
                let parentJoinCondition = "1=1";
                if (!tableObj.baseEntity.startsWith("@REF")) {
                    let joinState = queryNode.joinState;
                    parentJoinCondition =
                        joinState.getPatientId() +
                        " = " +
                        this.joinElements[tableObj.table].alias +
                        "." +
                        AstElement.getConfig().getColumn(
                            `${tableObj.baseEntity}.PATIENT_ID`
                        );
                }

                this.joinElements[tableObj.table].on.push(
                    QueryObject.format("%UNSAFE", parentJoinCondition)
                );
            }
        } else if (joinType !== "LEFT JOIN") {
            if (this.joinElements[tableObj.table].joinType !== "left join") {
                this.joinElements[tableObj.table].joinType = joinType;
            }
        }
    }

    public getTableAlias(table) {
        if (this.parent.getType() === "Query") {
            if (table in this.parent.sourceTable) {
                return this.parent.sourceTable[table];
            }
        }
        return this.joinElements[table];
    }

    public getSQL() {
        let self = this;
        let baseSource =
            "expression" in this.node
                ? QueryObject.format(
                      "%UNSAFE %UNSAFE",
                      this.node.expression.getSQL(),
                      this.node.alias
                  )
                : QueryObject.format(
                      "[5B8A6B69] No Expression found %UNSAFE",
                      this.node.alias
                  );
        let sourceTables = baseSource;

        Object.keys(this.joinElements).forEach((x) => {
            sourceTables = sourceTables.concat(
                QueryObject.format(
                    " %UNSAFE %UNSAFE %UNSAFE ON (%Q) ",
                    self.joinElements[x].joinType,
                    x.split(getUniqueSeperatorString())[0],
                    self.joinElements[x].alias,
                    QueryObject.format(" AND ").join(self.joinElements[x].on)
                )
            );
        });
        return sourceTables;
    }
}
