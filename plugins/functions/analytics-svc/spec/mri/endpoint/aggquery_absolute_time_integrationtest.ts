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

  describe("absolute time", () => {
    let patients;

    beforeAll((done) => {
      //                   5.01.       14.01.      16.01.                24.01.  30.01.
      //            01.01    |          |            |                    |        |
      //              |      | 10.01.   |            |         20.01.     |        |
      //              |      | lower    |            |         upper      |        |
      //    Query                [---------------------------------]
      //
      // n  Pat1      [------]
      // y  Pat2      [------------------------------]
      // y  Pat3                        [------------]
      // y  Pat4                        [------------------------------------------]
      // n  Pat5                                                          [--------]
      // n  Pat6             X
      // y  Pat7                        X
      // n  Pat8                                                          X
      // y  Pat9      [------------------------------------------------------------...
      // y  Pat10                       [------------------------------------------...
      // n  Pat11                                                         [--------...
      // n  Pat12    ...-----]
      // y  Pat13    ...-----------------------------]
      // y  Pat14    ...--------------------------------------------------]
      // y  Pat15     [------------------------------------------------------------]
      // y  Pat16    ** no time specified **

      patients = [
        {
          name: "P01",
          start: "01.01.2000",
          end: "05.01.2000",
          included: false,
        },
        {
          name: "P02",
          start: "01.01.2000",
          end: "16.01.2000",
          included: true,
        },
        {
          name: "P03",
          start: "14.01.2000",
          end: "30.01.2000",
          included: true,
        },
        {
          name: "P04",
          start: "14.01.2000",
          end: "30.01.2000",
          included: true,
        },
        {
          name: "P05",
          start: "24.01.2000",
          end: "30.01.2000",
          included: false,
        },
        {
          name: "P06",
          start: "05.01.2000",
          end: "05.01.2000",
          included: false,
        },
        {
          name: "P07",
          start: "14.01.2000",
          end: "14.01.2000",
          included: true,
        },
        {
          name: "P08",
          start: "24.01.2000",
          end: "24.01.2000",
          included: false,
        },
        {
          name: "P09",
          start: "01.01.2000",
          included: true,
        },
        {
          name: "P10",
          start: "14.01.2000",
          included: true,
        },
        {
          name: "P11",
          start: "24.01.2000",
          included: false,
        },
        {
          name: "P12",
          end: "05.01.2000",
          included: false,
        },
        {
          name: "P13",
          end: "16.01.2000",
          included: true,
        },
        {
          name: "P14",
          end: "24.01.2000",
          included: true,
        },
        {
          name: "P15",
          start: "01.01.2000",
          end: "30.01.2000",
          included: true,
        },
        {
          name: "P16",
          included: false,
        },
      ];

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
          let p = {};
          createPath(
            p,
            "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
            patients[i].name
          );
          if (patients[i].start) {
            createPath(
              p,
              "patient.conditions.acme.interactions.priDiag.1._start",
              patients[i].start
            );
          }
          if (patients[i].end) {
            createPath(
              p,
              "patient.conditions.acme.interactions.priDiag.1._end",
              patients[i].end
            );
          }
          tasks.push((callback) => {
            patientCreator.addPatient(p, null, (err, data) => {
              if (err) {
                throw err;
              }
              //   log("Added Patient" + i + "...");
              callback(null);
            });
          });
        })(i);
      }

      async.series([clearSchema, ...tasks], (err, data) => {
        if (err) {
          throw err;
        }
        //   log("Completed adding patients ...");
        done();
      });
    });

    afterAll((done) => {
      testEnvironment.clearSchema((err, results) => {
        //  log("Cleaning tables...");
        if (err) {
          console.error("Error in clearing schema tables!");
        }
        //   log("Cleared tables...");
        connection.close();
        done();
      });
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (1)", (done) => {
      // without abs time constraint
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
          expect(res1.totalPatientCount).toEqual(patients.length);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd":
                patients.map((p) => {
                  return p.name;
                }),
              "patient.attributes.pcount": patients.map(() => {
                return 1;
              }),
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (2)", (done) => {
      // with abs time constraint
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
          },
        ]
      );
      createPath(
        request2,
        "patient.conditions.acme.interactions.priDiag.1.attributes._absTime",
        [
          {
            filter: [
              {
                and: [
                  {
                    op: ">=",
                    value: "2000-01-10T00:00:00.000Z",
                    type: "abstime",
                  },
                  {
                    op: "<=",
                    value: "2000-01-20T23:59:59.999Z",
                    type: "abstime",
                  },
                ],
              },
            ],
          },
        ]
      );

      let t2 = new Timer();
      let expectedTotalPCount = 9;
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
          t2.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          let includedPatients = patients.filter((p) => {
            return p.included;
          });
          expect(res2.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res2,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd":
                includedPatients.map((p) => {
                  return p.name;
                }),
              "patient.attributes.pcount": includedPatients.map(() => {
                return 1;
              }),
            },
            null
          );
          done();
        }
      );
    });
  });
});
