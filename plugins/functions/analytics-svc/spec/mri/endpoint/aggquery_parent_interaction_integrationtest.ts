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

  describe("Parent Interaction --", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C1"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        "FOLFOX"
      );

      let patient2 = {};
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C2"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        "FOLFOX"
      );

      let addPatient1 = (callback) => {
        patientCreator.addPatient(
          patient1,
          null,
          (err, patientId, interactionMap) => {
            if (err) {
              throw err;
            }
            patientCreator.linkParentInteractionToChild(
              patientId,
              "patient.conditions.acme.interactions.priDiag.1",
              "patient.conditions.acme.interactions.chemo.1",
              (err, data) => {
                callback(null);
              }
            );
          }
        );
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

      const clearSchema = (callback) => {
        testEnvironment.clearSchema((err, results) => {
          if (err) {
            console.error("Error in clearing schema tables!");
          }
          callback(null);
        });
      };
      async.series([clearSchema, addPatient1, addPatient2], (err, data) => {
        if (err) {
          throw err;
        }
        //log("Completed adding patients ...");
        done();
      });
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

    it('Get patient with parent interaction"', (done) => {
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
            xaxis: 1,
          },
        ]
      );

      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.isFilterCard",
        true
      );

      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.parentInteraction",
        [
          {
            value: "patient.conditions.acme.interactions.priDiag.1",
          },
        ]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it('Get patient with parent interaction with child defined before parent filter card"', (done) => {
      let request1 = {};

      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.parentInteraction",
        [
          {
            value: "patient.conditions.acme.interactions.priDiag.1",
          },
        ]
      );

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
            xaxis: 1,
          },
        ]
      );

      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.isFilterCard",
        true
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });
  });
});
