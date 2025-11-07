import { createPathInObject as createPath } from "@alp/alp-base-utils";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { dw_views_pholderTableMap } from "../../data/global/dw_views_pholdertablemap";
import { dw_views_config } from "../../data/pa/dw_views_config";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
import { request2IFR } from "../../testutils/Request2IFR";
import { testsLogger } from "../../testutils/logger";
import { Timer, aggquery_setup } from "../../testutils/aggquery_common";
import { BackendConfigWithCDMConfigMetaDataType } from "../../../src/types";

let testEnvironment;
let connection;
let patientCreator;
let settingsObj;
let configWithCDMConfigMetaData: BackendConfigWithCDMConfigMetaDataType = {
  backendConfig: dw_views_config,
  cdmConfigMetaData: { id: "cdmConfigId", version: "1" },
};

// icd code is retrieved as left(icd_code,3)
let icd_code_1 = "C00";
let icd_code_2 = "C02";
let icd_code_3 = "C03";
let icd_code_suffix = ".-";
const mockReq = {
  headers: {
    authorization: "Bearer dummy jwt",
    "x-alp-usersessionclaims": "test",
    "x-source-origin": "test",
  },
};

describe("TEST SUITE TO DEFINE THE BEHAVIOR OF THE processRequestCSV ENDPOINT Using custom column names", () => {
  beforeAll((done) => {
    testsLogger(
      "\n\n-----------------------------" +
        "Test class: custom_column_names_integrationtest.ts -----------------------------\n"
    );
    aggquery_setup((_connection, _testEnvironment, _patientCreator) => {
      connection = _connection;
      testEnvironment = _testEnvironment;
      patientCreator = _patientCreator;
      settingsObj = new Settings();
      done();
    });
  });

  describe("TEST SUITE TO DEFINE THE BEHAVIOR OF THE processRequestCSV ENDPOINT", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(patient1, "patient.attributes.dateOfBirth", "01.01.1960");
      createPath(patient1, "patient.attributes.dateOfDeath", "01.01.2000");
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
        icd_code_1 + icd_code_suffix
      );

      let patient2 = {};
      createPath(patient2, "patient.attributes.dateOfBirth", "12.01.1970");
      createPath(patient2, "patient.attributes.dateOfDeath", "01.01.2005");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
        icd_code_2 + icd_code_suffix
      );

      let patient3 = {};
      createPath(patient3, "patient.attributes.dateOfBirth", "12.01.1990");
      createPath(patient1, "patient.attributes.dateOfDeath", "01.01.1999");
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10",
        icd_code_3 + icd_code_suffix
      );

      let addPatient = (patient) => (cb) => {
        patientCreator.addPatient(patient, null, (err, data) => {
          if (err) {
            throw err;
          }
          cb(null);
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
          addPatient(patient1),
          addPatient(patient2),
          addPatient(patient3),
        ],
        (err, data) => {
          if (err) {
            throw err;
          }
          done();
        }
      );
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

    it("StackedBarChart CSV endpoint", (done) => {
      let request1 = {
        patient: {
          isFiltercard: true,
          attributes: {
            smoker: [{}],
            gender: [{}],
            biomarker: [{}],
            pcount: [{ yaxis: 1 }],
          },
          conditions: {
            acme: {
              interactions: {
                priDiag: {
                  1: {
                    isFiltercard: true,
                    attributes: {
                      icd_10: [{ xaxis: 1 }],
                      age: [{}],
                    },
                  },
                },
              },
            },
          },
        },
        configData: {
          configId: "A027D85782E84D11E10000000A614BFE",
          configVersion: "A",
        },
      };

      let t = new Timer();
      aggQuery.processRequestCsv(
        "aggquerycsv",
        mockReq,
        "dw_views_config", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request1),
        "en",
        connection,
        null,
        (err, res1) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          let rows = res1.split("\r\n");
          expect(rows.length).toBeGreaterThan(0);
          expect(rows[0]).toEqual("ICD-10-CM Code;Patient Count");
          expect(rows[1]).toEqual(`${icd_code_1};1`);
          expect(rows[2]).toEqual(`${icd_code_2};1`);
          expect(rows[3]).toEqual(`${icd_code_3};1`);
          done();
        }
      );
    });

    xit("PatientList CSV endpoint", (done) => {
      let request1 = {
        patient: {
          isFiltercard: true,
          attributes: {
            smoker: [{}],
            gender: [{ yaxis: 4, aggregation: "string_agg" }],
            biomarker: [{}],
            lastName: [{ yaxis: 1, aggregation: "string_agg" }],
            firstName: [{ yaxis: 2, aggregation: "string_agg" }],
            dateOfBirth: [{ yaxis: 3, aggregation: "string_agg" }],
          },
          conditions: {
            acme: {
              interactions: {
                priDiag: {
                  1: {
                    isFiltercard: true,
                    attributes: {
                      icd_10: [
                        {
                          yaxis: 6,
                          aggregation: "string_agg",
                        },
                      ],
                      // this attribute will test multiple placeholders on the defaulfilter.
                      // We only support a single pholder at the moment
                      // "icd_10_smoker": [{ "yaxis": 7, "aggregation": "string_agg" }],
                      age: [
                        {
                          yaxis: 5,
                          aggregation: "string_agg",
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        configData: {
          configId: "PatientAnalyticsInitialCI",
          configVersion: "A",
        },
        guarded: true,
        limit: 0,
        offset: 0,
      };

      spyOn(settingsObj, "getGuardedPlaceholderMap").and.returnValue(
        dw_views_pholderTableMap
      );

      let t = new Timer();
      aggQuery.processRequestCsv(
        "patientdetailcsv",
        mockReq,
        "dw_views_config", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request1),
        "en",
        connection,
        {
          uiColumnDisplayOrder: [
            "patient.attributes.lastName",
            "patient.attributes.firstName",
            "patient.attributes.dateOfBirth",
            "patient.attributes.gender",
            "patient.conditions.acme.interactions.priDiag.attributes.age",
            "patient.conditions.acme.interactions.priDiag.attributes.icd_10",
          ],
        },
        (err, res1) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          expect(res1.split("\r\n").length).toBeGreaterThan(0);
          done();
        }
      );
    });
  });
});
