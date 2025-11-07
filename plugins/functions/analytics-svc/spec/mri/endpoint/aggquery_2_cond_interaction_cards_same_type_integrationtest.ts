import {
    createPathInObject as createPath,
    createGuid as createId,
  } from "@alp/alp-base-utils";
  import { cloneJson } from "@alp/alp-base-utils";
  import { request2Bookmark } from "../../testutils/Request2Bookmark";
  import * as async from "async";
  import * as aggQuery from "../../../src/mri/endpoint/analytics";
  import { Settings } from "../../../src/qe/settings/Settings";
  import { testsLogger } from "../../testutils/logger";
  import fs = require("fs");
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
  let settingsObj;
  const mockReq = {
    headers: {
      authorization: "Bearer dummy jwt",
      "x-alp-usersessionclaims": "test",
      "x-source-origin": "test",
    },
  };
  
  describe(testSuiteName, () => {
    beforeAll((done) => {
      aggquery_setup((_connection, _testEnvironment, _patientCreator) => {
        connection = _connection;
        testEnvironment = _testEnvironment;
        patientCreator = _patientCreator;
        settingsObj = new Settings();
        done();
      });
    });
  
    describe("two condition-interaction cards of the same type", () => {
      beforeAll((done) => {
        testsLogger("beforeAll...");
        const patient1 = {};
        createPath(
          patient1,
          "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
          "COPP"
        );
        createPath(
          patient1,
          "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
          "FOLFOX"
        );
  
        const patient2 = {};
        createPath(
          patient2,
          "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
          "COPP"
        );
        createPath(
          patient2,
          "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
          "COPP"
        );
  
        const patient3 = {};
        createPath(
          patient3,
          "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
          "COPP"
        );
        createPath(
          patient3,
          "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
          "FOLFOX"
        );
        createPath(
          patient3,
          "patient.conditions.acme.interactions.chemo.3.attributes.chemo_prot",
          "ICE"
        );
  
        const patient4 = {};
        createPath(
          patient4,
          "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
          "COPP"
        );
        createPath(
          patient4,
          "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
          "C34"
        );
  
        const patient5 = {};
        createPath(patient5, "patient.attributes.dateOfBirth", "01.01.1900");
  
        const clearSchema = (callback) => {
          testEnvironment.clearSchema((err, results) => {
            if (err) {
              console.error("Error in clearing schema tables!");
            }
            testsLogger("Cleared tables...");
            callback(null);
          });
        };
  
        const addPatient1 = (callback) => {
          patientCreator.addPatient(patient1, null, (err, data) => {
            if (err) {
              throw err;
            }
            // testsLogger("Added Patient1...");
            callback(null);
          });
        };
  
        const addPatient2 = (callback) => {
          patientCreator.addPatient(patient2, null, (err, data) => {
            if (err) {
              throw err;
            }
            // testsLogger("Added Patient2...");
            callback(null);
          });
        };
        const addPatient3 = (callback) => {
          patientCreator.addPatient(patient3, null, (err, data) => {
            if (err) {
              throw err;
            }
            // testsLogger("Added Patient3...");
            callback(null);
          });
        };
  
        const addPatient4 = (callback) => {
          patientCreator.addPatient(patient4, null, (err, data) => {
            if (err) {
              throw err;
            }
            // testsLogger("Added Patient4...");
            callback(null);
          });
        };
        const addPatient5 = (callback) => {
          patientCreator.addPatient(patient5, null, (err, data) => {
            if (err) {
              throw err;
            }
            // testsLogger("Added Patient5...");
            callback(null);
          });
        };
  
        async.series(
          [
            clearSchema,
            addPatient1,
            addPatient2,
            addPatient3,
            addPatient4,
            addPatient5,
          ],
          (err, data) => {
            if (err) {
              throw err;
            }
            testsLogger("Completed adding patients ...");
            done();
          }
        );
      });
  
      afterAll((done) => {
        testEnvironment.clearSchema((err, results) => {
          if (err) {
            console.error("Error in clearing schema tables!");
          }
          testsLogger("Cleared tables...");
          connection.close();
          done();
        });
      });
  
      it("the order should not have any influence (1)", (done) => {
        const request1 = {};
        createPath(request1, "patient.attributes.pcount", [
          {
            yaxis: 1,
          },
        ]);
        createPath(
          request1,
          "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
          [
            {
              xaxis: 1,
            },
          ]
        );
        createPath(
          request1,
          "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
          [
            {
              filter: [
                {
                  op: "=",
                  value: "COPP",
                },
              ],
            },
          ]
        );
  
        const expectedProtocolls = ["COPP", "FOLFOX", "ICE"];
        const expectedPcounts = [1, 2, 1];
        const expectedTotalPCount = 3;
        const t = new Timer();
        aggQuery.processRequest(
          "aggquery",
          mockReq,
          "mock_config", // configId
          "0", // configVersion
          "datasetId_1", // datasetId
          request2Bookmark(request1),
          "en",
          null, //config only required for domain_values_service & freetext_search_service
          connection,
          (err, res1) => {
            t.stop();
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            testsLogger("the order should not have any influence (1) --- done");
            expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
            testResult(
              res1,
              {
                "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot":
                  expectedProtocolls,
                "patient.attributes.pcount": expectedPcounts,
              },
              null
            );
            done();
          }
        );
      });
  
      it("the order should not have any influence (2)", (done) => {
        const request2 = {};
        createPath(request2, "patient.attributes.pcount", [
          {
            yaxis: 1,
          },
        ]);
        createPath(
          request2,
          "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
          [
            {
              filter: [
                {
                  op: "=",
                  value: "COPP",
                },
              ],
            },
          ]
        );
        createPath(
          request2,
          "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
          [
            {
              xaxis: 1,
            },
          ]
        );
  
        const expectedProtocolls = ["COPP", "FOLFOX", "ICE"];
        const expectedPcounts = [1, 2, 1];
        const expectedTotalPCount = 3;
        const t = new Timer();
        aggQuery.processRequest(
          "aggquery",
          mockReq,
          "mock_config", // configId
          "0", // configVersion
          "datasetId_1", // datasetId
          request2Bookmark(request2),
          "en",
          null, //config only required for domain_values_service & freetext_search_service
          connection,
          (err, res2) => {
            t.stop();
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(res2.totalPatientCount).toEqual(expectedTotalPCount);
            testResult(
              res2,
              {
                "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot":
                  expectedProtocolls,
                "patient.attributes.pcount": expectedPcounts,
              },
              null
            );
            done();
          }
        );
      });
    });
  });
