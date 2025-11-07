import { createPathInObject as createPath } from "@alp/alp-base-utils";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
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

  describe("single patient-interaction filter card: text attribute", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(
        patient1,
        "patient.interactions.vStatus.1.attributes.status",
        "Alive"
      );

      let patient2 = {};
      createPath(
        patient2,
        "patient.interactions.vStatus.1.attributes.status",
        "Deceased"
      );
      createPath(
        patient2,
        "patient.interactions.vStatus.2._start",
        "01.01.2012"
      );

      let patient3 = {};
      createPath(patient3, "patient.attributes.dateOfBirth", "01.01.2012");

      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          //   //log("Added Patient1...");
          callback(null);
        });
      };

      let addPatient2 = (callback) => {
        patientCreator.addPatient(patient2, null, (err, data) => {
          if (err) {
            throw err;
          }
          //   //log("Added Patient2...");
          callback(null);
        });
      };
      let addPatient3 = (callback) => {
        patientCreator.addPatient(patient3, null, (err, data) => {
          if (err) {
            throw err;
          }
          //   //log("Added Patient3...");
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
        [clearSchema, addPatient1, addPatient2, addPatient3],
        (err, data) => {
          if (err) {
            throw err;
          }
          //     log("Completed adding patients ...");
          done();
        }
      );
    });

    afterAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        // log("Cleaning tables...");
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        //  log("Cleared tables...");
        connection.close();
        done();
      });
    });

    it("should filter to only show patients with the specified attribute value", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.interactions.vStatus.1.attributes.status", [
        {
          filter: [
            {
              op: "=",
              value: "Deceased",
            },
          ],
          xaxis: 1,
        },
      ]);

      let t = new Timer();
      let expectedTotalPCount = 1;
      aggQuery.processRequest(
        "aggquery",
        mockReq,
        "mock_config", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request),
        "en",
        null, //config only required for domain_values_service & freetext_search_service
        connection,
        (err, res) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          expect(res.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res,
            {
              "patient.interactions.vStatus.1.attributes.status": ["Deceased"],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it(`should show in novalue column patients with an interaction of this type but no entry in the attribute. it should not show patients without any
             interaction of this type`, (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.interactions.vStatus.1.attributes.status", [
        {
          xaxis: 1,
        },
      ]);

      let t = new Timer();
      let expectedTotalPCount = 2;
      aggQuery.processRequest(
        "aggquery",
        mockReq,
        "mock_config", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request),
        "en",
        null, //config only required for domain_values_service & freetext_search_service
        connection,
        (err, res) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          expect(res.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res,
            {
              "patient.interactions.vStatus.1.attributes.status": [
                "NoValue",
                "Alive",
                "Deceased",
              ],
              "patient.attributes.pcount": [1, 1, 1],
            },
            null
          );
          done();
        }
      );
    });
  });
});
