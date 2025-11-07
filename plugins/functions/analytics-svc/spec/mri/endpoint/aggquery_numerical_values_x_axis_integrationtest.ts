import {
  createPathInObject as createPath,
  createGuid as createId,
} from "@alp/alp-base-utils";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { mock_config } from "../../data/pa/mock_config";
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

  describe("numerical values on x-axis", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(patient1, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C1"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1903"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1903"
      );

      let patient2 = {};
      createPath(patient2, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C2"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1904"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1904"
      );

      let patient3 = {};
      createPath(patient3, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C3"
      );
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1906"
      );
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1906"
      );

      let patient4 = {};
      createPath(patient4, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C4"
      );
      createPath(
        patient4,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "01.01.1906"
      );
      createPath(
        patient4,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "01.01.1906"
      );
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

      const clearSchema = (callback) => {
        testEnvironment.clearSchema((err, results) => {
          if (err) {
            console.error("Error in clearing schema tables!");
          }
          callback(null);
        });
      };

      async.series(
        [clearSchema, addPatient1, addPatient2, addPatient3, addPatient4],
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

    it("without binning one should get all values", (done) => {
      // TODO: Do we want this behavior
      let request1 = {};
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.age",
        [
          {
            xaxis: 1,
          },
        ]
      );
      createPath(request1, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);

      let t = new Timer();
      let expectedTotalPCount = 4;
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
              "patient.conditions.acme.interactions.priDiag.1.attributes.age": [
                3, 4, 6,
              ],
              "patient.attributes.pcount": [1, 1, 2],
            },
            null
          );
          done();
        }
      );
    });

    it("without binning one should get all values - complex x axis attribute", (done) => {
      // TODO: Do we want this behavior
      let request1 = {};
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.startdatetime",
        [
          {
            xaxis: 1,
          },
        ]
      );
      createPath(request1, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);

      let t = new Timer();
      let expectedTotalPCount = 4;
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
              "patient.conditions.acme.interactions.priDiag.1.attributes.startdatetime":
                [
                  "1903-01-01T00:00:00",
                  "1904-01-01T00:00:00",
                  "1906-01-01T00:00:00",
                ],
              "patient.attributes.pcount": [1, 1, 2],
            },
            null
          );
          done();
        }
      );
    });
  });
});
