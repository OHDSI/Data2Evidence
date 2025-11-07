import * as testedLib from "../../../src/qe/settings/Settings";
import { createConnection } from "./utils/connection";
import {
  defaultInterfaceViewsPholderTableMap,
  QUERY,
} from "../../../src/qe/settings/Defaults";
import * as async from "async";
import { CDW_FP2 as FP2Config } from "../../data/cdw/configs";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

const Settings = testedLib.Settings;
let settingsObj: testedLib.Settings;
let connectionObj;
const CONFIG_ID = "CDWTestConfig1";

const columnCheck = [
  "@INTERACTION.PATIENT_ID",
  "@INTERACTION.INTERACTION_ID",
  "@INTERACTION.CONDITION_ID",
  "@INTERACTION.PARENT_INTERACT_ID",
  "@INTERACTION.START",
  "@INTERACTION.END",
  "@INTERACTION.INTERACTION_TYPE",
  "@OBS.PATIENT_ID",
  "@OBS.OBSERVATION_ID",
  "@OBS.OBS_TYPE",
  "@OBS.OBS_CHAR_VAL",
  "@CODE.INTERACTION_ID",
  "@CODE.ATTRIBUTE",
  "@CODE.VALUE",
  "@MEASURE.INTERACTION_ID",
  "@MEASURE.ATTRIBUTE",
  "@MEASURE.VALUE",
  "@REF.VOCABULARY_ID",
  "@REF.CODE",
  "@REF.TEXT",
  "@TEXT.INTERACTION_TEXT_ID",
  "@TEXT.INTERACTION_ID",
  "@TEXT.VALUE",
  "@PATIENT.PATIENT_ID",
  "@PATIENT.DOD",
  "@PATIENT.DOB",
];

function deleteConfig(cb) {
  connectionObj.executeUpdate(
    `delete from  "ConfigDbModels_Config" where "Id"='${CONFIG_ID}'`,
    [],
    cb
  );
}

let savedConfig;

function createConfig(config, cb) {
  const query = QUERY.CREATE_GLOBAL_SETTINGS;
  const parameters = [
    { value: CONFIG_ID },
    { value: "A" },
    { value: "A" },
    { value: "GLOBAL" },
    { value: "HC/HPH/CDW" },
    { value: "" },
    { value: "" },
    { value: JSON.stringify(config) },
  ];
  connectionObj.executeUpdate(query, parameters, cb);
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

describe("TEST SUITE FOR MIGRATION TESTS", () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

  beforeAll((done) => {
    const initConnection = (callback) => {
      createConnection((err, connection) => {
        connectionObj = connection;
        callback(null);
      });
    };

    async.series([initConnection], (err, data) => {
      if (err) {
        throw err;
      }
      done();
    });
  });

  afterAll((done) => {
    deleteConfig(() => {
      connectionObj.close();
      done();
    });
  });

  describe("FP2 TO FP3", () => {
    beforeEach((done) => {
      deleteConfig(() => {
        connectionObj.commit();

        createConfig(FP2Config, (err, result) => {
          if (err) {
            throw err;
          }
          connectionObj.commit();
          settingsObj = new Settings();

          getConfigs((err, result) => {
            savedConfig = result[0];
            done();
          });
        });
      });
    });
    it("should return interfaceView columns if there is already a saved FP2 Global Settings - getPlaceholderMap", () => {
      const pholderMap = savedConfig.config.advancedSettings.tableMapping;

      columnCheck.forEach((col) => {
        expect(pholderMap[col]).toEqual(
          defaultInterfaceViewsPholderTableMap[col]
        );
      });
    });
    it("should return interfaceView columns if there is already a saved FP2 Global Settings - loadGlobalSettings", (done) => {
      const pholderMap = savedConfig.config.advancedSettings.tableMapping;

      columnCheck.forEach((col) => {
        expect(pholderMap[col]).toEqual(
          defaultInterfaceViewsPholderTableMap[col]
        );
      });
      done();
    });
  });
});
