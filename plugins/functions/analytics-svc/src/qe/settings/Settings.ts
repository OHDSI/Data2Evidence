import * as oldSettings from "./OldSettings";
import { utils as Utils } from "@alp/alp-base-utils";

import PholderTableMapType = oldSettings.PholderTableMapType;
import GlobalSettingsType = oldSettings.GlobalSettingsType;

export { PholderTableMapType, GlobalSettingsType };

export class Settings extends oldSettings.Settings {
    constructor() {
        super();
    }

    private legancyPlaceholders = ["@TEXT", "@REF"];

    private defaultTableTypePlaceholderMap = {
        factTable: {
            placeholder: "@PATIENT",
            attributeTables: [{ placeholder: "@OBS", oneToN: true }],
        },
        dimTables: [
            {
                placeholder: "@INTERACTION",
                hierarchy: true,
                time: true,
                oneToN: true,
                attributeTables: [
                    { placeholder: "@CODE", oneToN: true },
                    { placeholder: "@MEASURE", oneToN: true },
                    { placeholder: "@TEXT", oneToN: true },
                ],
            },
            {
                placeholder: "@GENOMICS",
                hierarchy: false,
                time: false,
                oneToN: true,
                attributeTables: [],
            },
            {
                placeholder: "@CHEMO",
                hierarchy: false,
                time: false,
                oneToN: true,
                attributeTables: [{ placeholder: "@CHEMO_ATTR", oneToN: true }],
            },
        ],
    };

    private getTableTypePlaceholderMap() {
        if (
            this.userSpecificAdavancedSettings &&
            this.userSpecificAdavancedSettings.tableTypePlaceholderMap
        ) {
            return this.userSpecificAdavancedSettings.tableTypePlaceholderMap;
        }
        return this.defaultTableTypePlaceholderMap;
    }

    public getDimPlaceholderForAttribute(dimAttributePlaceholder) {
        let dimTables = this.getTableTypePlaceholderMap().dimTables.filter(
            (dimTable) => {
                let tmp = dimTable.attributeTables.filter((attribute) => {
                    return attribute.placeholder === dimAttributePlaceholder;
                });
                return tmp.length > 0;
            }
        );
        return dimTables.length === 1
            ? dimTables[0].placeholder
            : new Error("Dim Table Placeholder not found");
    }

    public getDimPlaceholder(dimPlaceholder) {
        let dimTablePlaceholder = this.getTableTypePlaceholderMap().dimTables.filter(
            (dimTable) => {
                    return dimTable.placeholder === dimPlaceholder;
            }
        );
        return dimTablePlaceholder.length === 1
            ? dimTablePlaceholder[0]
            : new Error("Dim Table Placeholder not found");
    }

    public getAllPlaceholders() {
        let ttpm = this.getTableTypePlaceholderMap();
        let placeholders = [];

        ttpm.dimTables.forEach((dimTable) => {
            dimTable.attributeTables.forEach((attrTable) => {
                placeholders.push(attrTable.placeholder);
            });
            placeholders.push(dimTable.placeholder);
        });
        ttpm.factTable.attributeTables.forEach((table) => {
            placeholders.push(table.placeholder);
        });
        placeholders.push(ttpm.factTable.placeholder);
        return placeholders.concat(this.legancyPlaceholders);
    }

    getFactTablePlaceholder() {
        return this.getTableTypePlaceholderMap().factTable.placeholder;
    }

    getDimTablePlaceholders() {
        let placeholders = [];
        this.getTableTypePlaceholderMap().dimTables.forEach((dimTable) => {
            placeholders.push(dimTable.placeholder);
        });
        return placeholders;
    }

    getAttributesTablePlaceholders() {
        let placeholders = [];
        this.getTableTypePlaceholderMap().dimTables.forEach((dimTable) => {
            dimTable.attributeTables.forEach((attrTable) => {
                placeholders.push(attrTable.placeholder);
            });
        });
        this.getTableTypePlaceholderMap().factTable.attributeTables.forEach(
            (attrTable) => {
                placeholders.push(attrTable.placeholder);
            }
        );
        return placeholders;
    }

    getDimAttributesTablePlaceholders() {
        let placeholders = [];
        this.getTableTypePlaceholderMap().dimTables.forEach((dimTable) => {
            dimTable.attributeTables.forEach((attrTable) => {
                placeholders.push(attrTable.placeholder);
            });
        });
        return placeholders;
    }

    getPatientAttributesTablePlaceholders() {
        let placeholders = [];
        this.getTableTypePlaceholderMap().factTable.attributeTables.forEach(
            (attrTable) => {
                placeholders.push(attrTable.placeholder);
            }
        );
        return placeholders;
    }

    public getGuardedPlaceholderMap(): PholderTableMapType {
        let guardedPholderTableMap = Utils.extend(
            this.customGuardedPholderTableMap,
            this.defaultGuardedPholderTableMap
        );
        let placeholderMap = this.getPlaceholderMap();
        if (this.userSpecificAdavancedSettings) {
            placeholderMap[this.getFactTablePlaceholder()] =
                this.userSpecificAdavancedSettings.guardedTableMapping[
                    this.getFactTablePlaceholder()
                ];
        } else {
            placeholderMap[this.getFactTablePlaceholder()] =
                guardedPholderTableMap[this.getFactTablePlaceholder()];
        }
        return placeholderMap;
    }
}
