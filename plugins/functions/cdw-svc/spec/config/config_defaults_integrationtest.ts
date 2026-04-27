import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import async = require("async");
import { FFHConfig } from "@alp/alp-config-utils";
import { testsLogger } from "../testutils/logger";
import { deleteAllConfigs } from "../testutils/testutils";
import { QueryObject as qo, User } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import * as testEnvLib from "../testutils/testenv/testenvironment";
import { credentialsMap } from "../testutils/connection";

const FfhConfig = FFHConfig.FFHConfig;
let configLib: FFHConfig.FFHConfig;
let connection;
let client;
let testEnvironment;
const credentials = credentialsMap.postgresql;
const testSchemaName = credentials.schema;

const clearConfigs = (callback) => {
  deleteAllConfigs({
    connection,
    callback: (err, data) => {
      if (err) {
        console.error("Error in preparing test data!\n" + err);
        throw new Error("error preparing test data");
      }
      //log("Prepared test data...");
      callback(null);
    },
  });
};

function getDefaults(callback) {
  const querySql =
    'SELECT "User", "ConfigType", "ConfigId" as "ConfigId", "ConfigVersion" as "ConfigVersion" ' +
    'FROM "ConfigDbModels_UserDefaultConfig"';

  const queryObj = QueryObject.format(querySql);
  queryObj.executeQuery(connection, function (err, result) {
    if (err) {
      throw err;
    }
    const data = [];
    result.data.forEach(function (row) {
      data.push({
        username: row.User,
        configType: row.ConfigType,
        configId: row.ConfigId,
        configVersion: row.ConfigVersion,
      });
    });

    callback(null, data);

    //return data;
  });
}

function setDefault(username, configType, configId, configVersion, callback) {
  const querySql =
    'INSERT INTO "ConfigDbModels_UserDefaultConfig" ("User", "ConfigType", "ConfigId", "ConfigVersion") VALUES(%s, %s, %s, %s)';

  const queryObj = QueryObject.format(
    querySql,
    username,
    configType,
    configId,
    configVersion
  );

  queryObj.executeUpdate(connection, function (err, result) {
    if (err) {
      throw err;
    }
    callback(null, result);
  });
}

describe("The config default services", function () {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
  beforeAll(function (done) {
    // set up test environment
    testsLogger(
      "\n\n-----------------------------Test class: config_defaults_integrationtest.ts -----------------------------\n"
    );
    testsLogger("testSchemaName:" + testSchemaName);

    dbConnectionUtil.DBConnectionUtil.getDbClient(
      credentials,
      function (err, c) {
        if (err) {
          console.error("Network connection error", err);
          throw err;
        }
        client = c;
        if (!client) {
          testsLogger("client undefined");
        }

        const initConnection = function (callback) {
          dbConnectionUtil.DBConnectionUtil.getConnection(
            credentials.dialect,
            client,
            testSchemaName,
            function (err, data) {
              if (err) {
                console.error("Error in seting default schema!");
              }
              connection = data;
              configLib = new FfhConfig(connection, new User(""));
              testsLogger("Set default schema to " + testSchemaName);
              callback(null);
            }
          );
        };

        const initTestEnvironment = function (callback) {
          testEnvironment = new testEnvLib.TestEnvironment(
            credentials.dialect,
            client,
            testSchemaName,
            false,
            true,
            function (err, results) {
              if (err) {
                console.error("Error in initializing TestEnvironment!");
              }

              testsLogger("Initialized TestEnvironment...");
              callback(null);
            }
          );
        };

        async.series(
          [initConnection, initTestEnvironment, clearConfigs],
          function (err, data) {
            if (err) {
              throw err;
            }
            testsLogger("Completed initializing test environment...");

            done();
          }
        );
      }
    );
  });

  afterAll(function (done) {
    testEnvironment.clearSchema(function (err, results) {
      if (err) {
        console.error("Error in truncating tables!");
      }

      testsLogger("Truncated tables...");
      connection.close();
      done();
    });
  });

  describe(".setDefault()", function () {
    afterEach(function (done) {
      testEnvironment.clearSchema(function (err, results) {
        if (err) {
          console.error("Error in truncating tables!");
        }

        //log("\nTruncated tables...");
        done();
      });
    });
    it("sets the users default for a config type", function (done) {
      configLib.setDefault(
        "username",
        "HC/HPH/CDW",
        "2",
        "1",
        function (err, result) {
          getDefaults(function (err, defaults) {
            const expectedDefaults = [
              {
                username: "username",
                configType: "HC/HPH/CDW",
                configId: "2",
                configVersion: "1",
              },
            ];
            expect(defaults).toEqual(expectedDefaults);
            done();
          });
        }
      );
    });

    it("can create a default entry per configType for each user", function (done) {
      configLib.setDefault(
        "username",
        "HC/HPH/CDW",
        "2",
        "1",
        function (err, result) {
          configLib.setDefault(
            "username",
            "HC/MRI/PA",
            "3",
            "A",
            function (err, result) {
              getDefaults(function (err, defaults) {
                const expectedDefaults = [
                  {
                    username: "username",
                    configType: "HC/HPH/CDW",
                    configId: "2",
                    configVersion: "1",
                  },
                  {
                    username: "username",
                    configType: "HC/MRI/PA",
                    configId: "3",
                    configVersion: "A",
                  },
                ];

                expect(defaults).toEqual(expectedDefaults);
                done();
              });
            }
          );
        }
      );
    });

    it("can create a default entry per user for each configType", function (done) {
      configLib.setDefault(
        "username",
        "HC/HPH/CDW",
        "2",
        "1",
        function (err, result) {
          configLib.setDefault(
            "username2",
            "HC/HPH/CDW",
            "3",
            "2",
            function (err, result) {
              getDefaults(function (err, defaults) {
                const expectedDefaults = [
                  {
                    username: "username",
                    configType: "HC/HPH/CDW",
                    configId: "2",
                    configVersion: "1",
                  },
                  {
                    username: "username2",
                    configType: "HC/HPH/CDW",
                    configId: "3",
                    configVersion: "2",
                  },
                ];

                expect(defaults).toEqual(expectedDefaults);
                done();
              });
            }
          );
        }
      );
    });

    it("throws an error, if the username is not given", function (done) {
      configLib.setDefault(
        undefined,
        "HC/HPH/CDW",
        "2",
        "1",
        function (err, result) {
          expect(err.message).toEqual("HPH_CFG_USERNAME_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not create any entries, if the username is not given", function (done) {
      configLib.setDefault(
        undefined,
        "HC/HPH/CDW",
        "2",
        "1",
        function (err, result) {
          getDefaults(function (err, defaults) {
            const expectedDefaults = [];
            expect(defaults).toEqual(expectedDefaults);
            done();
          });
        }
      );
    });

    it("throws an error, if the configType is not given", function (done) {
      configLib.setDefault(
        "username",
        undefined,
        "2",
        "1",
        function (err, result) {
          expect(err.message).toEqual("HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not create any entries, if the configType is not given", function (done) {
      configLib.setDefault(
        "username",
        undefined,
        "2",
        "1",
        function (err, result) {
          getDefaults(function (err, defaults) {
            const expectedDefaults = [];
            expect(defaults).toEqual(expectedDefaults);
            done();
          });
        }
      );
    });

    it("throws an error, if the configId is not given", function (done) {
      configLib.setDefault(
        "username",
        "HC/HPH/CDW",
        undefined,
        "1",
        function (err, result) {
          expect(err.message).toEqual("HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not create any entries, if the configId is not given", function (done) {
      configLib.setDefault(
        "username",
        "HC/HPH/CDW",
        undefined,
        "1",
        (err, result) => {
          getDefaults(function (err, defaults) {
            const expectedDefaults = [];
            expect(defaults).toEqual(expectedDefaults);
            done();
          });
        }
      );
    });

    it("throws an error, if the configVersion is not given", function (done) {
      configLib.setDefault(
        "username",
        "HC/HPH/CDW",
        "2",
        undefined,
        function (err, result) {
          expect(err.message).toEqual("HPH_CFG_CONFIG_VERSION_NOT_SPECIFIED");
          done();
        }
      );
    });

    it("does not create any entries, if the configVersion is not given", function (done) {
      configLib.setDefault(
        "username",
        "HC/HPH/CDW",
        "2",
        undefined,
        function (err, result) {
          getDefaults(function (err, defaults) {
            const expectedDefaults = [];
            expect(defaults).toEqual(expectedDefaults);
            done();
          });
        }
      );
    });

    // ToDo:
    // it("throws an error, if the user does not exist",
    //   function (){
    //     expect('to be implemented').toEqual('implemented');
    //   }
    // );
    // it("throws an error, if the config does not exist",
    //   function (){
    //     expect('to be implemented').toEqual('implemented');
    //   }
    // );
    // it("throws an error, if the user is not allowed to use the config",
    //   function (){
    //     expect('to be implemented').toEqual('implemented');
    //   }
    // );
  });

  describe(".getDefault()", function () {
    afterEach(function (done) {
      testEnvironment.clearSchema(function (err, results) {
        if (err) {
          console.error("Error in truncating tables!");
        }

        //log("\nTruncated tables...");
        done();
      });
    });

    it("gets the default config of a given type for a given user", function (done) {
      setDefault("user", "HC/HPH/CDW", "id1", "1", function (err, result) {
        setDefault("user", "HC/MRI/PA", "id2", "A", function (err, result) {
          configLib.getDefault("user", "HC/HPH/CDW", function (err, result) {
            const expectedResult = {
              configId: "id1",
              configVersion: "1",
            };
            expect(result).toEqual(expectedResult);
            done();
          });
        });
      });
    });

    it("returns false, if there is no defaut config of the given type for the given user", function (done) {
      setDefault("user", "HC/MRI/PA", "id2", "A", function (err, result) {
        configLib.getDefault("user", "HC/HPH/CDW", function (err, result) {
          const expectedResult = false;
          expect(result).toEqual(expectedResult);
          done();
        });
      });
    });

    it("throws an error, if the username is not given", function (done) {
      configLib.getDefault(undefined, "HC/HPH/CDW", function (err, result) {
        expect(err.message).toEqual("HPH_CFG_USERNAME_NOT_SPECIFIED");
        done();
      });
    });

    it("throws an error, if the configType is not given", function (done) {
      configLib.getDefault("user", undefined, function (err, result) {
        expect(err.message).toEqual("HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
        done();
      });
    });
  });

  describe(".clearDefault()", function () {
    afterEach(function (done) {
      testEnvironment.clearSchema(function (err, results) {
        if (err) {
          console.error("Error in truncating tables!");
        }

        //log("\nTruncated tables...");
        done();
      });
    });

    it("removes the default config of a given type for a given user", function (done) {
      setDefault("user", "HC/HPH/CDW", "id1", "1", function (err, result) {
        setDefault("user", "HC/MRI/PA", "id2", "A", function (err, result) {
          configLib.clearDefault("user", "HC/HPH/CDW", function (err, result) {
            getDefaults(function (err, result) {
              const expectedResult = [
                {
                  username: "user",
                  configType: "HC/MRI/PA",
                  configId: "id2",
                  configVersion: "A",
                },
              ];
              expect(result).toEqual(expectedResult);
              done();
            });
          });
        });
      });
    });

    it("returns false, if there is no defaut config of the given type for the given user", function (done) {
      setDefault("user", "HC/MRI/PA", "id2", "A", function (err, result) {
        configLib.clearDefault("user", "HC/HPH/CDW", function (err, result) {
          const expectedResult = false;
          expect(result).toEqual(expectedResult);
          done();
        });
      });
    });

    it("throws an error, if the username is not given", function (done) {
      configLib.clearDefault(undefined, "HC/HPH/CDW", function (err, result) {
        expect(err.message).toEqual("HPH_CFG_USERNAME_NOT_SPECIFIED");
        done();
      });
    });

    it("throws an error, if the configType is not given", function (done) {
      configLib.clearDefault("user", undefined, function (err, result) {
        expect(err.message).toEqual("HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
        done();
      });
    });
  });
});
