import async = require("async");
import * as testEnvLib from "../testutils/testenv/testenvironment";
import { deleteAllConfigs } from "../testutils/testutils";
import { createConnection, credentialsMap } from "../testutils/connection";
import { FFHConfig } from "@alp/alp-config-utils";
import { QueryObject as qo, User } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import FfhConfig = FFHConfig.FFHConfig;
let configLib: FfhConfig;

let connection;
let testEnvironment;
const credentials = credentialsMap.postgresql;
const testSchemaName = credentials.schema;

function createTestConfig(
  id,
  version,
  status,
  name,
  type,
  data,
  dependentConfigId,
  dependentConfigVersion,
  callback
) {
  name = name || "";
  let querySql =
    'INSERT INTO "ConfigDbModels_Config" ' +
    '("Id","Version","Status","Name","Type","Data","Creator","Modifier", "ParentId", "ParentVersion","Created","Modified")' +
    "VALUES (%s,%s,%s,%s,%s,TO_NCLOB(%s),%s,%s,%s,%s,CURRENT_UTCTIMESTAMP,CURRENT_UTCTIMESTAMP)";

  let params = [];
  params.push(id);
  params.push(version);
  params.push(status);
  params.push(name);
  params.push(type);
  params.push(data);
  params.push("TEST_USER");
  params.push("TEST_USER");

  if (dependentConfigId) {
    params.push(dependentConfigId);
    params.push(dependentConfigVersion);
  } else {
    params.push(null);
    params.push(null);
    querySql = querySql.replace(
      "(%s,%s,%s,%s,%s,TO_NCLOB(%s),%s,%s,%s,%s,CURRENT_UTCTIMESTAMP,CURRENT_UTCTIMESTAMP)",
      "(%s,%s,%s,%s,%s,TO_NCLOB(%s),%s,%s,%UNSAFE,%UNSAFE,CURRENT_UTCTIMESTAMP,CURRENT_UTCTIMESTAMP)"
    );
  }

  params.unshift(querySql); //insert query at the beginning

  const queryObj = QueryObject.format.apply(this, params);
  queryObj.executeUpdate(connection, function (err, result) {
    if (err) {
      callback(err);
    } else {
      callback(err);
    }
  });
}

function getConfigs(callback) {
  const querySql =
    'SELECT "Id","Version","Status","Name","Type", "ParentId" as "ParentID", "ParentVersion" as "ParentVersion","Creator","Created","Modifier","Modified","Data" ' +
    'FROM "ConfigDbModels_Config"';

  const queryObj = QueryObject.format(querySql);
  queryObj.executeQuery(connection, function (err, result) {
    if (err) {
    }
    const data = [];
    result.data.forEach(function (row) {
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

function onlyMetaData(obj) {
  return {
    configId: obj.configId,
    configVersion: obj.configVersion,
    configStatus: obj.configStatus,
  };
}

function configSorter(a, b) {
  if (a.configId > b.configId) {
    return 1;
  } else if (a.configId < b.configId) {
    return -1;
  } else {
    if (a.configVersion > b.configVersion) {
      return 1;
    } else if (a.configVersion < b.configVersion) {
      return -1;
    } else {
      return 0;
    }
  }
}

const configToSaveTemplate = {
  config: {
    a: 1,
  },
  configType: "HC/HPH/CDW",
  configId: "id",
  configVersion: "1",
  configStatus: "A",
  configName: "test config",
};

const expectedSaveConfigTemplate = {
  config: {
    a: 1,
  },
  configType: "HC/HPH/CDW",
  configId: "id",
  configVersion: "1",
  configStatus: "A",
  configName: "test config",
  creator: "ALICE",
  modifier: "ALICE",
  dependentConfigId: "NoValue",
  dependentConfigVersion: "NoValue",
};
const expectedGetConfigTemplate = {
  config: {
    a: 1,
  },
  meta: {
    configId: "id",
    configVersion: "1",
    configStatus: "A",
    configName: "name",
    configType: "HC/HPH/CDW",
    dependentConfig: {
      configId: "NoValue",
      configVersion: "NoValue",
    },
    creator: "TEST_USER",
    modifier: "TEST_USER",
  },
};

const mriConfigToSaveTemplate = {
  config: {
    a: 1,
  },
  configType: "HC/MRI/PA",
  configId: "PatientAnalyticsInitialCI",
  configVersion: "A",
  configName: "test mri config",
  dependentConfig: {
    configId: "id",
    configVersion: "A",
  },
};

const clearConfigs = (callback) => {
  deleteAllConfigs({
    connection,
    callback: (err, data) => {
      if (err) {
        console.error("Error in preparing test data!\n" + err);
        throw new Error("error preparing test data");
      }
      callback();
    },
  });
};

describe("The config services", function () {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
  beforeAll((done) => {
    createConnection()
      .then((data) => {
        connection = data;
        configLib = new FfhConfig(connection, new User(""));

        testEnvironment = new testEnvLib.TestEnvironment(
          credentials.dialect,
          data.conn,
          testSchemaName,
          false,
          true,
          (err, results) => {
            if (err) {
              console.error("Error in initializing TestEnvironment!");
            }
            done();
          }
        );
      })
      .catch(done);
  });

  afterAll(function (done) {
    testEnvironment.clearSchema(function (err, results) {
      if (err) {
        console.error("Error in truncating tables!");
      }
      connection.close();
      done();
    });
  });

  describe(".saveConfig()", function () {
    beforeEach(clearConfigs);

    it('saves a config to "ConfigDbModels_Config"', function (done) {
      configLib.saveConfig(configToSaveTemplate, function (err, saveResult) {
        expect(saveResult.saved).toEqual(true);
        expect(err).toBeNull();
        getConfigs(function (err, result) {
          expect(result.length).toEqual(1);
          delete result[0].created;
          delete result[0].modified;
          const expectedResult = [expectedSaveConfigTemplate];
          expect(result).toEqual(expectedResult);
          done();
        });
      });
    });

    it("generates an id, if none is specified", function (done) {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.configId;
      configLib.saveConfig(configToSave, function (err, saveResult) {
        const id = saveResult.meta.configId;
        expect(saveResult.saved).toEqual(true);

        getConfigs(function (err, result) {
          expect(result.length).toEqual(1);
          delete result[0].created;
          delete result[0].modified;

          if (result[0].dependentConfigId === "NULL") {
            result[0].dependentConfigId = null;
          }
          if (result[0].dependentConfigVersion === "NULL") {
            result[0].dependentConfigVersion = null;
          }
          const expectedConfig = JSON.parse(
            JSON.stringify(expectedSaveConfigTemplate)
          );
          expectedConfig.configId = id;
          const expectedResult = [expectedConfig];
          expect(result).toEqual(expectedResult);
          done();
        });
      });
    });

    it("version will be blank, if none is specified", function (done) {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.configVersion;
      configLib.saveConfig(configToSave, function (err, saveResult) {
        expect(saveResult.saved).toEqual(true);

        getConfigs(function (err, result) {
          expect(result.length).toEqual(1);
          delete result[0].created;
          delete result[0].modified;
          if (result[0].dependentConfigId === "NULL") {
            result[0].dependentConfigId = null;
          }
          if (result[0].dependentConfigVersion === "NULL") {
            result[0].dependentConfigVersion = null;
          }
          const expectedConfig = JSON.parse(
            JSON.stringify(expectedSaveConfigTemplate)
          );
          expectedConfig.configVersion = "";
          const expectedResult = [expectedConfig];
          expect(result).toEqual(expectedResult);
          done();
        });
      });
    });

    it("name will be blank (NoValue), if none is specified", function (done) {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.configName;
      configLib.saveConfig(configToSave, function (err, saveResult) {
        expect(saveResult.saved).toEqual(true);
        getConfigs(function (err, result) {
          expect(result.length).toEqual(1);
          delete result[0].created;
          delete result[0].modified;

          const expectedConfig = JSON.parse(
            JSON.stringify(expectedSaveConfigTemplate)
          );
          expectedConfig.configName = "";
          const expectedResult = [expectedConfig];
          expect(result).toEqual(expectedResult);
          done();
        });
      });
    });

    it("dependentConfig will be Novalue, if none is specified", function (done) {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.dependentConfigId;
      delete configToSave.dependentConfigVersion;
      configLib.saveConfig(configToSave, function (err, saveResult) {
        expect(saveResult.saved).toEqual(true);

        getConfigs(function (err, result) {
          expect(result.length).toEqual(1);
          delete result[0].created;
          delete result[0].modified;
          if (result[0].dependentConfigId === "NULL") {
            result[0].dependentConfigId = null;
          }
          if (result[0].dependentConfigVersion === "NULL") {
            result[0].dependentConfigVersion = null;
          }

          const expectedConfig = JSON.parse(
            JSON.stringify(expectedSaveConfigTemplate)
          );
          const expectedResult = [expectedConfig];
          expect(result).toEqual(expectedResult);
          done();
        });
      });
    });

    it("saving with the dependentConfig ", function (done) {
      const configToSave = JSON.parse(JSON.stringify(mriConfigToSaveTemplate));
      configLib.saveConfig(configToSave, function (err, saveResult) {
        expect(saveResult.saved).toEqual(true);
        expect(saveResult.meta.dependentConfig.configId).toEqual(
          mriConfigToSaveTemplate.dependentConfig.configId
        );
        expect(saveResult.meta.dependentConfig.configVersion).toEqual(
          mriConfigToSaveTemplate.dependentConfig.configVersion
        );
        done();
      });
    });

    it("throws an error, if no config type is specified", (done) => {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.configType;
      configLib.saveConfig(configToSave, (err, result) => {
        expect(err.message).toEqual("HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
        done();
      });
    });

    it("does not create any entries, if no config type is specified", (done) => {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.configType;
      try {
        configLib.saveConfig(configToSave, function (err, result) {
          getConfigs(function (err, result) {
            expect(result.length).toEqual(0);
            done();
          });
        });
      } catch (e) {
        done();
      }
    });

    it("throws an error, if no config is specified", function (done) {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.config;
      configLib.saveConfig(configToSave, function (err, result) {
        expect(err.message).toEqual("HPH_CFG_CONFIG_NOT_SPECIFIED");
        done();
      });
    });

    it("does not create any entries, if no config is specified", function (done) {
      const configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
      delete configToSave.config;

      try {
        configLib.saveConfig(configToSave, function (err, result) {
          getConfigs(function (err, result) {
            expect(result.length).toEqual(0);
            done();
          });
        });
      } catch (e) {
        expect(e).toBeNull();
        done();
      }
    });
  });

  describe(".getConfig()", function () {
    beforeEach(function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig4 = function (callback) {
        createTestConfig(
          "id2",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config4\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig5 = function (callback) {
        createTestConfig(
          "pa_id1",
          "A",
          null,
          "test_pa_config",
          "HC/MRI/PA",
          '{"a": 1}',
          "id2",
          "3",
          function (err, data) {
            if (err) {
              console.error("Error in creating test config5\n" + err);
            }
            callback(err);
          }
        );
      };
      async.series(
        [
          clearConfigs,
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          fnCreateTestConfig4,
          fnCreateTestConfig5,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });

    it("queries a config by id, version and status", async (done) => {
      const result = await configLib.getConfig({
        configId: "id",
        configVersion: "1",
        configStatus: "A",
      });
      delete result.meta.created;
      delete result.meta.modified;
      delete result.config.advancedSettings;
      const expectedGetConfig = JSON.parse(
        JSON.stringify(expectedGetConfigTemplate)
      );
      expect(result).toEqual(expectedGetConfig);
      done();
    });

    it("queries a config by id, version", async (done) => {
      const result = await configLib.getConfig({
        configId: "id",
        configVersion: "2",
      });
      delete result.meta.created;
      delete result.meta.modified;
      delete result.config.advancedSettings;
      const expectedGetConfig = JSON.parse(
        JSON.stringify(expectedGetConfigTemplate)
      );
      expectedGetConfig.meta.configVersion = "2";
      expectedGetConfig.meta.configStatus = "I";
      expect(result).toEqual(expectedGetConfig);
      done();
    });

    it("queries a config by id, status", async (done) => {
      const result = await configLib.getConfig({
        configId: "id",
        configStatus: "A",
      });
      delete result.meta.created;
      delete result.meta.modified;
      delete result.config.advancedSettings;
      const expectedGetConfig = JSON.parse(
        JSON.stringify(expectedGetConfigTemplate)
      );
      expect(result).toEqual(expectedGetConfig);
      done();
    });

    it("queries a config by id", async (done) => {
      const result = await configLib.getConfig({
        configId: "id2",
      });
      delete result.meta.created;
      delete result.meta.modified;
      delete result.config.advancedSettings;
      const expectedGetConfig = JSON.parse(
        JSON.stringify(expectedGetConfigTemplate)
      );
      expectedGetConfig.meta.configId = "id2";
      expectedGetConfig.meta.configVersion = "3";
      expectedGetConfig.meta.configStatus = "I";
      expect(result).toEqual(expectedGetConfig);
      done();
    });

    it("retrieve a config stored with dependent config by id", async (done) => {
      const result = await configLib.getConfig({
        configId: "pa_id1",
      });
      expect(result.meta.dependentConfig.configId).not.toBeNull();
      expect(result.meta.dependentConfig.configVersion).not.toBeNull();
      expect(result.meta.dependentConfig.configId).toEqual("id2");
      expect(result.meta.dependentConfig.configVersion).toEqual("3");
      expect(result.meta.configId).toEqual("pa_id1");
      expect(result.meta.configVersion).toEqual("A");
      done();
    });

    it("throws an error, if multiple configs match the query", (done) => {
      configLib
        .getConfig({
          configId: "id",
          configStatus: "I",
        })
        .catch((err) => {
          expect(err).not.toBeNull();
          expect(err.message).toEqual("HPH_CFG_CONFIG_FOUND_MULTIPLE_MATCHES");
          done();
        });
    });

    it("throws an error, if no config id is specified", (done) => {
      configLib
        .getConfig({
          configVersion: "2",
          configStatus: "I",
        })
        .catch((err) => {
          expect(err.message).toEqual("HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
          done();
        });
    });

    it("returns an empty config object, if no configs match the query", async (done) => {
      const result = await configLib.getConfig({
        configId: "id3",
        configStatus: "I",
      });
      expect(result).toEqual({
        config: {},
        meta: {},
      });
      done();
    });
  });

  describe(".checkDependingConfig()", function () {
    beforeEach(function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig4 = function (callback) {
        createTestConfig(
          "id2",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config4\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig5 = function (callback) {
        createTestConfig(
          "pa_id1",
          "A",
          null,
          "test_pa_config",
          "HC/MRI/PA",
          '{"a": 1}',
          "id2",
          "3",
          function (err, data) {
            if (err) {
              console.error("Error in creating test config5\n" + err);
            }
            callback(err);
          }
        );
      };
      async.series(
        [
          clearConfigs,
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          fnCreateTestConfig4,
          fnCreateTestConfig5,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });

    it("retrieve dependening configs by id and version", function (done) {
      configLib.checkDependingConfig(
        {
          configId: "id2",
          configVersion: "3",
        },
        function (err, result) {
          expect(result.data.length).toEqual(1);
          expect(result.data[0].Id).toEqual("pa_id1");
          expect(result.data[0].Version).toEqual("A");
          done();
        }
      );
    });
  });

  describe(".deleteConfig()", function () {
    beforeEach(function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig4 = function (callback) {
        createTestConfig(
          "id2",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config4\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig5 = function (callback) {
        createTestConfig(
          "id3",
          "A",
          "",
          "name",
          "HC/MRI/PA",
          '{"a": 1}',
          "id2",
          "3",
          function (err, data) {
            if (err) {
              console.error("Error in creating test config5\n" + err);
            }
            callback(err);
          }
        );
      };
      async.series(
        [
          clearConfigs,
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          fnCreateTestConfig4,
          fnCreateTestConfig5,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });

    it("deletes a config by id, version and status", function (done) {
      configLib.deleteConfig(
        {
          configId: "id",
          configVersion: "2",
          configStatus: "I",
        },
        function (err, result) {
          getConfigs(function (err, result) {
            const configs = result.map(onlyMetaData);
            const expectedResult = [
              {
                configId: "id",
                configVersion: "1",
                configStatus: "A",
              },
              {
                configId: "id",
                configVersion: "3",
                configStatus: "I",
              },
              {
                configId: "id2",
                configVersion: "3",
                configStatus: "I",
              },
              {
                configId: "id3",
                configVersion: "A",
                configStatus: "",
              },
            ];
            expect(configs).toEqual(expectedResult);
            done();
          });
        }
      );
    });

    it("deletes a config by id and version", function (done) {
      configLib.deleteConfig(
        {
          configId: "id",
          configVersion: "2",
        },
        function (err, result) {
          getConfigs(function (err, result) {
            const configs = result.map(onlyMetaData);
            const expectedResult = [
              {
                configId: "id",
                configVersion: "1",
                configStatus: "A",
              },
              {
                configId: "id",
                configVersion: "3",
                configStatus: "I",
              },
              {
                configId: "id2",
                configVersion: "3",
                configStatus: "I",
              },
              {
                configId: "id3",
                configVersion: "A",
                configStatus: "",
              },
            ];
            expect(configs).toEqual(expectedResult);
            done();
          });
        }
      );
    });

    it("deletes all version of a given status of a config by id", function (done) {
      configLib.deleteConfig(
        {
          configId: "id",
          configStatus: "I",
        },
        function (err, result) {
          getConfigs(function (err, result) {
            const configs = result.map(onlyMetaData);
            const expectedResult = [
              {
                configId: "id",
                configVersion: "1",
                configStatus: "A",
              },
              {
                configId: "id2",
                configVersion: "3",
                configStatus: "I",
              },
              {
                configId: "id3",
                configVersion: "A",
                configStatus: "",
              },
            ];
            expect(configs).toEqual(expectedResult);
            done();
          });
        }
      );
    });

    it("deletes all versions of a config by id", function (done) {
      configLib.deleteConfig(
        {
          configId: "id",
        },
        function (err, result) {
          getConfigs(function (err, result) {
            const configs = result.map(onlyMetaData);
            const expectedResult = [
              {
                configId: "id2",
                configVersion: "3",
                configStatus: "I",
              },
              {
                configId: "id3",
                configVersion: "A",
                configStatus: "",
              },
            ];
            expect(configs).toEqual(expectedResult);
            done();
          });
        }
      );
    });

    it("deletes config with dependent config by id", async (done) => {
      const result = await configLib.getConfig({
        configId: "id3",
      });

      expect(result.meta).not.toBeNull();

      configLib.deleteConfig(
        {
          configId: "id3",
        },
        async (err, result) => {
          const deleteresult = await configLib.getConfig({
            configId: "id3",
          });
          const emptyObj = {};
          expect(deleteresult.meta).toEqual(emptyObj);
          expect(deleteresult.config).toEqual(emptyObj);
          done();
        }
      );
    });

    it("throws an error, when no config id is provided", function (done) {
      configLib.deleteConfig(
        {
          configVersion: "2",
          configStatus: "I",
        },
        (err, result) => {
          expect(err.message).toEqual("HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not delete any entries, when no config id is provided", function (done) {
      configLib.deleteConfig(
        {
          configVersion: "2",
          configStatus: "I",
        },
        (err, result) => {
          getConfigs((err, result) => {
            const configs = result.map(onlyMetaData);
            expect(configs.length).toEqual(5);
            done();
          });
        }
      );
    });

    it("deletes all configs depending on the deleted ones", function (done) {
      configLib.deleteConfig(
        {
          configId: "id2",
          configVersion: "3",
          configStatus: "I",
        },
        function (err, result) {
          getConfigs(function (err, result) {
            const configs = result.map(onlyMetaData);
            const expectedResult = [
              {
                configId: "id",
                configVersion: "1",
                configStatus: "A",
              },
              {
                configId: "id",
                configVersion: "2",
                configStatus: "I",
              },
              {
                configId: "id",
                configVersion: "3",
                configStatus: "I",
              },
            ];
            expect(configs).toEqual(expectedResult);
            done();
          });
        }
      );
    });

    it("will be called accordingly when multi-delete request is called with version and ID", function (done) {
      configLib.deleteMultipleConfig(
        [
          {
            configId: "id2",
            configVersion: "3",
            configStatus: "I",
          },
          {
            configId: "id",
            configVersion: "1",
            configStatus: "A",
          },
        ],
        0,
        function (err, result) {
          getConfigs(function (err, result) {
            const configs = result.map(onlyMetaData);
            const expectedResult = [
              {
                configId: "id",
                configVersion: "2",
                configStatus: "I",
              },
              {
                configId: "id",
                configVersion: "3",
                configStatus: "I",
              },
            ];
            expect(configs).toEqual(expectedResult);
            done();
          });
        }
      );
    });

    it("will be called accordingly when multi-delete request is called with ID", function (done) {
      configLib.deleteMultipleConfig(
        [
          {
            configId: "id3",
          },
          {
            configId: "id",
          },
        ],
        0,
        function (err, result) {
          getConfigs(function (err, result) {
            const configs = result.map(onlyMetaData);
            const expectedResult = [
              {
                configId: "id2",
                configVersion: "3",
                configStatus: "I",
              },
            ];
            expect(configs).toEqual(expectedResult);
            done();
          });
        }
      );
    });
  });

  describe(".getList()", function () {
    beforeEach(clearConfigs);

    it("returns an empty list, if there are no configs.", function (done) {
      configLib.getList((err, result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it("returns a list with one set of config meta data, if there is only one config.", function (done) {
      const fnCreateTestConfig = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config\n" + err);
            }
            callback(err);
          }
        );
      };

      const testSpecs = function (callback) {
        configLib.getList(function (err, result) {
          const expectedResult = [
            {
              configId: "id",
              configVersion: "1",
              configName: "name",
              configType: "HC/HPH/CDW",
            },
          ];
          expect(result).toEqual(expectedResult);
          done();
        });
      };

      async.series([fnCreateTestConfig, testSpecs], function (err, data) {
        if (err) {
          console.error("Error in preparing test data!\n" + err);
          throw new Error("error preparing test data");
        }
        done();
      });
    });

    it("returns a list with multiple sets of config meta data, one for each config version", function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id2",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };

      const testSpecs = function (callback) {
        configLib.getList(function (err, result) {
          const expectedResult = [
            {
              configId: "id",
              configVersion: "1",
              configName: "name",
              configType: "HC/HPH/CDW",
            },
            {
              configId: "id",
              configVersion: "2",
              configName: "name",
              configType: "HC/HPH/CDW",
            },
            {
              configId: "id2",
              configVersion: "3",
              configName: "name",
              configType: "HC/HPH/CDW",
            },
          ];
          expect(result).toEqual(expectedResult);
          done();
        });
      };

      async.series(
        [
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          testSpecs,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });
  });

  describe(".getAllConfigs()", function () {
    beforeEach(clearConfigs);

    it("returns an empty list, if there are no configs of a given type.", function (done) {
      configLib.getAllConfigs("HC/HPH/CDW", function (err, result) {
        const expectedResult = [];
        expect(result).toEqual(expectedResult);
        done();
      });
    });

    it("returns a list of all config versions of a given type.", function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id2",
          "A",
          "",
          "name",
          "HC/MRI/PA",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };

      const testSpecs = function (callback) {
        configLib.getAllConfigs("HC/HPH/CDW", function (err, configs) {
          expect(configs.length).toEqual(2);
          const configMeta = configs.map(onlyMetaData).sort(configSorter);

          const config1 = JSON.parse(
            JSON.stringify(expectedGetConfigTemplate.meta)
          );
          const config2 = JSON.parse(
            JSON.stringify(expectedGetConfigTemplate.meta)
          );
          config2.configVersion = "2";
          config2.configStatus = "I";

          const expectedConfigMeta = [config1, config2]
            .map(onlyMetaData)
            .sort(configSorter);
          expect(configMeta).toEqual(expectedConfigMeta);
          done();
        });
      };

      async.series(
        [
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          testSpecs,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });

    it("throws an error, if there is no config type specified.", function (done) {
      function getAllWrapper() {
        configLib.getAllConfigs("", function (err, result) {});
      }
      expect(getAllWrapper).toThrowError("HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
      done();
    });
  });

  describe(".setOthersState()", function () {
    beforeEach(clearConfigs);

    it("resets the status of all other versions of a config to a given value", function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 2}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 3}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig4 = function (callback) {
        createTestConfig(
          "id2",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config4\n" + err);
            }
            callback(err);
          }
        );
      };

      const testSpecs = function (callback) {
        configLib.setOthersState(
          {
            configId: "id",
            configVersion: "2",
            newStatus: "I",
          },
          function (err, result) {
            if (err) {
              console.error(err);
            }
            expect(result).toEqual(true);

            getConfigs(function (err, result) {
              const configMeta = result.map(onlyMetaData).sort(configSorter);
              const expectedConfigs = [
                {
                  configId: "id",
                  configVersion: "1",
                  configStatus: "I",
                },
                {
                  configId: "id",
                  configVersion: "2",
                  configStatus: "A",
                },
                {
                  configId: "id",
                  configVersion: "3",
                  configStatus: "I",
                },
                {
                  configId: "id2",
                  configVersion: "1",
                  configStatus: "A",
                },
              ];
              expect(configMeta).toEqual(expectedConfigs);
              done();
            });
          }
        );
      };

      async.series(
        [
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          fnCreateTestConfig4,
          testSpecs,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });

    it("throws an error, if there is no config id specified.", function (done) {
      configLib.setOthersState(
        {
          configVersion: "2",
          newStatus: "I",
        },
        function (err, data) {
          expect(err.message).toEqual("HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not modify any entries, if no config id is specified", function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 2}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 3}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig4 = function (callback) {
        createTestConfig(
          "id2",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config4\n" + err);
            }
            callback(err);
          }
        );
      };

      const testSpecs = function (callback) {
        try {
          configLib.setOthersState(
            {
              configVersion: "2",
              newStatus: "I",
            },
            function (err, data) {
              getConfigs(function (err, result) {
                const configMeta = result.map(onlyMetaData).sort(configSorter);
                const expectedConfigs = [
                  {
                    configId: "id",
                    configVersion: "1",
                    configStatus: "A",
                  },
                  {
                    configId: "id",
                    configVersion: "2",
                    configStatus: "A",
                  },
                  {
                    configId: "id",
                    configVersion: "3",
                    configStatus: "I",
                  },
                  {
                    configId: "id2",
                    configVersion: "1",
                    configStatus: "A",
                  },
                ];
                expect(configMeta).toEqual(expectedConfigs);
                done();
              });
            }
          );
        } catch (e) {
          callback(e);
        }
      };

      async.series(
        [
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          fnCreateTestConfig4,
          testSpecs,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });

    it("throws an error, if there is no config version specified.", function (done) {
      configLib.setOthersState(
        {
          configId: "id",
          newStatus: "I",
        },
        function (err, data) {
          expect(err.message).toEqual("HPH_CFG_CONFIG_VERSION_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not modify any entries, if no config version is specified", function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 2}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 3}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig4 = function (callback) {
        createTestConfig(
          "id2",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config4\n" + err);
            }
            callback(err);
          }
        );
      };

      const testSpecs = function (callback) {
        try {
          configLib.setOthersState(
            {
              configId: "id",
              newStatus: "I",
            },
            function (err, data) {
              getConfigs(function (err, result) {
                const configMeta = result.map(onlyMetaData).sort(configSorter);
                const expectedConfigs = [
                  {
                    configId: "id",
                    configVersion: "1",
                    configStatus: "A",
                  },
                  {
                    configId: "id",
                    configVersion: "2",
                    configStatus: "A",
                  },
                  {
                    configId: "id",
                    configVersion: "3",
                    configStatus: "I",
                  },
                  {
                    configId: "id2",
                    configVersion: "1",
                    configStatus: "A",
                  },
                ];
                expect(configMeta).toEqual(expectedConfigs);
                done();
              });
            }
          );
        } catch (e) {}
      };

      async.series(
        [
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          fnCreateTestConfig4,
          testSpecs,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });

    it("throws an error, if there is no config status to be set.", function (done) {
      configLib.setOthersState(
        {
          configId: "id",
          configVersion: "2",
        },
        function (err, data) {
          expect(err.message).toEqual("HPH_CFG_CONFIG_STATUS_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not modify any entries, if there is no config status to be set.", function (done) {
      const fnCreateTestConfig1 = function (callback) {
        createTestConfig(
          "id",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config1\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig2 = function (callback) {
        createTestConfig(
          "id",
          "2",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 2}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config2\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig3 = function (callback) {
        createTestConfig(
          "id",
          "3",
          "I",
          "name",
          "HC/HPH/CDW",
          '{"a": 3}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config3\n" + err);
            }
            callback(err);
          }
        );
      };
      const fnCreateTestConfig4 = function (callback) {
        createTestConfig(
          "id2",
          "1",
          "A",
          "name",
          "HC/HPH/CDW",
          '{"a": 1}',
          null,
          null,
          function (err, data) {
            if (err) {
              console.error("Error in creating test config4\n" + err);
            }
            callback(err);
          }
        );
      };

      const testSpecs = function (callback) {
        try {
          configLib.setOthersState(
            {
              configVersion: "2",
              newStatus: "I",
            },
            function (err, data) {
              const configs = getConfigs(function (err, result) {
                const configMeta = result.map(onlyMetaData).sort(configSorter);
                const expectedConfigs = [
                  {
                    configId: "id",
                    configVersion: "1",
                    configStatus: "A",
                  },
                  {
                    configId: "id",
                    configVersion: "2",
                    configStatus: "A",
                  },
                  {
                    configId: "id",
                    configVersion: "3",
                    configStatus: "I",
                  },
                  {
                    configId: "id2",
                    configVersion: "1",
                    configStatus: "A",
                  },
                ];
                expect(configMeta).toEqual(expectedConfigs);
                done();
              });
            }
          );
        } catch (e) {
          callback(e);
        }
      };

      async.series(
        [
          fnCreateTestConfig1,
          fnCreateTestConfig2,
          fnCreateTestConfig3,
          fnCreateTestConfig4,
          testSpecs,
        ],
        function (err, data) {
          if (err) {
            console.error("Error in preparing test data!\n" + err);
            throw new Error("error preparing test data");
          }
          done();
        }
      );
    });
  });
});
