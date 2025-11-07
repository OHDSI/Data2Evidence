"use strict";

import { Fast } from "../../../src/req_transformation/fast";
import { Settings } from "../../../src/qe/settings/Settings";
import * as fs from "fs";

import {
    testSuiteName,
    testSchemaName,
    pholderTableMap,
    testResult,
    Timer,
    aggquery_setup,
} from "../../testutils/aggquery_common";

let testEnvironment;
let connection;
let patientCreator;
let mockConfig;
let settingsObj;

let requests = [];
let expectedOutput = [];
let IN_ABS_DIR = "./spec/mri/req_transformation/requests/";
let OUT_ABS_DIR = "./spec/mri/req_transformation/expectedoutput/";
let IN_REL_DIR = "./requests/";
let OUT_REL_DIR = "./expectedoutput/";
let testCount = 0;

describe(
    "TEST SUITE FOR IFR TO FAST CONVERSION --",
     () => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
        beforeAll( (done) => {
            aggquery_setup((_connection, _mockConfig, _testEnvironment, _patientCreator) => {
                connection = _connection;
                mockConfig = _mockConfig;
                testEnvironment = _testEnvironment;
                patientCreator = _patientCreator;
                settingsObj = new Settings();

                function map(x) {
                    let y = JSON.stringify(x);
                    Object.keys(pholderTableMap).forEach((key) => {
                        y = y.replace(new RegExp(key, "g"), pholderTableMap[key].replace(new RegExp("\"", "g"), "\\\""));
                    });
                    return JSON.parse(y);
                }

                fs.readdir(IN_ABS_DIR, (err, items) => {
                    items
                        .filter((e) => e.search(".in.ts") > -1)
                        .sort()
                        .forEach((f) => {
                            let src = require(IN_REL_DIR + f);
                            requests.push({ key: f.replace(".in.ts", ""), value: src.input, type: f.split("_")[1] });
                        });
                    fs.readdir(OUT_ABS_DIR, (err, items) => {
                        items
                            .filter((e) => e.search(".out.ts") > -1)
                            .sort()
                            .forEach((f) => {
                                let src = require(OUT_REL_DIR + f);
                                expectedOutput.push({ key: f.replace(".out.ts", ""), value: src.output, type: f.split("_")[1] });

                            });

                        testCount = requests.length;
                        done();
                    });
                });
            });


        });

        describe("Tally requests and expectedOutput", () => {
            it(" number of requests must match expectedOutput", (done) => {
                expect(requests.length).toEqual(expectedOutput.length);
                done();
            });
        });

        describe("FAST()",  () => {
            it(" class variable model should have the same value as expected output - ",  (done) => {

                for (let i = 0; i < testCount; i++) {
                    let f = new Fast(requests[i].type,
                        requests[i].value,
                        mockConfig,
                        pholderTableMap,
                        requests[i].type === "aggquery" ? mockConfig.chartOptions.minCohortSize : null);

                    expect(JSON.stringify(f.statement)).toEqual(JSON.stringify(expectedOutput[i].value));
                }
                done();
            });
        });

    });
