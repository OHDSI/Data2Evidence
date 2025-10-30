import { AstElement } from "./AstElement";
import { Def } from "./Def";
import { Query } from "./Query";
import { isPropExists } from "@alp/alp-base-utils";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { With } from "./With";
import { AttributeConfig } from "../qe_config_interface/AttributeConfig";
import { Operator } from "./Operator";

export class Property extends AstElement {
    public scopeEntityDef;
    public attrConfig: AttributeConfig;

    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);

        if (!isPropExists(node, "path")) {
            throw new Error("[PROPERTY] path does not exists");
        }
        if (!isPropExists(node, "scope")) {
            throw new Error("[PROPERTY] scope does not exists");
        }

        this.path = node.path;
    }

    public getConfigProperty(property) {
        if (this.attrConfig && this.attrConfig.getConfig()) {
            return this.attrConfig.getConfig()[property];
        } else {
            return null;
        }
    }

    public getAttributeConfig() {
        let aggregationNode = this.resolveAggregation(this.parent);
        if (aggregationNode) {
            // Do Nothing
        } else {
            let defRoot = this.resolveDefChild(this.parent).parent;
            if (defRoot instanceof Def) {
                this.scopeEntityDef = defRoot.getEntity(this.node.scope);
                if (!this.scopeEntityDef) {
                    return null;
                }
                let queryNode = this.resolveQuery(this.parent);
                let scopeConfig = this.scopeEntityDef.entityConfig;
                let parentInteractionBaseEntity;

                if (this.node.path.toLowerCase() === "parent_interact_id") {
                    const parentOperand = this.parent.node.operand.find((operand) => operand.path === "INTERACTION_ID")
                    parentInteractionBaseEntity = defRoot.getEntity(parentOperand.node.scope).getBaseEntity();
                    if (!parentInteractionBaseEntity) {
                        throw new Error("parentInteraction BaseEntity undefined!")
                    }
                }

                const attrConfig = <AttributeConfig>(
                    scopeConfig.getAttribute(this.node.path, parentInteractionBaseEntity)
                );

                if (
                    this.name !== "groupBy" &&
                    (this.node.path === "start" || this.node.path === "end")
                ) {
                    if (this.node.path === "start") {
                        attrConfig.getConfig().expression =
                            "IFNULL(" +
                            attrConfig.__config.expression +
                            ", TO_DATE('0001-01-01'))";
                    }
                    if (this.node.path === "end") {
                        attrConfig.getConfig().expression =
                            "IFNULL(" +
                            attrConfig.__config.expression +
                            ", TO_DATE('9999-12-31'))";
                    }
                }

                this.attrConfig = attrConfig;
                if (!this.attrConfig.getConfig()) {
                    return null;
                }

                let joinType = "LEFT JOIN";
                if (this.parent.getType() === "IsNull") {
                    joinType = "left join";
                } else if (
                    this.parent instanceof Operator ||
                    this.attrConfig.getBaseEntity() === "@REF" //Even though its an additional query @REF is a special entity thats used now for vocab lookup and not the standard interaction.
                ) {
                    joinType = "INNER JOIN";
                }

                let that = this;

                if (attrConfig.getDefaultFilterTable()) {
                    attrConfig
                        .getTables()
                        .map((x) =>
                            this.scopeEntityDef.addTableAlias(
                                x,
                                false,
                                joinType
                            )
                        );
                    if (queryNode instanceof Query) {
                        if (attrConfig.getDefaultFilterTable()) {
                            let pars =
                                attrConfig.getDefaultFilterWithReplacedPlaceholder(
                                    (x) => {
                                        let tmp =
                                            that.scopeEntityDef.getTableAlias(
                                                x
                                            );
                                        return tmp ? tmp.alias : null;
                                    },
                                    queryNode.getScopeTableFilterMapping(
                                        this.node.scope
                                    )
                                );
                            if (attrConfig.useDefaultFilter) {
                                this.pushOnCondition(
                                    this.scopeEntityDef.getTableAlias(
                                        attrConfig.getDefaultFilterTable()
                                    ).on,
                                    QueryObject.format("%UNSAFE", pars)
                                );
                            }
                        }
                    }
                } else if (
                    attrConfig.getConfig().defaultFilter &&
                    queryNode instanceof Query
                ) {
                    let pars =
                        attrConfig.getDefaultFilterWithReplacedPlaceholder(
                            (x) => {
                                let tmp =
                                    (queryNode as Query).sourceTable[x] ||
                                    that.scopeEntityDef.getTableAlias(x);
                                return tmp ? tmp.alias : null;
                            },
                            queryNode.getScopeTableFilterMapping(
                                this.node.scope
                            )
                        );
                    if (attrConfig.useDefaultFilter) {
                        this.pushOnCondition(
                            this.scopeEntityDef.getTableAlias(
                                attrConfig.getDefaultFilterTable()
                            ).on,
                            QueryObject.format("%UNSAFE", pars)
                        );
                    }
                } else if (attrConfig.getExpressionTable()) {
                    attrConfig
                        .getTables()
                        .map((x) =>
                            this.scopeEntityDef.addTableAlias(
                                x,
                                false,
                                joinType
                            )
                        );

                    if (queryNode instanceof Query) {
                        attrConfig.getExpressionWithReplacedPlaceholder((x) => {
                            let tmp = that.scopeEntityDef.getTableAlias(x);
                            return tmp ? tmp.alias : null;
                        }, queryNode.getScopeTableFilterMapping(this.node.scope));
                    }
                }

                // Special condition needed for start / end if they are not at groupBy
                if (
                    this.name !== "groupBy" &&
                    (this.node.path === "start" || this.node.path === "end")
                ) {
                    let joins = [];
                    if (queryNode instanceof Query) {
                        let startAttribute = scopeConfig.getAttribute("start");
                        let startExpression =
                            startAttribute.getExpressionWithReplacedPlaceholder(
                                (x) => {
                                    joins.push(x);
                                    let tmp =
                                        this.scopeEntityDef.getTableAlias(x);
                                    return tmp ? tmp.alias : null;
                                },
                                queryNode.getScopeTableFilterMapping(
                                    this.node.scope
                                )
                            );

                        let endAttribute = scopeConfig.getAttribute("end");
                        let endExpression =
                            endAttribute.getExpressionWithReplacedPlaceholder(
                                (x) => {
                                    joins.push(x);
                                    let tmp =
                                        this.scopeEntityDef.getTableAlias(x);
                                    return tmp ? tmp.alias : null;
                                },
                                queryNode.getScopeTableFilterMapping(
                                    this.node.scope
                                )
                            );

                        if (joins.length > 0) {
                            // Ideally, this all should come from the same table
                            this.pushOnCondition(
                                this.scopeEntityDef.getTableAlias(joins[0]).on,
                                QueryObject.format(
                                    " (NOT((%UNSAFE IS NULL) AND (%UNSAFE IS NULL))) ",
                                    startExpression,
                                    endExpression
                                )
                            );
                        }
                    }
                }

                //If including descendants, then its an inner join between Concept, Concept relationship and Concept Ancestor Table with the joining keys as 
                // 1 - CONCEPT_RELATIONSHIP.CONCEPT_ID_1 = CONCEPT.CONCEPT_ID and CONCEPT_RELATIONSHIP.RELATIONSHIP_ID = 'Maps to'
                // 2 - CONCEPT_RELATIONSHIP.CONCEPT_ID_2 = CONCEPT_ANCESTOR.ANCESTOR_CONCEPT_ID and 
                // 3 - CONCEPT_ANCESTOR.DESCENDANT_CONCEPT_ID = @INTERACTION.<ANY_CONCEPT_ID_COLUMN>
                // The only Pre-requisite is @REF/Concept must be defined in the Data source expression.
                if (attrConfig.__config.includeDescendants) {

                    //Please dont change the order of these joins as they are dependent on each other
                    //Add Concept Relationship
                    this.scopeEntityDef.addTableAlias(
                        { baseEntity: "@REF0", table: `$$VOCAB_SCHEMA$$.CONCEPT_RELATIONSHIP` },
                        false,
                        "INNER JOIN",
                        true
                    );

                    //Add Concept Ancestor
                    this.scopeEntityDef.addTableAlias(
                        { baseEntity: "@TEXT", table: attrConfig.placeholderMap["@TEXT"] },
                        false,
                        "INNER JOIN",
                        true
                    );

                    const textAliasObj = this.scopeEntityDef.getTableAlias(attrConfig.placeholderMap["@TEXT"]);
                    const refAlias = this.scopeEntityDef.getTableAliasByBaseEntity("@REF");

                    if(!refAlias) {
                        throw new Error("@REF undefined in the Data Source (Expression)!")
                    }


                    //Build Concept Relationship
                    const conceptRelationshipPlaceholder = "@REF0";
                    attrConfig.placeholderMap[conceptRelationshipPlaceholder] = `$$SCHEMA$$.concept_relationship`;
                    attrConfig.placeholderMap[`${conceptRelationshipPlaceholder}.CODE`] = attrConfig.placeholderMap["@REF.CODE"];
                    attrConfig.placeholderMap[`${conceptRelationshipPlaceholder}.TEXT`] = attrConfig.placeholderMap["@REF.TEXT"];
                    attrConfig.placeholderMap[`${conceptRelationshipPlaceholder}.VOCABULARY_ID`] = attrConfig.placeholderMap["@REF.VOCABULARY_ID"];

                    // const ref0AliasObj = this.scopeEntityDef.getTableAliasByBaseEntity("@REF0");
                    const ref0AliasObj = this.scopeEntityDef.getTableAlias(attrConfig.placeholderMap["@REF0"]);
                    ref0AliasObj.on = []; //initialize
                    this.pushOnCondition(
                        ref0AliasObj.on,
                        QueryObject.format("%UNSAFE", 
                                            `${ref0AliasObj.alias}.relationship_id = 'Maps to' AND 
                                             ${ref0AliasObj.alias}.concept_id_1 = ${refAlias}.${attrConfig.placeholderMap["@REF.CODE"]}`)
                    )

                    this.pushOnCondition(
                        textAliasObj.on,
                        QueryObject.format("%UNSAFE", 
                                            `${textAliasObj.alias}.ANCESTOR_CONCEPT_ID 
                                              = ${ref0AliasObj.alias}.concept_id_2`)
                    )
                    
                    let descendantsFilterExpression = attrConfig.__config.includeDescendantsExpression;
                    if(!descendantsFilterExpression) {
                        throw new Error("Expression undefined in the descendantsFilterExpression!")
                    }
                    const descendantsPlaceholder = descendantsFilterExpression.match(/@[^.^\s]+/g)[0];
                    const descendantsAlias = this.scopeEntityDef.getTableAliasByBaseEntity(descendantsPlaceholder);
                    descendantsFilterExpression = descendantsFilterExpression.replaceAll(descendantsPlaceholder, descendantsAlias);

                    this.pushOnCondition(
                        textAliasObj.on,
                        QueryObject.format("%UNSAFE", 
                                            `${textAliasObj.alias}.DESCENDANT_CONCEPT_ID 
                                             = ${descendantsFilterExpression}`)
                    )

                    //Detect if its on the x1 or x2
                    //If yes, append Inner JOIN referring to another Vocabulary concept table
                    //Modify group by and its attribute config to point to the new reference @REFX placeholder
                    const groupByNode = queryNode.node.groupBy?.find((groupBy) => groupBy.path === this.node.path);
                    if(groupByNode) {
                        const newRefPlaceholder = this.getNewMaxPlaceholderRefPlaceholder(attrConfig.placeholderMap);
                        attrConfig.placeholderMap[newRefPlaceholder] = attrConfig.placeholderMap["@REF"];
                        attrConfig.placeholderMap[`${newRefPlaceholder}.CODE`] = attrConfig.placeholderMap["@REF.CODE"];
                        attrConfig.placeholderMap[`${newRefPlaceholder}.TEXT`] = attrConfig.placeholderMap["@REF.TEXT"];
                        attrConfig.placeholderMap[`${newRefPlaceholder}.VOCABULARY_ID`] = attrConfig.placeholderMap["@REF.VOCABULARY_ID"];
                        if(!groupByNode.attrConfig) {
                            groupByNode.attrConfig = JSON.parse(JSON.stringify(attrConfig))
                        }
                        groupByNode.attrConfig.baseEntity = newRefPlaceholder;
                        groupByNode.attrConfig.__config.expression = groupByNode.attrConfig.__config.expression.replaceAll("@REF", newRefPlaceholder);
                        groupByNode.attrConfig.__config.defaultFilter = groupByNode.attrConfig.__config.defaultFilter.replaceAll("@REF", newRefPlaceholder);
                        
                        this.scopeEntityDef.addTableAlias(
                        { baseEntity: newRefPlaceholder, table: attrConfig.placeholderMap[newRefPlaceholder] },
                        false,
                        "INNER JOIN",
                        true
                        );

                        //Add the ON condition between additional concept table and the descendant expression
                        const maxRefAlias = this.scopeEntityDef.getTableAliasByBaseEntity(newRefPlaceholder);
                        const maxRefAliasObj = this.scopeEntityDef.getTableAlias(attrConfig.placeholderMap[newRefPlaceholder]);
                        maxRefAliasObj.on = []; //initialize
                        this.pushOnCondition(
                        maxRefAliasObj.on,
                        QueryObject.format("%UNSAFE", 
                                            `${maxRefAliasObj.alias}.CONCEPT_ID 
                                             = ${descendantsFilterExpression}`)
                        )
                    }
                }
            }
        }
    }

    public pushOnCondition(onArray, onStatement) {
        for (let i = 0; i < onArray.length; i++) {
            if (onArray[i].queryString === onStatement.queryString) {
                return;
            }
        }
        onArray.push(onStatement);
    }

    private getNewMaxPlaceholderRefPlaceholder(placeholderMap) {
        const sortedArray = Object.keys(placeholderMap).filter((x) => x.startsWith("@REF")).map(x => x.match(/@[^.^\s]+/g)[0]).sort();
        if (sortedArray[sortedArray.length - 1] === "@REF") {
            return "@REF2";
        } else {
            const maxRef = sortedArray[sortedArray.length - 1];
            const refNumber = parseInt(maxRef.replace("@REF", ""));
            return "@REF" + (refNumber + 1);
        }
    }

    public getSQLWithAlias(): QueryObject {
        let aggregationNode = this.resolveAggregation(this.parent);
        if (aggregationNode) {
            let tmpSQL = this.getSQL();
            if (this.node.aggregation && this.name === "groupBy") {
                return QueryObject.format(
                    '%Q AS "%UNSAFE"',
                    QueryObject.format(this.node.aggregation, tmpSQL),
                    this.node.alias
                );
            } else {
                return QueryObject.format(
                    '%Q AS "%UNSAFE"',
                    tmpSQL,
                    this.node.alias
                );
            }
        } else {
            let tmp = this.getSQLComponents();
            if (!tmp) {
                return null;
            }

            let attrConfig = this.attrConfig;
            if (attrConfig.haveMeassureExpression()) {
                let propertyArray = attrConfig.getMeassuresByConfig();
                let queryObjArray = [];
                for (let i = 0; i < propertyArray.length; i++) {
                    let alias = this.node.alias + "." + propertyArray[i].alias;

                    queryObjArray.push(
                        QueryObject.format('%Q AS "%UNSAFE"', tmp[i], alias)
                    );
                }

                return QueryObject.format(", ").join(queryObjArray);
            } if(this.name === "measure" && (this.path === "entry" || this.path === "exit")) {
                return QueryObject.format(
                    '%Q AS "%UNSAFE"',
                    tmp[0],
                    this.path
                );
            } else {
                return QueryObject.format(
                    '%Q AS "%UNSAFE"',
                    tmp[0],
                    this.node.alias
                );
            }
        }
    }

    public getNonMeasureSQLWithAlias(): QueryObject {
        return QueryObject.format(
            '%Q AS "%UNSAFE"',
            this.getSQL(),
            this.node.alias
        );
    }

    public getSQLComponents(): any {
        let attrConfig = this.attrConfig;

        if (!attrConfig) {
            return QueryObject.format("[923BBDEC] ERROR", this.sql);
        }
        let queryNode = this.resolveQuery(this.parent);
        let sqlArr;
        if (queryNode instanceof Query) {
            let tmp;
            sqlArr = attrConfig.getMeasureExpressionWithReplacedPlaceholder(
                (x) => {
                    if (this.scopeEntityDef instanceof With) {
                        tmp = this.scopeEntityDef.getTableAlias(x);
                    } else {
                        tmp =
                            (queryNode as Query).sourceTable[x] ||
                            this.scopeEntityDef.getTableAlias(x);
                    }

                    return tmp ? tmp.alias : null;
                },
                queryNode.getScopeTableFilterMapping(this.node.scope)
            );
        }

        let type = attrConfig.getConfig().type;
        let listOfIDColumns = AstElement.getConfig().getIDColumns();

        let queryObjArray = sqlArr.map((x) => {
            if (
                listOfIDColumns.filter((val) => x.indexOf(val) > -1).length > 0
            ) {
                return QueryObject.format("%UNSAFE", x);
            } else if (
                type === "text" &&
                !(this.name === "groupBy" || this.name === "orderBy")
            ) {
                return QueryObject.format("UPPER(%UNSAFE)", x);
            } else if (type === "num" && this.node.binsize) {
                // you are special, binsize
                return QueryObject.format(
                    "FLOOR((%UNSAFE)/TO_DECIMAL(%f)) * %f",
                    x,
                    this.node.binsize,
                    this.node.binsize
                );
            } else {
                return QueryObject.format("%UNSAFE", x);
            }
        });

        return queryObjArray;
    }

    public getnonAggregateExpression(indexed: boolean = true) {
        let configTemplateID = this.node.templateId;
        let meassurePlaceHolder =
            AstElement.getConfig().buildMeassuresPlaceholdersByTemplate(
                configTemplateID
            );
        let nonAggregateExpression: string;
        meassurePlaceHolder.placeHolders.forEach((element, index) => {
            let regexString = new RegExp("{[" + index + "]}");
            if (indexed) {
                meassurePlaceHolder.measureExpression =
                    meassurePlaceHolder.measureExpression.replace(
                        regexString,
                        this.node.scope +
                            '."' +
                            this.node.path +
                            "." +
                            index +
                            '"'
                    );
                nonAggregateExpression =
                    this.node.scope + '."' + this.node.path + "." + index + '"';
            } else {
                meassurePlaceHolder.measureExpression =
                    meassurePlaceHolder.measureExpression.replace(
                        regexString,
                        this.node.scope + '."' + this.node.path + '"'
                    );
                nonAggregateExpression =
                    this.node.scope + '."' + this.node.path + '"';
            }
        });

        return QueryObject.format("%UNSAFE", nonAggregateExpression);
    }

    public getSQL() {
        let aggregationNode = this.resolveAggregation(this.parent);
        if (aggregationNode) {
            let configTemplateID = this.node.templateId;

            if (configTemplateID && this.name !== "groupBy") {
                let meassurePlaceHolder =
                    AstElement.getConfig().buildMeassuresPlaceholdersByTemplate(
                        configTemplateID
                    );
                let nonAggregateExpression: string;
                meassurePlaceHolder.placeHolders.forEach((element, index) => {
                    let regexString = new RegExp("{[" + index + "]}");
                    meassurePlaceHolder.measureExpression =
                        meassurePlaceHolder.measureExpression.replace(
                            regexString,
                            this.node.scope +
                                '."' +
                                this.node.path +
                                "." +
                                index +
                                '"'
                        );
                    nonAggregateExpression =
                        this.node.scope +
                        '."' +
                        this.node.path +
                        "." +
                        index +
                        '"';
                });

                if (meassurePlaceHolder.isMeassure) {
                    return QueryObject.format(
                        "%UNSAFE",
                        meassurePlaceHolder.measureExpression
                    );
                } else if (this.node.aggregation) {
                    return QueryObject.format(
                        this.node.aggregation,
                        QueryObject.format(
                            '%UNSAFE."%UNSAFE"',
                            this.node.scope,
                            this.node.path
                        )
                    );
                } else if (this.name !== "orderBy") {
                    return QueryObject.format(
                        'AVG(%UNSAFE."%UNSAFE")',
                        this.node.scope,
                        this.node.path
                    );
                } else {
                    return QueryObject.format(
                        '%UNSAFE."%UNSAFE"',
                        this.node.scope,
                        this.node.path
                    );
                }
            } else {
                return QueryObject.format(
                    '%UNSAFE."%UNSAFE"',
                    this.node.scope,
                    this.node.path
                );
            }
        } else {
            return QueryObject.format(", ").join(this.getSQLComponents());
        }
    }
}
