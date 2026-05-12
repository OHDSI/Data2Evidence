import async = require("async");
import { Settings } from "../../src/qe/settings/Settings";
import { TestEnvironment } from "../testutils/testenvironment";
import { nodeHDBConnection } from "../../src/utils/ConnectionInterface";
import { testsLogger } from "../testutils/logger";
import { QueryObject } from "../../src/utils/QueryObject";
import { FFHConfig } from "../../src/mri/config/utils/FFHConfig";
let configLib: FFHConfig;
let Connection = nodeHDBConnection.NodeHDBConnection;
let connection;
let client;
let testEnvironment;
let testSchemaName = process.env.TESTSCHEMA;
const settings = new Settings("SYSTEM");

function truncateTables(callback) {
    testEnvironment.clearSchema((err, results) => {
        if (err) {
            console.error("Error in truncating tables!");
            throw err;
        }

        callback(null);
    });
}

function truncateConfigTable(callback) {
    testEnvironment.clearTables(["ConfigDbModels_Config",
                                 "ConfigDbModels_UserDefaultConfig",
                                 "ConfigDbModels_AssignmentHeader",
                                 "ConfigDbModels_AssignmentDetail"],
                                 (err, results) => {
        if (err) {
            console.error("Error in truncating tables!");
            throw err;
        } else {
            callback(null);
        }
    });
}

function createTestConfig(id, version, status, name, type, data, dependentConfigId, dependentConfigVersion, callback) {
    name = name || "";
    let querySql = "INSERT INTO \"" + testSchemaName + "\".\"ConfigDbModels_Config\" " +
        "(\"Id\",\"Version\",\"Status\",\"Name\",\"Type\",\"Data\",\"Creator\",\"Modifier\", \"ParentId\", \"ParentVersion\",\"Created\",\"Modified\")" +
        "VALUES (%s,%s,%s,%s,%s,TO_NCLOB(%s),%s,%s,%s,%s,CURRENT_UTCTIMESTAMP,CURRENT_UTCTIMESTAMP)";

    let params = [];
    params.push(id);
    params.push(version);
    params.push(status);
    params.push(name);
    params.push(type);
    params.push(data);
    params.push("SYSTEM");
    params.push("SYSTEM");

    if (dependentConfigId) {
        params.push(dependentConfigId);
        params.push(dependentConfigVersion);
    } else {
        params.push(null);
        params.push(null);
        querySql = querySql.replace("(%s,%s,%s,%s,%s,TO_NCLOB(%s),%s,%s,%s,%s,CURRENT_UTCTIMESTAMP,CURRENT_UTCTIMESTAMP)"
            , "(%s,%s,%s,%s,%s,TO_NCLOB(%s),%s,%s,%UNSAFE,%UNSAFE,CURRENT_UTCTIMESTAMP,CURRENT_UTCTIMESTAMP)");
    }

    params.unshift(querySql); //insert query at the beginning

    let queryObj = QueryObject.format.apply(this, params);
    queryObj.executeUpdate(connection, (err, result) => {
        if (err) {
            callback(err);
        } else {
            callback(null);
        }
    });
}

function getConfigs(callback) {
    let querySql = "SELECT \"Id\",\"Version\",\"Status\",\"Name\",\"Type\", \"ParentId\" as \"ParentID\","
        + "\"ParentVersion\" as \"ParentVersion\",\"Creator\",\"Created\",\"Modifier\",\"Modified\",\"Data\" "
        + "FROM \"" + testSchemaName + "\".\"ConfigDbModels_Config\"";

    let queryObj = QueryObject.format(querySql);
    queryObj.executeQuery(connection, (err, result) => {

        if (err) {
            throw err;
        }
        let data = [];
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

let configToSaveTemplate = {
    config: {
        a: 1,
    },
    configType: "HC/HPH/CDW",
    configId: "id",
    configVersion: "1",
    configStatus: "A",
    configName: "test config",
};

let expectedSaveConfigTemplate = {
    config: {
        a: 1,
    },
    configType: "HC/HPH/CDW",
    configId: "id",
    configVersion: "1",
    configStatus: "A",
    configName: "test config",
    creator: "SYSTEM",
    modifier: "SYSTEM",
    dependentConfigId: "NoValue",
    dependentConfigVersion: "NoValue",
};
let expectedGetConfigTemplate = {
    config: {
        a: 1,
    },
    meta: {
        configId: "id",
        configVersion: "1",
        configStatus: "A",
        configName: "name",
        dependentConfig: {
            configId: "NoValue",
            configVersion: "NoValue",
        },
        creator: "SYSTEM",
        modifier: "SYSTEM",
    },
};

let mriConfigToSaveTemplate = {
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

describe("The config services", () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
    beforeAll((done) => {
        // set up test environment
        testsLogger("\n\n-----------------------------Test class: config_integrationtest.ts -----------------------------\n");
        testsLogger("testSchemaName:" + testSchemaName);

        client = require("hdb").createClient({
            host: process.env.HANASERVER,
            port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
            user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
            password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : "Toor1234",
        });
        client.on("error", (err) => {
            console.error("Network connection error", err);
        });

        client.connect((err) => {
            if (err) {
                throw err;
            }

            if (!client) {
                testsLogger("client undefined");
            }
            let initConnection = (callback) => {
                Connection.createConnection(client, testSchemaName, (err, data) => {
                    if (err) {
                        console.error("Error in seting default schema!");
                    }
                    connection = data;
                    configLib = new FFHConfig(connection, settings);
                    testsLogger("Set default schema to " + testSchemaName);
                    callback(null);
                });
            };

            let initTestEnvironment = (callback) => {
                testEnvironment = new TestEnvironment(client, testSchemaName, false, true, (err, results) => {
                    if (err) {
                        console.error("Error in initializing TestEnvironment!");
                    }
                    testsLogger("Initialized TestEnvironment...");
                    callback(null);
                });
            };

            async.series(
                [
                    initConnection,
                    initTestEnvironment,
                ], (err, data) => {
                    if (err) {
                        throw err;
                    }
                    testsLogger("Completed initializing test environment...");
                    done();
                });
        });
    });

    afterAll((done) => {
        testEnvironment.clearSchema((err, results) => {
            if (err) {
                console.error("Error in truncating tables!");
            }
            testsLogger("Truncated tables...");
            done();
        });
    });

    describe(".saveConfig()", () => {
        beforeEach((done) => {
            async.series(
                [
                    truncateConfigTable,
                ], (err, data) => {
                    if (err) {
                        console.error("Error in preparing test data!\n" + err);
                        throw err;
                    }
                    testsLogger("Truncation compeleted");
                    done();
                });
        });

        it("saves a config to \"ConfigDbModels_Config\"", (done) => {
            configLib.saveConfig(configToSaveTemplate, (err, saveResult) => {
                expect(saveResult.saved).toEqual(true);

                getConfigs((err, result) => {
                    expect(result.length).toEqual(1);
                    delete result[0].created;
                    delete result[0].modified;

                    let expectedResult = [expectedSaveConfigTemplate];
                    expect(result).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("generates an id, if none is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.configId;
            configLib.saveConfig(configToSave, (err, saveResult) => {
                let id = saveResult.meta.configId;
                expect(saveResult.saved).toEqual(true);

                getConfigs((err, result) => {
                    expect(result.length).toEqual(1);
                    delete result[0].created;
                    delete result[0].modified;

                    if (result[0].dependentConfigId === "NULL") {
                        result[0].dependentConfigId = null;
                    }
                    if (result[0].dependentConfigVersion === "NULL") {
                        result[0].dependentConfigVersion = null;
                    }
                    let expectedConfig = JSON.parse(JSON.stringify(expectedSaveConfigTemplate));
                    expectedConfig.configId = id;
                    let expectedResult = [expectedConfig];
                    expect(result).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("version will be blank, if none is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.configVersion;
            configLib.saveConfig(configToSave, (err, saveResult) => {
                expect(saveResult.saved).toEqual(true);

                getConfigs((err, result) => {
                    expect(result.length).toEqual(1);
                    delete result[0].created;
                    delete result[0].modified;
                    if (result[0].dependentConfigId === "NULL") {
                        result[0].dependentConfigId = null;
                    }
                    if (result[0].dependentConfigVersion === "NULL") {
                        result[0].dependentConfigVersion = null;
                    }
                    let expectedConfig = JSON.parse(JSON.stringify(expectedSaveConfigTemplate));
                    expectedConfig.configVersion = "";
                    let expectedResult = [expectedConfig];
                    expect(result).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("name will be blank (NoValue), if none is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.configName;
            configLib.saveConfig(configToSave, (err, saveResult) => {
                expect(saveResult.saved).toEqual(true);
                getConfigs((err, result) => {
                    expect(result.length).toEqual(1);
                    delete result[0].created;
                    delete result[0].modified;

                    let expectedConfig = JSON.parse(JSON.stringify(expectedSaveConfigTemplate));
                    expectedConfig.configName = "";
                    let expectedResult = [expectedConfig];
                    expect(result).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("dependentConfig will be Novalue, if none is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.dependentConfigId;
            delete configToSave.dependentConfigVersion;
            configLib.saveConfig(configToSave, (err, saveResult) => {
                expect(saveResult.saved).toEqual(true);

                getConfigs((err, result) => {
                    expect(result.length).toEqual(1);
                    delete result[0].created;
                    delete result[0].modified;
                    if (result[0].dependentConfigId === "NULL") {
                        result[0].dependentConfigId = null;
                    }
                    if (result[0].dependentConfigVersion === "NULL") {
                        result[0].dependentConfigVersion = null;
                    }

                    let expectedConfig = JSON.parse(JSON.stringify(expectedSaveConfigTemplate));
                    let expectedResult = [expectedConfig];
                    expect(result).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("saving with the dependentConfig ", (done) => {
            let configToSave = JSON.parse(JSON.stringify(mriConfigToSaveTemplate));
            configLib.saveConfig(configToSave, (err, saveResult) => {
                expect(saveResult.saved).toEqual(true);
                expect(saveResult.meta.dependentConfig.configId).toEqual(mriConfigToSaveTemplate.dependentConfig.configId);
                expect(saveResult.meta.dependentConfig.configVersion).toEqual(mriConfigToSaveTemplate.dependentConfig.configVersion);
                done();
            });
        });

        it("throws an error, if no config type is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.configType;

            function saveConfigWrapper() {
                configLib.saveConfig(configToSave, (err, result) => { });
            }
            expect(saveConfigWrapper).toThrowError("HPH_CFG_CONFIG_TYPE_NOT_SPECIFIED");
            done();
        });

        it("does not create any entries, if no config type is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.configType;
            try {
                configLib.saveConfig(configToSave, (err, result) => {

                });
            } catch (e) { } // eslint-disable-line no-empty

            getConfigs((err, result) => {
                expect(result.length).toEqual(0);
                done();
            });
        });

        it("throws an error, if no config is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.config;

            function saveConfigWrapper() {
                configLib.saveConfig(configToSave, (err, result) => { });
            }
            expect(saveConfigWrapper).toThrowError("HPH_CFG_CONFIG_NOT_SPECIFIED");
            done();
        });

        it("does not create any entries, if no config is specified", (done) => {
            let configToSave = JSON.parse(JSON.stringify(configToSaveTemplate));
            delete configToSave.config;

            try {
                configLib.saveConfig(configToSave, (err, result) => {

                });

            } catch (e) { } // eslint-disable-line no-empty
            getConfigs((err, result) => {
                expect(result.length).toEqual(0);
                done();
            });
        });
    });

    describe(".getConfig()", () => {
        beforeEach((done) => {
            let fnCreateTestConfig1 = (callback) => {
                createTestConfig("id", "1", "A", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config1\n" + err);
                        throw err;
                    }
                    callback(null);
                });
            };
            let fnCreateTestConfig2 = (callback) => {
                createTestConfig("id", "2", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config2\n" + err);
                        throw err;
                    }
                    callback(null);
                });
            };
            let fnCreateTestConfig3 = (callback) => {
                createTestConfig("id", "3", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config3\n" + err);
                        throw err;
                    }
                    callback(null);
                });
            };
            let fnCreateTestConfig4 = (callback) => {
                createTestConfig("id2", "3", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config4\n" + err);
                        throw err;
                    }
                    callback(null);
                });
            };
            let fnCreateTestConfig5 = (callback) => {
                createTestConfig("pa_id1", "A", null, "test_pa_config", "HC/MRI/PA", `{"a": 1}`, "id2", "3", (err, data) => {
                    if (err) {
                        console.error("Error in creating test config5\n" + err);
                        throw err;
                    }
                    callback(null);
                });
            };
            async.series(
                [
                    truncateConfigTable,
                    fnCreateTestConfig1,
                    fnCreateTestConfig2,
                    fnCreateTestConfig3,
                    fnCreateTestConfig4,
                    fnCreateTestConfig5,

                ], (err, data) => {
                    if (err) {
                        console.error("Error in preparing test data!\n" + err);
                        throw err;
                    }
                    done();
                });
        });
        it("queries a config by id, version and status", async () => {
            try {
                testsLogger("queries a config by id, version and status...");
                let result: any = configLib.getConfig({
                    configId: "id",
                    configVersion: "1",
                    configStatus: "A",
                });
                delete result.meta.created;
                delete result.meta.modified;
                let expectedGetConfig = JSON.parse(JSON.stringify(expectedGetConfigTemplate));
                expect(result).toEqual(expectedGetConfig);
            } catch (err) {

            }
        });

        it("queries a config by id, version", async () => {
            try {
                let result: any = configLib.getConfig({
                    configId: "id",
                    configVersion: "2",
                });
                delete result.meta.created;
                delete result.meta.modified;

                let expectedGetConfig = JSON.parse(JSON.stringify(expectedGetConfigTemplate));
                expectedGetConfig.meta.configVersion = "2";
                expectedGetConfig.meta.configStatus = "I";
                expect(result).toEqual(expectedGetConfig);
            } catch (err) {

            }
        });

        it("queries a config by id, status", async () => {
            try {
                let result: any = configLib.getConfig({
                    configId: "id",
                    configStatus: "A",
                });
                delete result.meta.created;
                delete result.meta.modified;

                let expectedGetConfig = JSON.parse(JSON.stringify(expectedGetConfigTemplate));
                expect(result).toEqual(expectedGetConfig);
            } catch (err) {

            }
        });

        it("queries a config by id", async () => {
            try {
                let result: any = configLib.getConfig({
                    configId: "id2",
                });
                delete result.meta.created;
                delete result.meta.modified;

                let expectedGetConfig = JSON.parse(JSON.stringify(expectedGetConfigTemplate));
                expectedGetConfig.meta.configId = "id2";
                expectedGetConfig.meta.configVersion = "3";
                expectedGetConfig.meta.configStatus = "I";
                expect(result).toEqual(expectedGetConfig);
            } catch (err) {

            }
        });

        it("retrieve a config stored with dependent config by id", async () => {
            try {
                let result: any = configLib.getConfig({
                    configId: "pa_id1",
                });
                expect(result.meta.dependentConfig.configId).not.toBeNull();
                expect(result.meta.dependentConfig.configVersion).not.toBeNull();
                expect(result.meta.dependentConfig.configId).toEqual("id2");
                expect(result.meta.dependentConfig.configVersion).toEqual("3");
                expect(result.meta.configId).toEqual("pa_id1");
                expect(result.meta.configVersion).toEqual("A");
            } catch (err) {

            }
        });

        it("throws an error, if multiple configs match the query", async () => {
            try {
                let result: any = configLib.getConfig({
                    configId: "id",
                    configStatus: "I",
                });
                result.catch((err) => {
                    expect(err.message).toEqual("HPH_CFG_CONFIG_FOUND_MULTIPLE_MATCHES");
                });
            } catch (err) {
            }
        });

        it("throws an error, if no config id is specified", async () => {
            try {
                let result: any = configLib.getConfig({
                    configVersion: "2",
                    configStatus: "I",
                });
                result.catch((err) => {
                    expect(err.message).toEqual("HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
                });
            } catch (err) {
            }
        });

        xit("returns an empty config object, if no configs match the query", async () => {
            try {
                let result: any = configLib.getConfig({
                    configId: "id3",
                    configStatus: "I",
                });
                expect(result).toEqual({
                    config: {},
                    meta: {},
                });
            } catch (err) {

            }
        });
    });

    xdescribe(".checkDependingConfig() - No specs defined now, hence skipping this.", () => {
        beforeEach((done) => {
            let fnCreateTestConfig1 = (callback) => {
                createTestConfig("id", "1", "A", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config1\n" + err);
                        throw err;
                    }
                    //log("Created test config1...");
                    callback(null);
                });
            };
            let fnCreateTestConfig2 = (callback) => {
                createTestConfig("id", "2", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config2\n" + err);
                        throw err;
                    }
                    //log("Created test config2...");
                    callback(null);
                });
            };
            let fnCreateTestConfig3 = (callback) => {
                createTestConfig("id", "3", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config3\n" + err);
                        throw err;
                    }
                    //log("Created test config3...");
                    callback(null);
                });
            };
            let fnCreateTestConfig4 = (callback) => {
                createTestConfig("id2", "3", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config4\n" + err);
                        throw err;
                    }
                    //log("Created test config4...");
                    callback(null);
                });
            };
            let fnCreateTestConfig5 = (callback) => {
                createTestConfig("pa_id1", "A", null, "test_pa_config", "HC/MRI/PA", `{"a": 1}`, "id2", "3", (err, data) => {
                    if (err) {
                        console.error("Error in creating test config5\n" + err);
                        throw err;
                    }
                    callback(null);
                });
            };
            async.series(
                [
                    truncateConfigTable,
                    fnCreateTestConfig1,
                    fnCreateTestConfig2,
                    fnCreateTestConfig3,
                    fnCreateTestConfig4,
                    fnCreateTestConfig5,

                ], (err, data) => {
                    if (err) {
                        console.error("Error in preparing test data!\n" + err);
                        throw err;
                    }
                    done();
                });
        });

    });

    describe(".deleteConfig()", () => {
        beforeEach((done) => {
            let fnCreateTestConfig1 = (callback) => {
                createTestConfig("id", "1", "A", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config1\n" + err);
                        throw err;
                    }
                    //log("Created test config1...");
                    callback(null);
                });
            };
            let fnCreateTestConfig2 = (callback) => {
                createTestConfig("id", "2", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config2\n" + err);
                        throw err;
                    }
                    //log("Created test config2...");
                    callback(null);
                });
            };
            let fnCreateTestConfig3 = (callback) => {
                createTestConfig("id", "3", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config3\n" + err);
                        throw err;
                    }
                    //log("Created test config3...");
                    callback(null);
                });
            };
            let fnCreateTestConfig4 = (callback) => {
                createTestConfig("id2", "3", "I", "name", "HC/HPH/CDW", `{"a": 1}`, null, null, (err, data) => {
                    if (err) {
                        console.error("Error in creating test config4\n" + err);
                        throw err;
                    }
                    //log("Created test config4...");
                    callback(null);
                });
            };
            let fnCreateTestConfig5 = (callback) => {
                createTestConfig("id3", "A", "", "name", "HC/MRI/PA", `{"a": 1}`, "id2", "3", (err, data) => {
                    if (err) {
                        console.error("Error in creating test config5\n" + err);
                        throw err;
                    }
                    //log("Created test config5...");
                    callback(null);
                });
            };
            async.series(
                [
                    truncateConfigTable,
                    fnCreateTestConfig1,
                    fnCreateTestConfig2,
                    fnCreateTestConfig3,
                    fnCreateTestConfig4,
                    fnCreateTestConfig5,
                ], (err, data) => {
                    if (err) {
                        console.error("Error in preparing test data!\n" + err);
                        throw err;
                    }
                    done();
                });
        });

        it("deletes a config by id, version and status", (done) => {
            configLib.deleteConfig({
                configId: "id",
                configVersion: "2",
                configStatus: "I",
            }, (err, result) => {
                getConfigs((err, result) => {

                    let configs = result.map(onlyMetaData);
                    let expectedResult = [
                        {
                            configId: "id",
                            configVersion: "1",
                            configStatus: "A",
                        }, {
                            configId: "id",
                            configVersion: "3",
                            configStatus: "I",
                        }, {
                            configId: "id2",
                            configVersion: "3",
                            configStatus: "I",
                        }, {
                            configId: "id3",
                            configVersion: "A",
                            configStatus: "",
                        },
                    ];
                    expect(configs).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("deletes a config by id and version", (done) => {
            configLib.deleteConfig({
                configId: "id",
                configVersion: "2",
            }, (err, result) => {
                getConfigs((err, result) => {
                    let configs = result.map(onlyMetaData);
                    let expectedResult = [
                        {
                            configId: "id",
                            configVersion: "1",
                            configStatus: "A",
                        }, {
                            configId: "id",
                            configVersion: "3",
                            configStatus: "I",
                        }, {
                            configId: "id2",
                            configVersion: "3",
                            configStatus: "I",
                        }, {
                            configId: "id3",
                            configVersion: "A",
                            configStatus: "",
                        },
                    ];
                    expect(configs).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("deletes all version of a given status of a config by id", (done) => {
            configLib.deleteConfig({
                configId: "id",
                configStatus: "I",
            }, (err, result) => {
                getConfigs((err, result) => {
                    let configs = result.map(onlyMetaData);
                    let expectedResult = [
                        {
                            configId: "id",
                            configVersion: "1",
                            configStatus: "A",
                        }, {
                            configId: "id2",
                            configVersion: "3",
                            configStatus: "I",
                        }, {
                            configId: "id3",
                            configVersion: "A",
                            configStatus: "",
                        },
                    ];
                    expect(configs).toEqual(expectedResult);
                    done();
                });
            });
        });

        it("deletes all versions of a config by id", (done) => {
            configLib.deleteConfig({
                configId: "id",
            }, (err, result) => {
                getConfigs((err, result) => {
                    let configs = result.map(onlyMetaData);
                    let expectedResult = [
                        {
                            configId: "id2",
                            configVersion: "3",
                            configStatus: "I",
                        }, {
                            configId: "id3",
                            configVersion: "A",
                            configStatus: "",
                        },
                    ];
                    expect(configs).toEqual(expectedResult);
                    done();
                });
            });
        });

        // it("deletes config with dependent config by id",  (done) {
        //     configLib.getConfig({
        //         configId: "id3"
        //     },  (err, result) {
        //         expect(result.meta).not.toBeNull();

        //         configLib.deleteConfig({
        //             configId: "id3"
        //         },  (err, result) {

        //             configLib.getConfig({
        //                 configId: "id3"
        //             },  (err, result) {
        //                 let emptyObj = {};
        //                 expect(result.meta).toEqual(emptyObj);
        //                 expect(result.config).toEqual(emptyObj);
        //                 done();
        //             });
        //         });
        //     });
        // });

        it("throws an error, when no config id is provided", (done) => {
            let deleteConfigWrapper = () => {
                configLib.deleteConfig({
                    configVersion: "2",
                    configStatus: "I",
                }, (err, result) => { });
            };
            expect(deleteConfigWrapper).toThrowError("HPH_CFG_CONFIG_ID_NOT_SPECIFIED");
            done();
        });

        it("does not delete any entries, when no config id is provided", (done) => {
            try {
                configLib.deleteConfig({
                    configVersion: "2",
                    configStatus: "I",
                }, (err, result) => { });
            } catch (e) {
                getConfigs((err, result) => {
                    let configs = result.map(onlyMetaData);
                    expect(configs.length).toEqual(5);
                    done();
                });
            } // eslint-disable-line no-empty
        });

        it("deletes all configs depending on the deleted ones", (done) => {
            configLib.deleteConfig({
                configId: "id2",
                configVersion: "3",
                configStatus: "I",
            }, (err, result) => {
                getConfigs((err, result) => {
                    let configs = result.map(onlyMetaData);
                    let expectedResult = [
                        {
                            configId: "id",
                            configVersion: "1",
                            configStatus: "A",
                        }, {
                            configId: "id",
                            configVersion: "2",
                            configStatus: "I",
                        }, {
                            configId: "id",
                            configVersion: "3",
                            configStatus: "I",
                        },
                    ];
                    expect(configs).toEqual(expectedResult);
                    done();
                });
            });
        });
    });
});
