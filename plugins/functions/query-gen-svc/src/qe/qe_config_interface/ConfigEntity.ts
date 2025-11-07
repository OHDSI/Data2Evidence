import { getUniqueSeperatorString } from "@alp/alp-base-utils";
import { PholderTableMapType, Settings } from "../settings/Settings";

export interface IConfigEntity {
    defaultFilter?: string;
    defaultPlaceholder?: string;
    attributes?: any;
    name: any;
    type?: any;
    expression: any;
    condition?: string;
    measureExpression?: any;
    interactionName?: string;
}

export class ConfigEntity {
    protected baseEntity: string;

    constructor(
        public __config: IConfigEntity,
        public placeholderMap: PholderTableMapType,
        protected settings: Settings
    ) {}

    public getConfig(): IConfigEntity {
        return this.__config;
    }

    public getBaseEntity(): string {
        return this.baseEntity;
    }

    public getColumn(columnId: string): string {
        let col = this.placeholderMap[`${this.baseEntity}.${columnId}`];
        if (col) {
            return col;
        } else {
            throw new Error(
                `${this.baseEntity}.${columnId} is not defined in placeholderMap`
            );
        }
    }

    public getAllPlaceholdersFromExpression(expression): string[] {
        let tmp = expression.match(/@[^.^\s]+/g);
        return tmp || [];
    }

    public getPlaceholdersFromExpression(expression) {
        let tmp = expression.match(/@[^.^\s]+/g);
        if (tmp) {
            for (let i = 0; i < tmp.length; i++) {
                if (tmp[i] !== this.settings.getFactTablePlaceholder()) {
                    return tmp[i];
                }
            }
        }

        return "";
    }

    public getDefaultFilterHash() {
        return this.__config.defaultFilter
            ? this.__config.defaultFilter.replace(/[^a-zA-Z0-9]/g, "")
            : "";
    }

    public getAllDefaultFilterTable() {
        let self = this;
        if (this.__config.defaultFilter) {
            return this.getAllPlaceholdersFromExpression(
                this.__config.defaultFilter
            ).map((x) => {
                let tmp = "";
                tmp =
                    self.placeholderMap[x] +
                    getUniqueSeperatorString() +
                    this.getDefaultFilterHash();
                return tmp;
            });
        }
        return [];
    }

    public getDefaultFilterTable() {
        let self = this;
        if (this.__config.defaultFilter) {
            return this.getPlaceholdersFromExpression(
                this.__config.defaultFilter
            ).replace(new RegExp(this.baseEntity), (x) => {
                let tmp = "";
                tmp =
                    self.placeholderMap[x] +
                    getUniqueSeperatorString() +
                    this.getDefaultFilterHash();
                return tmp;
            });
        }
        return null;
    }

    public getExpressionTable() {
        let self = this;
        return this.getPlaceholdersFromExpression(
            this.__config.expression
        ).replace(/@[^.^\s]+/g, (x) => self.placeholderMap[x]);
    }

    protected _replacePlaceholderInSQLString(
        x,
        getTableAliasFunc,
        scopeTableAlias
    ): string {
        return "";
    }
}
