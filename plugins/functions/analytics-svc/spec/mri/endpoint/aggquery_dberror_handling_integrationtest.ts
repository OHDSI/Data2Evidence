import {
  createPathInObject as createPath,
  cloneJson,
} from "@alp/alp-base-utils";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
import { DBError as dbe } from "@alp/alp-base-utils";
import DBError = dbe.DBError;
import { Settings } from "../../../src/qe/settings/Settings";
import * as analytics from "../../../src/mri/endpoint/analytics";
import { mock_config } from "../../data/pa/mock_config";

import {
  testSuiteName,
  pholderTableMap,
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

  describe("Error handling in the Query Engine", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        "COPP"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.2.attributes.chemo_prot",
        "COPP"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.chemo.3.attributes.chemo_prot",
        "COPP"
      );

      testEnvironment.clearSchema((err, results) => {
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          done();
        });
      });
    });

    afterAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        connection.close();
        done();
      });
    });

    it("should return DBError object when an exception occurs in the Query Engine", (done) => {
      let request1 = {};
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.interactionCount",
        [
          {
            yaxis: 1,
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

      analytics.processRequest(
        "aggquery",
        mockReq,
        "mock_config_invalid_ph", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request1),
        "en",
        null, //config only required for domain_values_service & freetext_search_service
        connection,
        (err, res1) => {
          t.stop();
          expect(err.name).toEqual("MRIDBError");
          expect(err.logId).toBeDefined();
          done();
        }
      );
    });

    it("should return null error object when request is empty", (done) => {
      let t = new Timer();

      analytics.processRequest(
        "aggquery",
        mockReq,
        "mock_config", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        {},
        "en",
        null, //config only required for domain_values_service & freetext_search_service
        connection,
        (err: DBError, res1) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          expect(res1.data).toEqual([]);
          expect(res1.measures).toEqual([]);
          expect(res1.categories).toEqual([]);
          expect(res1.totalPatientCount).toEqual(0);
          done();
        }
      );
    });
  });
});
