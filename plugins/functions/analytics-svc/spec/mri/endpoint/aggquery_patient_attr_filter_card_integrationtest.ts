import { createPathInObject as createPath } from "@alp/alp-base-utils";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
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

  describe("patient-attributes filter card", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(patient1, "patient.attributes.smoker", "yes");
      createPath(patient1, "patient.attributes.dateOfBirth", "01.02.1950");

      let patient2 = {};
      createPath(patient2, "patient.attributes.smoker", "no");
      createPath(patient2, "patient.attributes.dateOfBirth", "01.02.1940");

      let patient3 = {};
      createPath(patient3, "patient.attributes.smoker", "no");

      let patient4 = {};
      createPath(patient4, "patient.attributes.dateOfBirth", "01.01.1950");

      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          //   //log("Added Patient1...");
          callback(null);
        });
      };
      let clearSchema = (callback) => {
        testEnvironment.clearSchema((err, results) => {
          if (err) {
            console.error("Error in clearing schema tables!");
          }
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

      let addPatient4 = (callback) => {
        patientCreator.addPatient(patient4, null, (err, data) => {
          if (err) {
            throw err;
          }
          //   //log("Added Patient4...");
          callback(null);
        });
      };
      async.series(
        [clearSchema, addPatient1, addPatient2, addPatient3, addPatient4],
        (err, data) => {
          if (err) {
            throw err;
          }
          //  log("Completed adding patients ...");
          done();
        }
      );
    });

    afterAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        // //log("Cleaning tables...");
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        //  //log("Cleared tables...");
        connection.close();
        done();
      });
    });

    it("should filter to only show patients with the specified attribute value in a text field", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.smoker", [
        {
          filter: [
            {
              op: "=",
              value: "yes",
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
              "patient.attributes.smoker": ["yes"],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should filter to show only groups large than a given size when there is a lower limit on the patient count", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.smoker", [
        {
          xaxis: 1,
        },
      ]);

      let t = new Timer();
      let expectedTotalPCount = 2;
      aggQuery.processRequest(
        "aggquery",
        mockReq,
        "mock_config_min_cohort_size_2", // configId
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
              "patient.attributes.smoker": ["no"],
              "patient.attributes.pcount": [2],
            },
            null
          );
          done();
        }
      );
    });

    it('should show patients with no entry in the attribute in a "no value" column', (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.smoker", [
        {
          xaxis: 1,
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
              "patient.attributes.smoker": ["NoValue", "no", "yes"],
              "patient.attributes.pcount": [1, 2, 1],
            },
            null
          );
          done();
        }
      );
    });

    it("should be able to show and filter patients by year of birth (1), fillMissingValuesEnabled=true", (done) => {
      let request1 = {};
      createPath(request1, "patient.attributes.yearOfBirth", [
        {
          xaxis: 1,
        },
      ]);
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
        "mock_config_fillMissingValuesEnabled_true", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request1),
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
              "patient.attributes.yearOfBirth": ["NoValue", 1940, 1950],
              "patient.attributes.pcount": [1, 1, 2],
            },
            null
          );
          done();
        }
      );
    });

    it("should be able to show and filter patients by year of birth (1), fillMissingValuesEnabled=false", (done) => {
      let request1 = {};
      createPath(request1, "patient.attributes.yearOfBirth", [
        {
          xaxis: 1,
        },
      ]);
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
        "mock_config_fillMissingValuesEnabled_false", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request1),
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
          t.stop();
          expect(res.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res,
            {
              "patient.attributes.yearOfBirth": ["NoValue", 1940, 1950],
              "patient.attributes.pcount": [1, 1, 2],
            },
            null
          );
          done();
        }
      );
    });

    xit("should be able to return NoValue if no category is selected and fillMissingValuesEnabled=false", (done) => {
      // pending(
      //   "Error: HANA DBTech JDBC: [339]: invalid number: [6930] attribute value is not a number"
      // );
      let request1 = {};
      createPath(request1, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      let newConfig = JSON.parse(JSON.stringify(mock_config));
      newConfig.chartOptions.stacked.fillMissingValuesEnabled = false;

      let t = new Timer();
      let expectedTotalPCount = 4;
      aggQuery.processRequest(
        "aggquery",
        mockReq,
        "mock_config_fillMissingValuesEnabled_false", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request1),
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
              dummy_category: ["NoValue"],
              "patient.attributes.pcount": [4],
            },
            null
          );
          done();
        }
      );
    });

    it("should be able to show and filter patients by year of birth (2)", (done) => {
      let request2 = {};
      createPath(request2, "patient.attributes.yearOfBirth", [
        {
          xaxis: 1,
          filter: [
            {
              op: "=",
              value: "1950",
            },
          ],
        },
      ]);
      createPath(request2, "patient.attributes.pcount", [
        {
          yaxis: 1,
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
        request2Bookmark(request2),
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
              "patient.attributes.yearOfBirth": [1950],
              "patient.attributes.pcount": [2],
            },
            null
          );
          done();
        }
      );
    });
  });
});
