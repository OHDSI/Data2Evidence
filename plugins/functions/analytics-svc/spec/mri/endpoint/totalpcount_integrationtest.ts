import * as utilsLib from "@alp/alp-base-utils";
import { TestEnvironment } from "../../testutils/testenvironment";
import { PatientCreator } from "../../testutils/create_patients";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
import {
  DBConnectionUtil as dbConnectionUtil,
  DBError,
} from "@alp/alp-base-utils";
import * as async from "async";
import * as fs from "fs-extra";
import * as ana from "../../../src/mri/endpoint/analytics";
import {
  Settings,
  PholderTableMapType,
} from "../../../src/qe/settings/Settings";
import { mock_config } from "../../data/pa/mock_config";
import { pholderTableMap } from "../../data/global/pholdertablemap";
import { dw_views_pholderTableMap } from "../../data/global/dw_views_pholdertablemap";
import { dw_views_config } from "../../data/pa/dw_views_config";
import { Timer } from "../../testutils/aggquery_common";
import { DisableLogger } from "../../../src/utils/Logger";
import { testsLogger } from "../../testutils/logger";

let settingsObj;
let createPath = utilsLib.createPathInObject;

let testSchemaName = process.env.TESTSCHEMA;
let testEnvironment;
let client;
let connection;
let patientCreator;
let creationConfig;

DisableLogger();
const mockReq = {
  headers: {
    authorization: "Bearer dummy jwt",
    "x-alp-usersessionclaims": "test",
    "x-source-origin": "test",
  },
};
describe("TEST SUITE TO DEFINE THE BEHAVIOR OF THE TOTALPCOUNT ENDPOINT --", () => {
  beforeAll((done) => {
    testsLogger(
      "\n\n-----------------------------Test class: totalpcount_integrationtest.ts -----------------------------\n"
    );
    testsLogger("testSchemaName:" + testSchemaName);

    const credentials = {
      host: process.env.HANASERVER,
      port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
      user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
      password: process.env.TESTSYSTEMPW
        ? process.env.TESTSYSTEMPW
        : "Toor1234",
      dialect: "hana",
    };

    dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
      if (err) {
        throw err;
      }

      client = c;
      if (!client) {
        testsLogger("client undefined");
      }
      let loadCreationConfig = (callback) => {
        let path = "spec/data/acme_creation_config.json";
        //log("path: " + path);
        fs.readJson(path, (err, data) => {
          if (err) {
            console.error("CreationConfig file not found!");
            throw err;
            //err.trace;
          }
          creationConfig = data;
          // log("Loaded creationConfig...")
          //log(JSON.stringify(creationConfig));
          callback(null);
        });
      };

      let initConnectionAndSettings = (callback) => {
        dbConnectionUtil.DBConnectionUtil.getConnection(
          credentials.dialect,
          client,
          testSchemaName,
          (err, data) => {
            if (err) {
              console.error("Error in seting default schema!");
            }
            connection = data;
            settingsObj = new Settings();
            testsLogger("Set default schema to " + testSchemaName);
            callback(null);
          }
        );
      };

      let initTestEnvironment = (callback) => {
        testEnvironment = new TestEnvironment(
          credentials.dialect,
          client,
          testSchemaName,
          false,
          true,
          (err, results) => {
            if (err) {
              console.error("Error in initializing TestEnvironment!");
            }
            callback(null);
          }
        );
      };

      let initPatientCreator = (callback) => {
        patientCreator = new PatientCreator(
          credentials.dialect,
          testSchemaName,
          client,
          creationConfig,
          (err, results) => {
            if (err) {
              console.error("Error in initializing PatientCreator!");
            }
            callback(null);
          }
        );
      };

      let patient1 = {};
      createPath(patient1, "patient.attributes.smoker", "yes");
      createPath(patient1, "patient.attributes.dateOfBirth", "01.02.1950");
      let patient2 = {};
      createPath(patient2, "patient.attributes.smoker", "no");
      createPath(patient2, "patient.attributes.dateOfBirth", "01.02.1940");
      let patient3 = {};
      createPath(patient3, "patient.attributes.smoker", "no");
      let patient4 = {};
      createPath(patient4, "patient.attributes.dateOfBirth", "01.02.1950");

      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          //  log("Added Patient1...");
          callback(null);
        });
      };

      let addPatient2 = (callback) => {
        patientCreator.addPatient(patient2, null, (err, data) => {
          if (err) {
            throw err;
          }
          //  log("Added Patient2...");
          callback(null);
        });
      };
      let addPatient3 = (callback) => {
        patientCreator.addPatient(patient3, null, (err, data) => {
          if (err) {
            throw err;
          }
          // log("Added Patient3...");
          callback(null);
        });
      };

      let addPatient4 = (callback) => {
        patientCreator.addPatient(patient4, null, (err, data) => {
          if (err) {
            throw err;
          }
          //  log("Added Patient4...");
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
          loadCreationConfig,
          initConnectionAndSettings,
          initTestEnvironment,
          clearSchema,
          initPatientCreator,
          addPatient1,
          addPatient2,
          addPatient3,
          addPatient4,
        ],
        (err, data) => {
          if (err) {
            throw err;
          }
          done();
        }
      );
    });
  });

  // Ensure that we drop the test schema when all tests are done
  afterAll((done) => {
    testEnvironment.clearSchema((err, results) => {
      // log("Cleaning tables...");
      if (err) {
        console.error("Error in clearing schema tables!");
      }
      connection.close();
      done();
    });
  });

  let run = (
    testDescription: string,
    pholderTableMap: PholderTableMapType,
    configId
  ) => {
    describe(`${testDescription} - totalpcount backend`, () => {
      it("should return the total number of patients matching the filters", (done) => {
        let request = {};
        createPath(request, "patient.attributes.smoker", [
          {
            filter: [
              {
                op: "=",
                value: "no",
              },
            ],
            xaxis: 1,
          },
        ]);

        let t = new Timer();
        ana.processRequest(
          "totalpcount",
          mockReq,
          configId,
          "0",
          "studyId_1",
          request2Bookmark(request),
          "en",
          null,
          connection,
          (err, oResult) => {
            t.stop();
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(oResult.data[0]["patient.attributes.pcount"]).toEqual(2);
            done();
          }
        );
      });
      xit("should not apply min cohort protection for patient list", (done) => {
        let request = { guarded: true };
        createPath(request, "patient.attributes.smoker", [
          {
            filter: [
              {
                op: "=",
                value: "yes",
              },
            ],
          },
        ]);
        request.guarded = true;

        spyOn(settingsObj, "getGuardedPlaceholderMap").and.returnValue(
          pholderTableMap
        );

        let t = new Timer();
        ana.processRequest(
          "totalpcount",
          mockReq,
          `${configId}_min_cohort_size_10`,
          "0",
          "studyId_1",
          request2Bookmark(request),
          "en",
          null,
          connection,
          (err, oResult) => {
            t.stop();
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(oResult.data[0]["patient.attributes.pcount"]).toEqual(1);
            done();
          }
        );
      });
    });
  };

  run(
    "Using InterfaceViews",
    utilsLib.cloneJson(pholderTableMap),
    "mock_config"
  );
  run(
    "Using dw_views",
    utilsLib.cloneJson(dw_views_pholderTableMap),
    "dw_views_config"
  );

  it("should return DBError object when an exception occurs in the Query Engine", (done) => {
    let request = {};
    createPath(request, "patient.attributes.smoker", [
      {
        filter: [
          {
            op: "=",
            value: "no",
          },
        ],
        xaxis: 1,
      },
    ]);

    let t = new Timer();
    let errorPholderTableMap = utilsLib.cloneJson(pholderTableMap);
    errorPholderTableMap["@PATIENT.PATIENT_ID"] = "FAKE_PATIENT_ID";
    ana.processRequest(
      "totalpcount",
      mockReq,
      "mock_config_invalid_ph_2",
      "0",
      "studyId_1",
      request2Bookmark(request),
      "en",
      null,
      connection,
      (err, oResult) => {
        t.stop();
        expect(err.name).toEqual("MRIDBError");
        expect(err.logId).toBeDefined();
        done();
      }
    );
  });
});
