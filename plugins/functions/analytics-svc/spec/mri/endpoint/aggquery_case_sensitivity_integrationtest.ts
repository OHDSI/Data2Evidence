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

  describe("case sensitivity --", () => {
    let patientIcds;

    beforeAll((done) => {
      patientIcds = ["C01", "C01", "C01", "C02", "c02", "c02"];

      let patients = [];
      patientIcds.forEach((icd) => {
        let p = {};
        createPath(
          p,
          "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
          icd
        );
        patients.push(p);
      });

      let tasks = [];

      const clearSchema = (callback) => {
        testEnvironment.clearSchema((err, results) => {
          if (err) {
            console.error("Error in clearing schema tables!");
          }
          testsLogger("Cleared tables...");
          callback(null);
        });
      };
      for (let i in patients) {
        let result = ((i) => {
          tasks.push((callback) => {
            patientCreator.addPatient(patients[i], null, (err, data) => {
              if (err) {
                throw err;
              }
              //    log("Added Patient" + i + "...");
              callback(null);
            });
          });
        })(i);
      }

      async.series([clearSchema, ...tasks], (err, data) => {
        if (err) {
          throw err;
        }
        //  log("Completed adding patients ...");
        done();
      });
    });

    afterAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        //  log("Cleaning tables...");
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        //  log("Cleared tables...");
        connection.close();
        done();
      });
    });

    it(`filtering should be case insensitive, but on the xaxis different capitalization in the data will result in different groups: e.g. 'C02' and 'c02'
             (1)`, (done) => {
      // filter using capital C01
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
            filter: [
              {
                op: "=",
                value: "C01",
              },
            ],
          },
        ]
      );
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
                "C01",
              ],
              "patient.attributes.pcount": [3],
            },
            null
          );
          done();
        }
      );
    });

    it(`filtering should be case insensitive, but on the xaxis different capitalization in the data will result in different groups: e.g. 'C02' and 'c02'
             (2)`, (done) => {
      // filter using small c01
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
            xaxis: 1,
            filter: [
              {
                op: "=",
                value: "c01",
              },
            ],
          },
        ]
      );
      let expectedTotalPCount = 3;
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
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          expect(res2.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res2,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "C01",
              ],
              "patient.attributes.pcount": [3],
            },
            null
          );
          done();
        }
      );
    });

    it(`filtering should be case insensitive, but on the xaxis different capitalization in the data will result in different groups: e.g. 'C02' and 'c02'
             (3)`, (done) => {
      // filter using capital C02
      let request3 = {};
      createPath(request3, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            xaxis: 1,
            filter: [
              {
                op: "=",
                value: "C02",
              },
            ],
          },
        ]
      );
      let expectedTotalPCount = 3;
      aggQuery.processRequest(
        "aggquery",
        mockReq,
        "mock_config", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request3),
        "en",
        null, //config only required for domain_values_service & freetext_search_service
        connection,
        (err, res3) => {
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          expect(res3.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res3,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "C02",
                "c02",
              ],
              "patient.attributes.pcount": [1, 2],
            },
            null
          );
          done();
        }
      );
    });

    it(`filtering should be case insensitive, but on the xaxis different capitalization in the data will result in different groups: e.g. 'C02' and 'c02'
             (4)`, (done) => {
      // filter using small c02
      let request4 = {};
      createPath(request4, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request4,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            xaxis: 1,
            filter: [
              {
                op: "=",
                value: "c02",
              },
            ],
          },
        ]
      );
      let expectedTotalPCount = 3;
      aggQuery.processRequest(
        "aggquery",
        mockReq,
        "mock_config", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request4),
        "en",
        null, //config only required for domain_values_service & freetext_search_service
        connection,
        (err, res4) => {
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          expect(res4.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res4,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "C02",
                "c02",
              ],
              "patient.attributes.pcount": [1, 2],
            },
            null
          );
          done();
        }
      );
    });
  });
});
