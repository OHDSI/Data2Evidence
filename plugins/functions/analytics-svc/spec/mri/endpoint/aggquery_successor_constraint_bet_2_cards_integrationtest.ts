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

  describe("successor constraint between two cards", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C34"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "10.01.1900"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "10.01.1900"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        "FOLFOX"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.1._start",
        "11.01.1900"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.1._end",
        "11.01.1900"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
        "COPP"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.2._start",
        "09.01.1900"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.2._end",
        "09.01.1900"
      );

      let patient2 = {};
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C34"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "10.01.1900"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1._end",
        "10.01.1900"
      );

      createPath(
        patient2,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        "COPP"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.chemo.1._start",
        "11.01.1900"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.chemo.1._end",
        "11.01.1900"
      );

      let patient3 = {};
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C34"
      );
      createPath(
        patient3,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        "FOLFOX"
      );
      createPath(
        patient3,
        "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
        "COPP"
      );

      let patient4 = {};
      createPath(
        patient4,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C34"
      );
      createPath(
        patient4,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        "COPP"
      );

      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          //    log("Added Patient1...");
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

    it("should limit the result to patients that had the specified interactions within the given time frame (1)", (done) => {
      // without successor constraint
      let request1 = {};
      createPath(request1, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            filter: [
              {
                op: "=",
                value: "C34",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [
          {
            xaxis: 1,
          },
        ]
      );

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
              "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot":
                ["COPP", "FOLFOX"],
              "patient.attributes.pcount": [4, 2],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (2)", (done) => {
      // with successor constraint
      let request2 = {};
      createPath(request2, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            filter: [
              {
                op: "=",
                value: "C34",
              },
            ],
          },
        ]
      );
      createPath(
        request2,
        "patient.conditions.acme.interactions.priDiag.1.attributes._succ",
        [
          {
            value: "patient.conditions.acme.interactions.chemo.1",
            filter: [
              {
                and: [
                  {
                    op: ">=",
                    value: 1,
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request2,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [
          {
            xaxis: 1,
          },
        ]
      );

      let t = new Timer();
      let expectedTotalPCount = 2;
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
              "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot":
                ["COPP", "FOLFOX"],
              "patient.attributes.pcount": [1, 1],
            },
            null
          );
          done();
        }
      );
    });
  });
});
