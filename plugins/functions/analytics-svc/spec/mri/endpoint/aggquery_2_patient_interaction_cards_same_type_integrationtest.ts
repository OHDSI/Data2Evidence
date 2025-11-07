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

  describe("two patient-interaction cards of the same type", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(
        patient1,
        "patient.interactions.vStatus.1.attributes.status",
        "Alive"
      );
      createPath(
        patient1,
        "patient.interactions.vStatus.2.attributes.status",
        "Deceased"
      );

      let patient2 = {};
      createPath(
        patient2,
        "patient.interactions.vStatus.1.attributes.status",
        "Alive"
      );
      createPath(
        patient2,
        "patient.interactions.vStatus.2.attributes.status",
        "Alive"
      );

      let patient3 = {};
      createPath(
        patient3,
        "patient.interactions.vStatus.1.attributes.status",
        "Alive"
      );
      createPath(
        patient3,
        "patient.interactions.vStatus.2.attributes.status",
        "Deceased"
      );
      createPath(
        patient3,
        "patient.interactions.vStatus.3._start",
        "01.01.1900"
      );

      let patient4 = {};
      createPath(
        patient4,
        "patient.interactions.vStatus.1.attributes.status",
        "Alive"
      );
      createPath(
        patient4,
        "patient.interactions.vStatus.2._start",
        "01.01.1900"
      );

      let patient5 = {};
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

      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          //      //log("Added Patient1...");
          callback(null);
        });
      };
      let addPatient2 = (callback) => {
        patientCreator.addPatient(patient2, null, (err, data) => {
          if (err) {
            throw err;
          }
          //  //log("Added Patient2...");
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

      let addPatient4 = (callback) => {
        patientCreator.addPatient(patient4, null, (err, data) => {
          if (err) {
            throw err;
          }
          //  //log("Added Patient4...");
          callback(null);
        });
      };
      let addPatient5 = (callback) => {
        patientCreator.addPatient(patient5, null, (err, data) => {
          if (err) {
            throw err;
          }
          //  //log("Added Patient5...");
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
          // log("Completed adding patients ...");
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

    it("the order should not have any influence (1)", (done) => {
      let request1 = {};
      createPath(request1, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request1, "patient.interactions.vStatus.1.attributes.status", [
        {
          xaxis: 1,
        },
      ]);
      createPath(request1, "patient.interactions.vStatus.2.attributes.status", [
        {
          filter: [
            {
              op: "=",
              value: "Alive",
            },
          ],
        },
      ]);

      let expectedProtocolls = ["NoValue", "Alive", "Deceased"];
      let expectedPcounts = [2, 1, 2];
      let expectedTotalPCount = 4;
      let t = new Timer();
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
              "patient.interactions.vStatus.1.attributes.status":
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
      let request2 = {};
      createPath(request2, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request2, "patient.interactions.vStatus.1.attributes.status", [
        {
          filter: [
            {
              op: "=",
              value: "Alive",
            },
          ],
        },
      ]);
      createPath(request2, "patient.interactions.vStatus.2.attributes.status", [
        {
          xaxis: 1,
        },
      ]);

      let expectedProtocolls = ["NoValue", "Alive", "Deceased"];
      let expectedPcounts = [2, 1, 2];
      let expectedTotalPCount = 4;
      let t = new Timer();
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
              "patient.interactions.vStatus.2.attributes.status":
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
