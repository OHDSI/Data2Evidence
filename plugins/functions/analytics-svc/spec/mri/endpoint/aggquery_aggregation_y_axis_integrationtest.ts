import {
  createPathInObject as createPath,
  createGuid as createId,
} from "@alp/alp-base-utils";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { testsLogger } from "../../testutils/logger";
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

  describe("Aggregation on the y-axis", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(patient1, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1947"
      ); // Age 47
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C1"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1947"
      );

      let patient2 = {};
      createPath(patient2, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C1"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1949"
      ); // Age 49
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1949"
      );

      let patient3 = {};
      createPath(patient3, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C2"
      );
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1944"
      ); // Age 44
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1944"
      );

      let patient4 = {};
      createPath(patient4, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient4,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C2"
      );
      createPath(
        patient4,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1946"
      ); // Age 46
      createPath(
        patient4,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1946"
      );

      let patient5 = {};
      createPath(patient5, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient5,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1944"
      ); // Age 44
      createPath(
        patient5,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1944"
      );

      const clearSchema = (callback) => {
        testEnvironment.clearSchema((err, results) => {
          if (err) {
            console.error("Error in clearing schema tables!");
          }
          testsLogger("Cleared tables...");
          callback(null);
        });
      };

      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient1...");
          callback(null);
        });
      };
      let addPatient2 = (callback) => {
        patientCreator.addPatient(patient2, null, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient2...");
          callback(null);
        });
      };
      let addPatient3 = (callback) => {
        patientCreator.addPatient(patient3, null, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient3...");
          callback(null);
        });
      };

      let addPatient4 = (callback) => {
        patientCreator.addPatient(patient4, null, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient4...");
          callback(null);
        });
      };
      let addPatient5 = (callback) => {
        patientCreator.addPatient(patient5, null, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient5...");
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
          //log("Completed adding patients ...");
          done();
        }
      );
    });

    afterAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        //log("Cleaning tables...");
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        //log("Cleared tables...");
        connection.close();
        done();
      });
    });

    it("Average - should calculate the averages correctly", (done) => {
      let request1 = {};
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.age",
        [
          {
            yaxis: 1,
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            xaxis: 1,
          },
        ]
      );

      let t = new Timer();
      let expectedTotalPCount = 5;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "NoValue",
                "C1",
                "C2",
              ],
              "patient.conditions.acme.interactions.priDiag.1.attributes.age": [
                44, 48, 45,
              ],
            },
            null
          );
          done();
        }
      );
    });

    it("Min - should calculate the minimum correctly", (done) => {
      let request1 = {};
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.age",
        [
          {
            yaxis: 1,
            aggregation: "min",
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            xaxis: 1,
          },
        ]
      );

      let t = new Timer();
      let expectedTotalPCount = 5;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "NoValue",
                "C1",
                "C2",
              ],
              "patient.conditions.acme.interactions.priDiag.1.attributes.age": [
                44, 47, 44,
              ],
            },
            null
          );
          done();
        }
      );
    });

    it("Average - does the averaging *after* the filtering if the quantity on the y-aixs is constrained", (done) => {
      let request1 = {};
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.age",
        [
          {
            yaxis: 1,
            filter: [
              {
                op: ">=",
                value: 45,
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            xaxis: 1,
          },
        ]
      );

      let t = new Timer();
      let expectedTotalPCount = 3;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "C1",
                "C2",
              ],
              "patient.conditions.acme.interactions.priDiag.1.attributes.age": [
                48, 46,
              ],
            },
            null
          );
          done();
        }
      );
    });
  });
});
