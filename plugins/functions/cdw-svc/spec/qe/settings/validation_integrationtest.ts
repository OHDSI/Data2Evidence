import * as async from "async";
import { User } from "@alp/alp-base-utils";
import { CDW as cdwConfig } from "../../data/cdw/configs";
import * as testedLib from "../../../src/qe/settings/OldSettings";
import { Settings } from "../../../src/qe/settings/Settings";
import { createConnection } from "./utils/connection";
import { createConnection as  createAnalyticsConnection} from "../../testutils/connection";
import { ConfigFacade } from "../../../src/qe/config/ConfigFacade";
import { FfhQeConfig } from "../../../src/qe/config/config";
import { AssignmentProxy } from "../../../src/AssignmentProxy";

let connectionObj;
let analyticsConnectionObj;
let configFacade;

describe("TEST SUITE TO DEFINE THE BEHAVIOR OF THE GLOBAL SETTINGS VALIDATION", () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

  function deleteGlobalSetting(cb) {
    connectionObj.executeUpdate(
      `delete from  "ConfigDbModels_Config" where "Id" = 'GlobalSettings'`,
      [],
      (err, data) => {
        if (typeof cb === "function") {
          cb(err, data);
        }
      }
    );
  }

  beforeAll((done) => {
    const initConnection = (callback) => {
      createConnection((err, connection) => {
        connectionObj = connection;
        callback(null);
      });
    };
    const initAnalyticsConnection = async (callback) => {
      analyticsConnectionObj = await createAnalyticsConnection("duckdb")
      callback(null)
    };
    
    const setupConfigFacade = (callback) => {
      const ffhQeConfig = new FfhQeConfig(
        connectionObj,
        new AssignmentProxy([]),
        new Settings(),
        new User("TEST_USER")
      );
      configFacade = new ConfigFacade(connectionObj, ffhQeConfig, new User("TEST_USER"));
      callback(null);
    };

    async.series(
      [initConnection, initAnalyticsConnection, setupConfigFacade],
      (err, data) => {
        if (err) {
          throw err;
        }
        done();
      }
    );
  });

  afterAll(() => {
    connectionObj.close();
    analyticsConnectionObj.close();
  });

  describe("Table Validation", () => {
    it("should detect invalid SQL Table Name", async (done) => {
      const invalidTableName = `invalid()`;
      const fromName = invalidTableName;
      const result = await testedLib.validateDBTable(analyticsConnectionObj, fromName);
      expect(result.valid).toBe(false);
      expect(result.message).toBe("HPH_CFG_GLOBAL_DB_OBJECT_INCORRECT_FORMAT");
      done();
    });

    it("should detect SQL Table Name that does not exist", async (done) => {
      const noSuchTableName = `does_not_exist`;
      const fromName = noSuchTableName;
      const result = await testedLib.validateDBTable(analyticsConnectionObj, fromName);
      expect(result.valid).toBe(false);
      expect(result.message).toBe("HPH_CFG_GLOBAL_DB_OBJECT_NOT_FOUND");
      done();
    });
  });

  describe("Validate Settings", () => {
    it("should detect invalid SQL Table Name and non exist Table in different placeholders", (done) => {
      const config = JSON.parse(JSON.stringify(cdwConfig));
      const invalidTableName = `invalid()`;
      const noSuchTableName = `does_not_exist`;

      config.advancedSettings.tableMapping = {
        "@INTERACTION": invalidTableName,
        "@REF": `I_DO_NOT_HAVE_A_SCHEMA`,
      };

      config.advancedSettings.guardedTableMapping = {
        "@PATIENT": noSuchTableName,
      };

      configFacade.invokeService(
        {
          action: "validate",
          config,
        },
        (err, res) => {
          expect(
            res.validationResult.advancedConfigValidationResult.messages.length
          ).toBe(3);
          done();
        }
      );
    });

    it("should detect empty placeholders", (done) => {
      const config = JSON.parse(JSON.stringify(cdwConfig));
      config.advancedSettings.tableMapping = {
        "@INTERACTION.START": "",
        "@INTERACTION.END": "",
      };
      configFacade.invokeService(
        {
          action: "validate",
          config,
        },
        (err, res) => {
          const messages =
            res.validationResult.advancedConfigValidationResult.messages;
          expect(messages.length).toBe(2);
          expect(messages[0].source).toEqual("tableMapping.@INTERACTION.START");
          expect(messages[0].message).toEqual(
            "HPH_CFG_GLOBAL_PLACEHOLDER_REQUIRED"
          );
          expect(messages[1].source).toEqual("tableMapping.@INTERACTION.END");
          expect(messages[1].message).toEqual(
            "HPH_CFG_GLOBAL_PLACEHOLDER_REQUIRED"
          );
          done();
        }
      );
    });
  });
});
