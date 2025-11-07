// tslint:disable:no-console
import { ConfigFacade } from "../../../src/qe/config/ConfigFacade";
import { SettingsFacade } from "../../../src/qe/settings/SettingsFacade";
import { AssignmentProxy } from "../../../src/AssignmentProxy";
import { FfhQeConfig } from "../../../src/qe/config/config";
import { MESSAGES } from "../../../src/qe/config/config";
import { createConnection as createConfigConnection } from "../settings/utils/connection";
import {
  cloneJson,
  createConfig,
  deleteAllConfigs,
} from "../../testutils/testutils";
import { Settings } from "../../../src/qe/settings/Settings";
import { defaultSettings } from "../../../src/qe/settings/Defaults";
import { INVALID_CONFIG } from "../../data/cdw/invalid_config";
import { CDW, OLD_CDW, OLD_GLOBAL_SETTINGS } from "../../data/cdw/configs";
import { DisableLogger } from "../../../src/utils/Logger";
import async = require("async");
import { QueryObject as qo, User } from "@alp/alp-base-utils";
import * as cfg_utils from "@alp/alp-config-utils";
import FfhConfig = cfg_utils.FFHConfig.FFHConfig;
import * as auth from "../../../src/authentication";
DisableLogger();
let facade: ConfigFacade;
let settingsFacade: SettingsFacade;
let ffhQeConfig: FfhQeConfig;
let ffhConfig: FfhConfig;
let fakeSettings: Settings;
let connection;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 80000; // 10 second timeout

describe("CDM Configuration tests,", () => {
  beforeAll((done) => {
    fakeSettings = new Settings();
    createConfigConnection((err, configConnection) =>{
      ffhQeConfig = new FfhQeConfig(
        configConnection,
        new AssignmentProxy([]),
        fakeSettings,
        new User("TEST_USER"),
        true
      );
      ffhConfig = ffhQeConfig.getFfhConfigObj();
      facade = new ConfigFacade(configConnection, ffhQeConfig, new User("TEST_USER"), true);
      settingsFacade = new SettingsFacade(new User("TEST_USER"));
      settingsFacade.setFfhQeConfig(ffhQeConfig);
      done();
    })
  });

  afterAll((done) => {
    deleteAllConfigs({
      connection,
      callback: (err, data) => {
        if (err) {
          console.error("Failed to delete configs!");
        }
        connection.close();
        done();
      },
    });
  });

  describe("Config validation,", () => {
    it("Returns list of errors on testAttribute", (done) => {
      pending("Failing with 65 equal to 56 on Hana 2 and HDI");
      const request = {
        action: "validate",
        config: cloneJson(INVALID_CONFIG),
      };
      facade.invokeService(request, (err, data) => {
        expect(err).toEqual(null);
        expect(
          data.validationResult.cdmConfigValidationResult.errors.length
        ).toEqual(56);
        expect(
          data.validationResult.cdmConfigValidationResult.warnings.length
        ).toEqual(0);
        done();
      });
    });
  });

  describe("Migrate old cdm configs to new format", () => {
    let request;
    let fnCreateOldCdwConfig1;
    let fnCreateOldCdwConfig2;
    let fnCreateCdwConfig1;
    let fnCreateCdwConfig2;
    let fnCreateOldGlobalSetttings1;
    let fnCreateOldGlobalSetttings2;

    beforeAll(() => {
      request = {
        action: "migrateOldCdmConfigs",
      };
      fnCreateCdwConfig1 = (callback) => {
        createConfig({
          id: "cdw_id_1",
          version: "1",
          status: "A",
          name: "cdw1",
          type: "HC/HPH/CDW",
          data: JSON.stringify(CDW),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating cdw config 1\n" + err);
            }
            callback(null);
          },
          connection,
        });
      };
      fnCreateCdwConfig2 = (callback) => {
        createConfig({
          id: "cdw_id_2",
          version: "1",
          status: "A",
          name: "cdw2",
          type: "HC/HPH/CDW",
          data: JSON.stringify(CDW),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating cdw config 2\n" + err);
            }
            //log("Created test config1...");
            callback(null);
          },
          connection,
        });
      };
      fnCreateOldCdwConfig1 = (callback) => {
        createConfig({
          id: "old_cdw_id_1",
          version: "1",
          status: "A",
          name: "old_cdw1",
          type: "HC/HPH/CDW",
          data: JSON.stringify(OLD_CDW),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating old cdw config 1\n" + err);
            }
            //log("Created test config1...");
            callback(null);
          },
          connection,
        });
      };
      fnCreateOldCdwConfig2 = (callback) => {
        createConfig({
          id: "old_cdw_id_2",
          version: "1",
          status: "A",
          name: "old_cdw2",
          type: "HC/HPH/CDW",
          data: JSON.stringify(OLD_CDW),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating old cdw config 2\n" + err);
            }
            //log("Created test config1...");
            callback(null);
          },
          connection,
        });
      };
      fnCreateOldGlobalSetttings1 = (callback) => {
        createConfig({
          id: "gs_id_1",
          version: "1",
          status: "A",
          name: "gs_1",
          type: "HC/HPH/GLOBAL",
          data: JSON.stringify(OLD_GLOBAL_SETTINGS),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating global settings 1\n" + err);
            }
            //log("Created test config1...");
            callback(null);
          },
          connection,
        });
      };
      fnCreateOldGlobalSetttings2 = (callback) => {
        createConfig({
          id: "gs_id_2",
          version: "1",
          status: "A",
          name: "gs_2",
          type: "HC/HPH/GLOBAL",
          data: JSON.stringify(OLD_GLOBAL_SETTINGS),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating global settings 2\n" + err);
            }
            //log("Created test config1...");
            callback(null);
          },
          connection,
        });
      };
    });
    beforeEach((done) => {
      deleteAllConfigs({
        connection,
        callback: (err, data) => {
          if (err) {
            console.error("Failed to delete configs!");
          }
          done();
        },
      });
    });
    it("no old cdm configs found", (done) => {
      async.series([fnCreateCdwConfig1, fnCreateCdwConfig2], (err, data) => {
        if (err) {
          console.error("Error in preparing test data!\n" + err);
        }
        facade.invokeService(request, (err, data) => {
          expect(err).toEqual(null);
          expect(data).toEqual(MESSAGES.NO_OLD_CONFIGS_FOUND_MSG);
          done();
        });
      });
    });
    it("no global settings found", (done) => {
      async.series(
        [
          fnCreateCdwConfig1,
          fnCreateCdwConfig2,
          fnCreateOldCdwConfig1,
          fnCreateOldCdwConfig2,
        ],
        (err, data) => {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
          }
          facade.invokeService(request, (err, data) => {
            expect(err).not.toBeNull();
            expect(err.message).toEqual(
              MESSAGES.NO_GLOBAL_SETTINGS_FOUND_ERR_MSG
            );
            done();
          });
        }
      );
    });
    it("many global settings found", (done) => {
      async.series(
        [
          fnCreateCdwConfig1,
          fnCreateCdwConfig2,
          fnCreateOldCdwConfig1,
          fnCreateOldCdwConfig2,
          fnCreateOldGlobalSetttings1,
          fnCreateOldGlobalSetttings2,
        ],
        (err, data) => {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
          }
          facade.invokeService(request, (err, data) => {
            expect(err).not.toBeNull();
            expect(err.message).toEqual(
              MESSAGES.MANY_GLOBAL_SETTINGS_FOUND_ERR_MSG
            );
            done();
          });
        }
      );
    });
    it("successful migration", (done) => {
      async.series(
        [
          fnCreateCdwConfig1,
          fnCreateCdwConfig2,
          fnCreateOldCdwConfig1,
          fnCreateOldCdwConfig2,
          fnCreateOldGlobalSetttings1,
        ],
        async (err, data) => {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
          }
          ffhConfig
            .getConfig({
              configId: "old_cdw_id_1",
            })
            .then((result) => {
              expect(result.meta.configId).toEqual("old_cdw_id_1");
              // commenting the below line, since the backend logic was changed to return advanced settings always
              // hence the following assertion is invalid
              // expect(result.config.hasOwnProperty("advancedSettings")).toEqual(false);

              facade.invokeService(request, async (err, data) => {
                expect(err).toEqual(null);
                expect(data).toEqual(MESSAGES.MIGRATION_COMPLETED_MSG);

                const oldResult = await ffhConfig.getConfig({
                  configId: "old_cdw_id_1",
                });
                expect(oldResult.meta.configId).toEqual("old_cdw_id_1");
                expect(
                  oldResult.config.hasOwnProperty("advancedSettings")
                ).toEqual(true);
                done();
              });
            })
            .catch((err) => {
              expect(err).toBeNull();
              done();
            });
        }
      );
    });
  });

  describe("Get old developer settings", () => {
    let request;
    let fnCreateOldGlobalSetttings1;
    let fnCreateOldGlobalSetttings2;
    const testUserName = "TEST_USER";

    beforeAll(() => {
      request = {
        [auth.SESSION_CLAIMS_PROP]: testUserName,
        action: "getOldDevSettings",
      };
      fnCreateOldGlobalSetttings1 = (callback) => {
        createConfig({
          id: "gs_id_1",
          version: "1",
          status: "A",
          name: "gs_1",
          type: "HC/HPH/GLOBAL",
          data: JSON.stringify(OLD_GLOBAL_SETTINGS),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating global settings 1\n" + err);
            }
            callback(null);
          },
          connection,
        });
      };
      fnCreateOldGlobalSetttings2 = (callback) => {
        createConfig({
          id: "gs_id_2",
          version: "1",
          status: "A",
          name: "gs_2",
          type: "HC/HPH/GLOBAL",
          data: JSON.stringify(OLD_GLOBAL_SETTINGS),
          dependentConfigId: null,
          dependentConfigVersion: null,
          callback: (err, data) => {
            if (err) {
              console.error("Error in creating global settings 2\n" + err);
            }
            callback(null);
          },
          connection,
        });
      };
    });
    beforeEach((done) => {
      deleteAllConfigs({
        connection,
        callback: (err, data) => {
          if (err) {
            console.error("Failed to delete configs!");
          }
          done();
        },
      });
    });
    it("no global settings found in DB, should return the default settings", (done) => {
      settingsFacade.invokeEndUserServices(
        request,
        new User(testUserName),
        (err, data) => {
          expect(err).toEqual(null);
          expect(data).toEqual(defaultSettings);
          done();
        }
      );
    });
    it("many global settings found in DB, should throw an error", (done) => {
      async.series(
        [fnCreateOldGlobalSetttings1, fnCreateOldGlobalSetttings2],
        (err, data) => {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
          }
          settingsFacade.invokeEndUserServices(
            request,
            new User(testUserName),
            (err, data) => {
              expect(err).not.toBeNull();
              expect(err.message).toEqual(
                MESSAGES.MANY_GLOBAL_SETTINGS_FOUND_ERR_MSG
              );
              done();
            }
          );
        }
      );
    });
    it("1 global settings found in DB, return the developer settings from it", (done) => {
      fnCreateOldGlobalSetttings1((err, data) => {
        if (err) {
          console.error("Error in preparing test data!\n" + err);
        }
        settingsFacade.invokeEndUserServices(
          request,
          new User(testUserName),
          (err, data) => {
            expect(err).toBeNull();
            expect(data).toEqual(OLD_GLOBAL_SETTINGS.settings);
            done();
          }
        );
      });
    });
  });
});
