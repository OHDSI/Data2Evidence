import * as oldSettings from "./OldSettings";
import { utils as Utils } from "@alp/alp-base-utils";
import {
  defaultTableTypePlaceholderMap,
  defaultPholderTableMap,
  defaultSupportedLanguages,
} from "./Defaults";

export class Settings extends oldSettings.Settings {
  constructor() {
    super();
  }

  private legancyPlaceholders = ["@TEXT", "@REF"];

  // Init to default values
  private defaultTableTypePlaceholderMap = {
    ...defaultTableTypePlaceholderMap,
  };

  private getTableTypePlaceholderMap(): TableTypePlaceholderMapType {
    if (
      this.userSpecificAdavancedSettings &&
      this.userSpecificAdavancedSettings.tableTypePlaceholderMap
    ) {
      return Utils.cloneJson(
        this.userSpecificAdavancedSettings.tableTypePlaceholderMap
      );
    } else {
      return Utils.cloneJson(this.defaultTableTypePlaceholderMap);
    }
  }

  public getDimPlaceholderForAttribute(dimAttributePlaceholder) {
    const dimTables = this.getTableTypePlaceholderMap().dimTables.filter(
      (dimTable) => {
        const tmp = dimTable.attributeTables.filter((attribute) => {
          return attribute.placeholder === dimAttributePlaceholder;
        });
        return tmp.length > 0;
      }
    );
    return dimTables.length === 1
      ? dimTables[0].placeholder
      : new Error("Dim Table Placeholder not found");
  }

  public getAllPlaceholders() {
    const ttpm = this.getTableTypePlaceholderMap();
    const placeholders = [];

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
    const placeholders = [];
    this.getTableTypePlaceholderMap().dimTables.forEach((dimTable) => {
      placeholders.push(dimTable.placeholder);
    });
    return placeholders;
  }

  getAttributesTablePlaceholders() {
    const placeholders = [];
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
    const placeholders = [];
    this.getTableTypePlaceholderMap().dimTables.forEach((dimTable) => {
      dimTable.attributeTables.forEach((attrTable) => {
        placeholders.push(attrTable.placeholder);
      });
    });
    return placeholders;
  }

  getPatientAttributesTablePlaceholders() {
    const placeholders = [];
    this.getTableTypePlaceholderMap().factTable.attributeTables.forEach(
      (attrTable) => {
        placeholders.push(attrTable.placeholder);
      }
    );
    return placeholders;
  }

  public getGuardedPlaceholderMap(): PholderTableMapType {
    const guardedPholderTableMap = Utils.extend(
      this.customGuardedPholderTableMap,
      this.defaultGuardedPholderTableMap
    );
    const placeholderMap = this.getPlaceholderMap();
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

  public getDefaultAdvancedSettings(): AdvancedSettingsType {
    const settingsWithShared = this.getSettings();
    let settings = JSON.parse(JSON.stringify(settingsWithShared));
    const shared = {};
    settings = Utils.extend(Utils.extend(settings, shared), {});

    const returnObj: AdvancedSettingsType = {
      tableTypePlaceholderMap: JSON.parse(
        JSON.stringify(this.defaultTableTypePlaceholderMap)
      ),
      tableMapping: Utils.cloneJson(defaultPholderTableMap),
      guardedTableMapping: Utils.cloneJson(this.defaultGuardedPholderTableMap),
      language: Utils.cloneJson(defaultSupportedLanguages),
      others: {},
      settings,
      shared,
      schemaVersion: "3",
    };

    return returnObj;
  }
}
