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

  describe("single condition-interaction filter card: numerical attribute -", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(patient1, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient1,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        "O1"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        147
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.radio.1._start",
        "01.01.1947"
      ); // Age 47
      createPath(
        patient1,
        "patient.conditions.acme.interactions.radio.1._end",
        "01.01.1947"
      );

      let patient2 = {};
      createPath(patient2, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        "O1"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        149
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.radio.1._start",
        "01.01.1949"
      ); // Age 49
      createPath(
        patient2,
        "patient.conditions.acme.interactions.radio.1._end",
        "01.01.1949"
      );

      let patient3 = {};
      createPath(patient3, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient3,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        "O2"
      );
      createPath(
        patient3,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        144
      );
      createPath(
        patient3,
        "patient.conditions.acme.interactions.radio.1._start",
        "01.01.1944"
      ); // Age 44
      createPath(
        patient3,
        "patient.conditions.acme.interactions.radio.1._end",
        "01.01.1944"
      );

      let patient4 = {};
      createPath(patient4, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient4,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        "O2"
      );
      createPath(
        patient4,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        146
      );
      createPath(
        patient4,
        "patient.conditions.acme.interactions.radio.1._start",
        "01.01.1946"
      ); // Age 46
      createPath(
        patient4,
        "patient.conditions.acme.interactions.radio.1._end",
        "01.01.1946"
      );

      let patient5 = {};
      createPath(patient5, "patient.attributes.dateOfBirth", "01.01.1900");
      createPath(
        patient5,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        144
      );
      createPath(
        patient5,
        "patient.conditions.acme.interactions.radio.1._start",
        "01.01.1944"
      ); // Age 44
      createPath(
        patient5,
        "patient.conditions.acme.interactions.radio.1._end",
        "01.01.1944"
      );

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
      let addPatient5 = (callback) => {
        patientCreator.addPatient(patient5, null, (err, data) => {
          if (err) {
            throw err;
          }
          //  //log("Added Patient5...");
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

    it(`should filter to only show patients with attribute values *above or equal to* the specified *inclusive* lower limit in a numerical field`, (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        [
          {
            xaxis: 1,
          },
        ]
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        [
          {
            filter: [
              {
                op: ">=",
                value: 146,
              },
            ],
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
              "patient.conditions.acme.interactions.radio.1.attributes.radio_ops":
                ["O1", "O2"],
              "patient.attributes.pcount": [2, 1],
            },
            null
          );
          done();
        }
      );
    });

    it("should filter to only show patients with attribute values *stricly above* the specified *exclusive* lower limit in a numerical field", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        [
          {
            xaxis: 1,
          },
        ]
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        [
          {
            filter: [
              {
                op: ">",
                value: 146,
              },
            ],
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
              "patient.conditions.acme.interactions.radio.1.attributes.radio_ops":
                ["O1"],
              "patient.attributes.pcount": [2],
            },
            null
          );
          done();
        }
      );
    });

    it(`should filter to only show patients with attribute values *below or equal to* the specified *inclusive* upper limit in a numerical field`, (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        [
          {
            xaxis: 1,
          },
        ]
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        [
          {
            filter: [
              {
                op: "<=",
                value: 146,
              },
            ],
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
              "patient.conditions.acme.interactions.radio.1.attributes.radio_ops":
                ["NoValue", "O2"],
              "patient.attributes.pcount": [1, 2],
            },
            null
          );
          done();
        }
      );
    });

    it("should filter to only show patients with attribute values *strictly below* the specified *exclusive* upper limit in a numerical field", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        [
          {
            xaxis: 1,
          },
        ]
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        [
          {
            filter: [
              {
                op: "<",
                value: 146,
              },
            ],
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
              "patient.conditions.acme.interactions.radio.1.attributes.radio_ops":
                ["NoValue", "O2"],
              "patient.attributes.pcount": [1, 1],
            },
            null
          );
          done();
        }
      );
    });

    it("should filter to only show patients with attribute values *stricly above* the specified *exclusive* lower limit in a numerical field", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_ops",
        [
          {
            xaxis: 1,
          },
        ]
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.radio.1.attributes.radio_dosage_value",
        [
          {
            filter: [
              {
                and: [
                  {
                    op: ">=",
                    value: 146,
                  },
                  {
                    op: "<",
                    value: 149,
                  },
                ],
              },
            ],
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
              "patient.conditions.acme.interactions.radio.1.attributes.radio_ops":
                ["O1", "O2"],
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
