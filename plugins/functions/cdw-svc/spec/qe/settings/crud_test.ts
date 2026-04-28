import * as testedLib from "../../../src/qe/settings/Settings";
import { createConnection } from "../../testutils/connection";
import { QUERY } from "../../../src/qe/settings/Defaults";
import { CDW as cdwConfig } from "../../data/cdw/configs";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

const Settings = testedLib.Settings;
let settingsObj: testedLib.Settings;
let connection;
const CONFIG_ID = "CDWTestConfig1";
describe("Global settings endpoints", () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
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
    connection.executeUpdate(query, parameters, cb);
  }

  function deleteCDWConfig(cb) {
    connection.executeUpdate(
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
             FROM "${connection.schemaName}"."ConfigDbModels_Config"
             WHERE "Id" = '${CONFIG_ID}'`;
    const queryObj = QueryObject.format(querySql);
    queryObj.executeQuery(connection, (err, result) => {
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

  beforeAll((done) => {
    createConnection().then((data) => {
      connection = data;
      settingsObj = new Settings();
      done();
    });
  });

  beforeEach((done) => {
    deleteCDWConfig(done);
  });

  afterAll(() => {
    deleteCDWConfig(null);
    connection.close();
  });

  it("getDefaultGlobalSettings() - Gets default global settings", (done) => {
    const res = settingsObj.getDefaultAdvancedSettings();
    expect(res.tableMapping).toBeDefined();
    expect(res.guardedTableMapping).toBeDefined();
    expect(res.language).toBeDefined();
    expect(res.settings).toBeDefined();
    expect(res.settings.dateFormat).toBeDefined();
    expect(res.settings.timeFormat).toBeDefined();
    done();
  });

  it("loadGlobalSettings() - Returned object should have the same property configId and advance settings", (done) => {
    insertCDWConfig(() => {
      getConfigs((err, result) => {
        expect(result[0].configId).toEqual(CONFIG_ID);
        expect(result[0].config.advancedSettings).not.toBeNull();
        done();
      });
    });
  });
});
