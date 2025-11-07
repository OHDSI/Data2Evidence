import { CDW as cdwConfig } from "../../data/cdw/configs";
import { Settings } from "../../../src/qe/settings/Settings";
import {
  defaultPholderTableMap,
  defaultGuardedPholderTable,
} from "../../../src/qe/settings/Defaults";
import { createConnection } from "./utils/connection";
import { QUERY } from "../../../src/qe/settings/Defaults";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

let settingsObj: Settings;
let connectionObj;
const CONFIG_ID = "CDWTestConfig1";

/**
 * As per the lastest design, most of the parameters such as table mappings,
 * guarded place holder mappings, etc. are integrated with CDW config.
 * @param cb callback function
 */
function insertCDWConfig(cb) {
  const query = QUERY.CREATE_GLOBAL_SETTINGS;
  const parameters = [
    { value: CONFIG_ID },
    { value: "0" },
    { value: "A" },
    { value: "CDW Demo Config" },
    { value: "HC/HPH/CDW" },
    { value: "" },
    { value: "" },
    { value: JSON.stringify(cdwConfig) },
  ];
  connectionObj.executeUpdate(query, parameters, cb);
}

function deleteCDWConfig(cb) {
  connectionObj.executeUpdate(
    `delete from  "ConfigDbModels_Config" where "Id" = '${CONFIG_ID}'`,
    [],
    (err, data) => {
      if (typeof cb === "function") {
        cb(err, data);
      }
    }
  );
}

function getConfigs(callback) {
  const querySql = `SELECT "Id","Version","Status","Name","Type", "ParentId" as "ParentID",
            "ParentVersion" as "ParentVersion","Creator","Created","Modifier","Modified","Data"
         FROM "${connectionObj.schemaName}"."ConfigDbModels_Config"
         WHERE "Id" = '${CONFIG_ID}'`;
  const queryObj = QueryObject.format(querySql);
  queryObj.executeQuery(connectionObj, (err, result) => {
    if (err) {
      throw err;
    }
    const data = [];
    result.data.forEach((row) => {
      data.push({
        configId: row.Id,
        configVersion: row.Version,
        configStatus: row.Status,
        configName: row.Name,
        configType: row.Type,
        dependentConfigId: row.ParentID,
        dependentConfigVersion: row.ParentVersion,
        creator: row.Creator,
        created: row.Created,
        modifier: row.Modifier,
        modified: row.Modified,
        config: JSON.parse(row.Data),
      });
    });
    callback(null, data);
  });
}

describe("Check if placeholders are loaded correctly", () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
  beforeAll((done) => {
    createConnection((err, connection) => {
      connectionObj = connection;
      settingsObj = new Settings();
      done();
    });
  });
  beforeEach((done) => {
    deleteCDWConfig(done);
  });

  afterAll((done) => {
    deleteCDWConfig(() => {
      connectionObj.close();
      done();
    });
  });

  it("returns a complete placeholdertablemap (including tables and columns) on loadGlobalSettings", (done) => {
    insertCDWConfig(() => {
      getConfigs((err, result) => {
        expect(result[0].configId).toEqual(CONFIG_ID);
        expect(result[0].config.advancedSettings).not.toBeNull;
        Object.keys(defaultPholderTableMap).forEach((key) => {
          expect(
            result[0].config.advancedSettings.tableMapping[key]
          ).toBeDefined();
        });
        done();
      });
    });
  });

  it("returns a complete guardedTableMapping (including tables and columns) on loadGlobalSettings", (done) => {
    insertCDWConfig(() => {
      getConfigs((err, result) => {
        expect(result[0].configId).toEqual(CONFIG_ID);
        expect(result[0].config.advancedSettings).not.toBeNull;
        expect(
          result[0].config.advancedSettings.guardedTableMapping["@PATIENT"]
        ).toBeDefined();
        done();
      });
    });
  });

  it("returns default placeholdertablemap on getDefaultGlobalSettings", () => {
    const globalSettings = settingsObj.getDefaultAdvancedSettings();

    Object.keys(defaultPholderTableMap).forEach((key) => {
      expect(globalSettings.tableMapping[key]).toEqual(
        defaultPholderTableMap[key]
      );
    });
  });

  it("returns default guardedTableMapping on getDefaultGlobalSettings", () => {
    const globalSettings = settingsObj.getDefaultAdvancedSettings();

    Object.keys(defaultPholderTableMap).forEach((key) => {
      if (key === "@PATIENT") {
        expect(globalSettings.guardedTableMapping[key]).toEqual(
          defaultGuardedPholderTable
        );
      } else {
        expect(globalSettings.guardedTableMapping[key]).toEqual(
          defaultPholderTableMap[key]
        );
      }
    });
  });
});
