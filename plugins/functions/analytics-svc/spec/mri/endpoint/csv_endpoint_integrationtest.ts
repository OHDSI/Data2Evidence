import {
  createPathInObject as createPath,
  cloneJson,
} from "@alp/alp-base-utils";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { mock_config } from "../../data/pa/mock_config";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
import { request2IFR } from "../../testutils/Request2IFR";
import { testsLogger } from "../../testutils/logger";
import {
  pholderTableMap,
  Timer,
  aggquery_setup,
} from "../../testutils/aggquery_common";
import { BackendConfigWithCDMConfigMetaDataType } from "../../../src/types";

let testEnvironment;
let connection;
let mockConfig = JSON.parse(JSON.stringify(mock_config));
let patientCreator;
let settingsObj;
let configWithCDMConfigMetaData: BackendConfigWithCDMConfigMetaDataType;
const mockReq = {
  headers: {
    authorization: "Bearer dummy jwt",
    "x-alp-usersessionclaims": "test",
    "x-source-origin": "test",
  },
};

describe("TEST SUITE TO DEFINE THE BEHAVIOR OF THE processRequestCSV ENDPOINT", () => {
  beforeAll((done) => {
    testsLogger(
      "\n\n-----------------------------" +
        "Test class: csv_endpoint_integrationtest.ts -----------------------------\n"
    );
    aggquery_setup((_connection, _testEnvironment, _patientCreator) => {
      connection = _connection;
      testEnvironment = _testEnvironment;
      patientCreator = _patientCreator;
      settingsObj = new Settings();
      configWithCDMConfigMetaData = {
        backendConfig: mockConfig,
        cdmConfigMetaData: { id: "cdmConfigId", version: "1" },
      };
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
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C01"
      );

      let patient2 = {};
      createPath(patient2, "patient.attributes.dateOfBirth", "12.01.1970");
      createPath(patient2, "patient.attributes.dateOfDeath", "01.01.2005");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C02"
      );

      let patient3 = {};
      createPath(patient3, "patient.attributes.dateOfBirth", "12.01.1990");
      createPath(patient1, "patient.attributes.dateOfDeath", "01.01.1999");
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C03"
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
                      icd: [{ xaxis: 1 }],
                      age: [{}],
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
      };

      let t = new Timer();
      aggQuery.processRequestCsv(
        "aggquerycsv",
        mockReq,
        "mock_config", // configId
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
          expect(rows[0]).toEqual("ICD Code;Patient Count");
          expect(rows[1]).toEqual("C01;1");
          expect(rows[2]).toEqual("C02;1");
          expect(rows[3]).toEqual("C03;1");
          done();
        }
      );
    });

    it("StackedBarChart CSV endpoint with sql execution error", (done) => {
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
                      icd: [{ xaxis: 1 }],
                      age: [{}],
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
      };

      let t = new Timer();
      let errorPholderTableMap = cloneJson(pholderTableMap);
      errorPholderTableMap["@PATIENT.PATIENT_ID"] = "IM_A_FAKE_COLUMN";
      aggQuery.processRequestCsv(
        "aggquerycsv",
        mockReq,
        "mock_config_invalid_ph_2", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2Bookmark(request1),
        "en",
        connection,
        null,
        (err, res1) => {
          t.stop();
          expect(err.name).toEqual("MRIDBError");
          expect(err.logId).toBeDefined();
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
            lastname: [{ yaxis: 1, aggregation: "string_agg" }],
            firstname: [{ yaxis: 2, aggregation: "string_agg" }],
            dob: [{ yaxis: 3, aggregation: "string_agg" }],
          },
          conditions: {
            acme: {
              interactions: {
                priDiag: {
                  1: {
                    isFiltercard: true,
                    attributes: {
                      icd: [
                        {
                          yaxis: 6,
                          aggregation: "string_agg",
                        },
                      ],
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
        pholderTableMap
      );
      let t = new Timer();
      aggQuery.processRequestCsv(
        "patientdetailcsv",
        mockReq,
        "configWithCDMConfigMetaData", // configId
        "0", // configVersion
        "datasetId_1", // datasetId
        request2IFR(request1),
        "en",
        connection,
        {
          uiColumnDisplayOrder: [
            "patient.attributes.lastname",
            "patient.attributes.firstname",
            "patient.attributes.dob",
            "patient.attributes.gender",
            "patient.conditions.acme.interactions.priDiag.attributes.age",
            "patient.conditions.acme.interactions.priDiag.attributes.icd",
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
