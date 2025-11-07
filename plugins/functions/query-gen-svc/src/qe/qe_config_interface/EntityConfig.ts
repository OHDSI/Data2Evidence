import { ConfigEntity, IConfigEntity } from "./ConfigEntity";
import { AttributeConfig } from "./AttributeConfig";
import { getUniqueSeperatorString, assert } from "@alp/alp-base-utils";
import { PholderTableMapType, Settings } from "../settings/Settings";

export class EntityConfig extends ConfigEntity {
    constructor(
        public __config: IConfigEntity,
        public placeholderMap: PholderTableMapType,
        settings: Settings
    ) {
        super(__config, placeholderMap, settings);

        if (__config.hasOwnProperty("interactions")) {
            this.baseEntity = "@INTERACTION";
        } else if (__config.hasOwnProperty("expression")) {
            this.baseEntity = "@INTERACTION";
        } else if (__config.hasOwnProperty("defaultFilter")) {
            this.baseEntity = EntityConfig.findPholders(
                __config.defaultFilter,
                settings.getDimTablePlaceholders()
            );
        }

        if (__config.hasOwnProperty("defaultPlaceholder")) {
            this.baseEntity = EntityConfig.findPholders(
                __config.defaultPlaceholder,
                settings.getDimTablePlaceholders()
            );
        }
    }

    private static findPholders(
        input: string = "",
        placeholdersToSearch: string[] = []
    ) {
        let placeholder = placeholdersToSearch.filter((placeholder) => {
            return (
                placeholder === input ||
                new RegExp(`${placeholder}\\.`).test(input)
            );
        });
        if (placeholder.length === 0) {
            console.error(
                `EntityConfig: no default filter in ${input}, assuming @INTERACTION`
            );
            return "@INTERACTION";
        } else {
            assert(placeholder.length > 0, `no placeholder found ${input}`);
            assert(
                placeholder.length === 1,
                `more than one dim placeholder found ${placeholder} in ${input}`
            );
            return placeholder[0];
        }
    }

    public getBaseEntity() {
        return this.baseEntity;
    }

    private getDefaultFilter() {
        return this.__config.defaultFilter;
    }

    public getAttribute(attribute: string, parentEntity?: string): ConfigEntity {
        if (attribute.toLowerCase() === "interaction_id") {
            return new AttributeConfig(
                {
                    attributes: [],
                    expression:
                        this.baseEntity +
                        "." +
                        this.getColumn("INTERACTION_ID"),
                    name: "id",
                    type: "text",
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "parent_interact_id") {

            if(!parentEntity) throw new Error("Parent entity undefined!");

            const parentInteraction = this.__config?.parentInteractionsMapping?.find((parentInt) => {
                return (parentInt.parentMappingInteraction.indexOf(`${parentEntity}`) > -1)
            });

            return new AttributeConfig(
                {
                    name: "parent_interact_id",
                    type: "text",
                    expression: parentInteraction?.currentMappingInteractionId || `${this.baseEntity}.${this.getColumn("PARENT_INTERACT_ID")}`,
                    attributes: [],
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "dod") {
            return new AttributeConfig(
                {
                    name: "dod",
                    type: "time",
                    expression:
                        this.settings.getFactTablePlaceholder() +
                        "." +
                        this.placeholderMap[
                            this.settings.getFactTablePlaceholder() + ".DOD"
                        ],
                    attributes: [],
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "km_start") {
            return new AttributeConfig(
                {
                    name: "km_start",
                    type: "time",
                    expression: this.baseEntity + "." + this.getColumn("END"),
                    attributes: [],
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "km_start_patient") {
            return new AttributeConfig(
                {
                    name: "km_start",
                    type: "time",
                    expression:
                        this.settings.getFactTablePlaceholder() +
                        "." +
                        this.placeholderMap[
                            this.settings.getFactTablePlaceholder() + ".DOB"
                        ],
                    attributes: [],
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "km_end") {
            return new AttributeConfig(
                {
                    name: "km_end",
                    type: "time",
                    expression: this.baseEntity + "." + this.getColumn("END"),
                    attributes: [],
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "km_end_patient") {
            return new AttributeConfig(
                {
                    name: "km_end",
                    type: "time",
                    expression:
                        this.settings.getFactTablePlaceholder() +
                        "." +
                        this.placeholderMap[
                            this.settings.getFactTablePlaceholder() + ".DOD"
                        ],
                    attributes: [],
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "entry") {
            return new AttributeConfig(
                {
                    attributes: [],
                    expression: `min(${this.baseEntity}.${this.getColumn("START")})`,
                    name: "id",
                    type: "time",
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute.toLowerCase() === "exit") {
            return new AttributeConfig(
                {
                    attributes: [],
                    expression: `max(${this.baseEntity}.${this.getColumn("END")})`,
                    name: "id",
                    type: "time",
                },
                this.placeholderMap,
                this.settings
            );
        } else if (attribute in this.__config.attributes) {
            let tmp = this.__config.attributes[attribute];
            let tmpPlaceholderMap = JSON.parse(
                JSON.stringify(this.placeholderMap)
            );
            if (tmp.from) {
                Object.keys(tmp.from).forEach((key) => {
                    tmpPlaceholderMap[key] = tmp.from[key];
                });
            }
            let configAttribute = JSON.parse(
                JSON.stringify(this.__config.attributes[attribute])
            );
            return new AttributeConfig(
                configAttribute,
                tmpPlaceholderMap,
                this.settings
            );
        } else {
            throw new Error(
                "Attribute " + attribute + " not in config definied"
            );
        }
    }

    public getConditionName(): string {
        return this.__config.condition;
    }

    public getTables(): {
        baseEntity: string;
        table: string;
    }[] {
        let self = this;
        let tables = [];
        if (this.__config.defaultFilter) {
            let defaulFilterTable = self.getDefaultFilterTable();
            if (!defaulFilterTable) {
                defaulFilterTable = self.placeholderMap[this.baseEntity];
            }
            tables.push({
                baseEntity: self.baseEntity,
                table: defaulFilterTable,
            });
        } else {
            tables.push({
                baseEntity: self.baseEntity,
                table: self.placeholderMap[self.baseEntity],
            });
        }

        return tables;
    }

    public getContextTable(): string {
        return this.placeholderMap[this.settings.getFactTablePlaceholder()];
    }

    protected _replacePlaceholderInSQLString(
        x,
        getTableAliasFunc,
        scopeTableAlias
    ): string {
        let tmp: string = "";
        let self = this;

        if (
            this.settings.getDimTablePlaceholders().indexOf(x) > -1 &&
            this.getDefaultFilterHash().length
        ) {
            tmp = getTableAliasFunc(
                self.placeholderMap[x] +
                    getUniqueSeperatorString() +
                    self.getDefaultFilterHash()
            );
        } else if (x === this.settings.getFactTablePlaceholder()) {
            tmp = getTableAliasFunc(self.placeholderMap[x]);
        }

        return tmp;
    }

    public getTableTypePlaceholderMap(dimPlaceholder): any {
        return this.settings.getDimPlaceholder(dimPlaceholder)
    }
}
