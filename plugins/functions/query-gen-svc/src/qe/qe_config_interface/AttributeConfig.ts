import { assert, getUniqueSeperatorString } from "@alp/alp-base-utils";
import { PholderTableMapType, Settings } from "../settings/Settings";
import { ConfigEntity, IConfigEntity } from "./ConfigEntity";

export class AttributeConfig extends ConfigEntity {
    public useDefaultFilter: boolean = false;

    constructor(
        __config: IConfigEntity,
        placeholderMap: PholderTableMapType,
        settings: Settings
    ) {
        super(__config, placeholderMap, settings);
        let placeholders = settings.getAllPlaceholders();

        placeholders.forEach((placeholder) => {
            if (this.getExpression().match(new RegExp(placeholder))) {
                if (!this.baseEntity) {
                    this.baseEntity = placeholder;
                }
            }
        });
    }

    public haveMeassureExpression() {
        return "measureExpression" in this.__config;
    }

    public getExpression() {
        if ("expression" in this.__config) {
            return this.__config.expression;
        }

        return this.getConfig().measureExpression;
    }

    public getMeasureExpressionWithReplacedPlaceholder2(
        getTableAliasFunc,
        scopeTableAlias
    ) {
        let self = this;
        if (!("expression" in this.__config)) {
            if (this.haveMeassureExpression()) {
                let parsedMeasureExpression = this.getMeassuresByConfig();
                let result = [];

                for (let i = 0; i < parsedMeasureExpression.length; i++) {
                    let test = parsedMeasureExpression[i].value.replace(
                        /@[^.^\s]+/g,
                        (x) => {
                            if (x === this.settings.getFactTablePlaceholder()) {
                                return getTableAliasFunc(
                                    self.placeholderMap[x]
                                );
                            } else if (
                                this.settings
                                    .getDimTablePlaceholders()
                                    .indexOf(x) > -1
                            ) {
                                return getTableAliasFunc(scopeTableAlias);
                            } else {
                                let tmp = getTableAliasFunc(
                                    self.placeholderMap[x] +
                                        getUniqueSeperatorString() +
                                        self.getDefaultFilterHash()
                                );
                                if (!tmp) {
                                    tmp = getTableAliasFunc(
                                        self.placeholderMap[x]
                                    );
                                }
                                return tmp;
                            }
                        }
                    );

                    result.push(test);
                }

                return result;
            }
            return null;
        }

        let table = [
            this.__config.expression.replace(/@[^.^\s]+/g, (x) =>
                self._replacePlaceholderInSQLString(
                    x,
                    getTableAliasFunc,
                    scopeTableAlias
                )
            ),
        ];

        return table;
    }

    public getMeasureExpressionWithReplacedPlaceholder(
        getTableAliasFunc,
        scopeTableAlias
    ) {
        let tmp2 = this.getMeasureExpressionWithReplacedPlaceholder2(
            getTableAliasFunc,
            scopeTableAlias
        );
        let self = this;
        if (!("expression" in this.__config)) {
            if (this.haveMeassureExpression()) {
                let parsedMeasureExpression = this.getMeassuresByConfig();
                let result = [];

                for (let i = 0; i < parsedMeasureExpression.length; i++) {
                    let test = parsedMeasureExpression[i].value.replace(
                        /@[^.^\s]+/g,
                        (x) => {
                            if (x === "@PATIENT") {
                                return getTableAliasFunc(
                                    self.placeholderMap[x]
                                );
                            } else if (x === "@INTERACTION") {
                                return getTableAliasFunc(scopeTableAlias);
                            } else {
                                let tmp = getTableAliasFunc(
                                    self.placeholderMap[x] +
                                        getUniqueSeperatorString() +
                                        self.getDefaultFilterHash()
                                );
                                if (!tmp) {
                                    tmp = getTableAliasFunc(
                                        self.placeholderMap[x]
                                    );
                                }
                                assert(
                                    tmp === tmp2,
                                    "getMeasureExpressionWithReplacedPlaceholder error1"
                                );
                                return tmp;
                            }
                        }
                    );
                    result.push(test);
                }
                assert(
                    JSON.stringify(result) === JSON.stringify(tmp2),
                    "getMeasureExpressionWithReplacedPlaceholder error2"
                );

                return result;
            }

            assert(!tmp2, "getMeasureExpressionWithReplacedPlaceholder error3");
            return null;
        }

        let table = [
            this.__config.expression.replace(/@[^.^\s]+/g, (x) =>
                self._replacePlaceholderInSQLString(
                    x,
                    getTableAliasFunc,
                    scopeTableAlias
                )
            ),
        ];

        return table;
    }

    public getMeassuresByConfig(): any {
        if (this.haveMeassureExpression()) {
            let mE = this.__config.measureExpression;

            let returnArr = [];
            if (mE) {
                //TODO: Get from somewhere instead of copied function
                returnArr = this.buildMeassuresPlaceholders(mE).placeHolders;
            }

            return returnArr;
        } else {
            return [];
        }
    }

    //COPIED FUNCTION
    public buildMeassuresPlaceholders(measureExpression: string): any {
        let mE = measureExpression;

        let varCount = -1;
        let placeHolderResult = [];

        let result = mE.replace(/@[*\.A-Z,a-z,_,\/"]+/g, (x) => {
            varCount = varCount + 1;
            placeHolderResult.push({ value: x, alias: varCount.toString() });
            return "{" + varCount + "}";
        });

        return {
            measureExpression: result,
            placeHolders: placeHolderResult,
        };
    }
    //END COPIED FUNCTION

    public getDefaultFilterWithReplacedPlaceholder(
        getTableAliasFunc,
        scopeTableAlias
    ) {
        let table = null;
        let self = this;

        let df: string = this.__config.defaultFilter;
        if (df) {
            table = df.replace(/@[^.^\s]+/g, (x) =>
                self._replacePlaceholderInSQLString(
                    x,
                    getTableAliasFunc,
                    scopeTableAlias
                )
            );
        }
        return table;
    }

    //TEMP NAME
    public getExpressionWithReplacedPlaceholder(
        getTableAliasFunc,
        scopeTableAlias
    ) {
        let table = null;
        let self = this;

        let df: string = this.__config.expression;
        if (df) {
            table = df.replace(/@[^.^\s]+/g, (x) =>
                self._replacePlaceholderInSQLString(
                    x,
                    getTableAliasFunc,
                    scopeTableAlias
                )
            );
        }
        return table;
    }

    public getExpressionHash() {
        return this.__config.expression
            ? this.__config.expression.replace(/[^a-zA-Z0-9]/g, "")
            : "";
    }

    public getPlaceholdersFromExpression(expression) {
        let tmp = expression.match(/@[^.^\s]+/g);
        if (tmp) {
            for (let i = 0; i < tmp.length; i++) {
                if (
                    tmp[i] !== this.settings.getFactTablePlaceholder() &&
                    this.settings.getDimTablePlaceholders().indexOf(tmp[i]) ===
                        -1
                ) {
                    return tmp[i];
                }
            }
        }

        return "";
    }

    /*public getPlaceholdersFromExpression(expression) {
        let tmp2 = this.getAllPlaceholdersFromExpression2(expression);
        let tmp = expression.match(/@[^.^\s]+/g);
        if (tmp) {
            for (let i = 0; i < tmp.length; i++) {
                if (tmp[i] !== "@PATIENT" && tmp[i] !== "@INTERACTION") {
                    assert(JSON.stringify(tmp2) === JSON.stringify(tmp[i]), `getPlaceholdersFromExpression ${tmp2} ${tmp[i]}` );
                    return tmp[i];
                }
            }
        }
        
        return "";
    }*/

    public getExpressionTable() {
        let self = this;
        if (this.__config.expression) {
            return this.getPlaceholdersFromExpression(
                this.__config.expression
            ).replace(new RegExp(this.baseEntity), (x) => {
                let tmp = "";
                tmp =
                    self.placeholderMap[x] +
                    getUniqueSeperatorString() +
                    this.getExpressionHash();
                return tmp;
            });
        }
        return null;
    }

    public getTables(): {
        baseEntity: string;
        table: string;
    }[] {
        let self = this;
        let tables = [];

        if (this.__config.defaultFilter) {
            if (
                this.getPlaceholdersFromExpression(
                    this.__config.defaultFilter
                ) === ""
            ) {
                return tables;
            } else {
                tables.push({
                    baseEntity: this.baseEntity,
                    table: self.getDefaultFilterTable(),
                });
                return tables;
            }
        } else if (this.__config.expression) {
            if (
                this.getPlaceholdersFromExpression(this.__config.expression) ===
                ""
            ) {
                return tables;
            } else {
                tables.push({
                    baseEntity: this.baseEntity,
                    table: this.getExpressionTable(),
                });
                return tables;
            }
        }
        return [
            {
                baseEntity: this.settings.getFactTablePlaceholder(),
                table: self.placeholderMap[
                    this.settings.getFactTablePlaceholder()
                ],
            },
        ];
    }

    protected _replacePlaceholderInSQLString(
        x,
        getTableAliasFunc,
        scopeTableAlias
    ): string {
        let tmp: string = "";
        let self = this;

        //First Try Default Filter

        if (this.getDefaultFilterHash().length > 0) {
            if (
                this.settings.getAttributesTablePlaceholders().indexOf(x) >
                    -1 ||
                x === "@TEXT" ||  x.startsWith("@REF")
            ) {
                this.useDefaultFilter = true;
                tmp = getTableAliasFunc(
                    self.placeholderMap[x] +
                        getUniqueSeperatorString() +
                        self.getDefaultFilterHash()
                );
                if (!tmp) {
                    tmp = getTableAliasFunc(self.placeholderMap[x]);
                }
            } else {
                if (this.settings.getDimTablePlaceholders().indexOf(x) > -1) {
                    tmp = getTableAliasFunc(scopeTableAlias);
                } else if (x === this.settings.getFactTablePlaceholder()) {
                    tmp = getTableAliasFunc(self.placeholderMap[x]);
                }
            }
        } else {
            if (
                (this.settings.getAttributesTablePlaceholders().indexOf(x) >
                    -1 ||
                    x === "@TEXT" ||  x.startsWith("@REF")) &&
                this.getExpressionHash().length > 0
            ) {
                tmp = getTableAliasFunc(
                    self.placeholderMap[x] +
                        getUniqueSeperatorString() +
                        self.getExpressionHash()
                );
                if (!tmp) {
                    tmp = getTableAliasFunc(self.placeholderMap[x]);
                }
            } else {
                if (this.settings.getDimTablePlaceholders().indexOf(x) > -1) {
                    tmp = getTableAliasFunc(scopeTableAlias);
                } else if (x === this.settings.getFactTablePlaceholder()) {
                    tmp = getTableAliasFunc(self.placeholderMap[x]);
                }
            }
        }

        return tmp;
    }

    /*protected _replacePlaceholderInSQLString(x, getTableAliasFunc, scopeTableAlias): string {
        let tmp2 = this._replacePlaceholderInSQLString2(x, getTableAliasFunc, scopeTableAlias);
        let tmp: string = "";
        let self = this;

        //First Try Default Filter

        if (this.getDefaultFilterHash().length > 0) {
            if (x === "@CODE" || x === "@MEASURE" || x === "@OBS" || x === "@TEXT") {
                this.useDefaultFilter = true;
                tmp = getTableAliasFunc(self.placeholderMap[x] + getUniqueSeperatorString() + self.getDefaultFilterHash());
                if (!tmp) {tmp = getTableAliasFunc(self.placeholderMap[x]); }
            } else {
                if (x === "@INTERACTION") {
                    tmp = getTableAliasFunc(scopeTableAlias);
                }
                else if (x === "@PATIENT") {
                    tmp = getTableAliasFunc(self.placeholderMap[x]);
                }
            }

        } else {
            if ((x === "@CODE" || x === "@MEASURE" || x === "@OBS" || x === "@TEXT") && this.getExpressionHash().length > 0) {
                tmp = getTableAliasFunc(self.placeholderMap[x] + getUniqueSeperatorString() + self.getExpressionHash());
                if (!tmp) {tmp = getTableAliasFunc(self.placeholderMap[x]); }
            }
            else {
                if (x === "@INTERACTION") {
                    tmp = getTableAliasFunc(scopeTableAlias);
                }
                else if (x === "@PATIENT") {
                    tmp = getTableAliasFunc(self.placeholderMap[x]);
                }
            }
        }
        assert(tmp === tmp2, `_replacePlaceholderInSQLString ${tmp} ${tmp2}`)
        return tmp;
    }*/
}
