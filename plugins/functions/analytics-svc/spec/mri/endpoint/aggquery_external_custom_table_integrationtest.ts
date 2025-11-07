import {
  createPathInObject as createPath,
  createGuid as createId,
  cloneJson,
} from "@alp/alp-base-utils";
import { request2Bookmark } from "../../testutils/Request2Bookmark";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
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
let mockConfig = JSON.parse(JSON.stringify(mock_config));
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

  xdescribe(`External/Custom Table -- when we have patients with interactions in regular tables (primary tumor diagnoses) as well as custom tables
         (chemotherapies)`, () => {
    let customTableName = "CHEMOTHERAPIES";
    let customTableConfig;

    // Approach to test the use of an external/custom table:
    // - We create a new table "CHEMOTHERAPIES" that holds chemotherapy interactions.
    // - We create six patients (P1-P6), some of them having primary tumor diagnoses (stored in the regular CDW tables),
    //   some having chemotherapies (stored in the custom table), some having both. (see Venn Diagram below)
    //    ____________
    //   | "PriDiag"  |
    //   |        ____|_____________
    //   |   P1  | P2 |  "chemo"    |
    //   |       | P3 |  P4  P5  P6 |
    //   |       |____|_____________|
    //   |            |
    //   |____________|
    // - We use the custom table in the config to override both the INTERACTIONS as well as the INTERACTION_DETAILS
    //   table for chemotherapies. (Custom tables can be specified for either "INTERACTIONS" or for "INTERACTION_DETAILS" tables,
    //   or for both. The approach here is to use the same custom table for both.)
    // - We test whether we can query for patients
    //   1. having primary tumor diagnoses (regular tables)
    //   2. having both, primary tumor diagnoses (regular tables) and chemotherapies (custom table)
    //   3. having only primary tumor diagnoses (regular tables), excluding patients with chemotherapies (custom table)
    //   4. having only chemotherapies (custom table), excluding patients with primary tumor diagnoses (regular tables)
    //   5. having chemotherapies (custom table)
    //   and more...

    beforeAll((done) => {
      let createCustomTable = (callback) => {
        let createCustomTableSql =
          'CREATE COLUMN TABLE "' +
          testSchemaName +
          '"."' +
          customTableName +
          '"(\
                        PATIENT_ID           VARBINARY(32)        not null,\
                        INTERACTION_ID       NVARCHAR(100)        not null,\
                        CONDITION_ID         VARBINARY(32),\
                        CHEMO_PROT           NVARCHAR(100)\
                    )';
        testEnvironment.executeSqlCommand(createCustomTableSql, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Created custom table...");
          callback(null);
        });
      };

      let registerCustomTable = (callback) => {
        testEnvironment.registerTable(customTableName, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Registered custom table...");
          callback(null);
        });
      };

      // define helper function to add chemotherapy to custom table for a patient
      function addCustomChemo(patientId, condId, protocol) {
        let DWIDPatient = patientId.replace(/-/g, "").substr(0, 32); // TODO: Generate smaller GUID instead
        let DWIDCondition = condId.replace(/-/g, "").substr(0, 32); // TODO: Generate smaller GUID instead
        let conditionId = createId().replace(/-/g, "").substr(0, 32);

        return (
          "INSERT INTO " +
          testSchemaName +
          "." +
          customTableName +
          " VALUES(\
                       '" +
          DWIDPatient +
          "', \
                       '" +
          createId() +
          "', \
                       '" +
          DWIDCondition +
          "', \
                       '" +
          protocol +
          "'\
                   )"
        );
      }

      // modify mock config to use custom table for chemotherapies
      customTableConfig = cloneJson(mockConfig);
      let chemoConfig =
        customTableConfig.patient.conditions.acme.interactions.chemo;
      chemoConfig.defaultFilter = "TRUE";
      chemoConfig.from = {
        "@INTERACTION": testSchemaName + "." + customTableName,
      };
      chemoConfig.attributes.chemo_prot.defaultFilter = "TRUE";
      chemoConfig.attributes.chemo_prot.from = {
        "@CODE": testSchemaName + "." + customTableName,
      };
      chemoConfig.attributes.chemo_prot.expression = "@CODE.CHEMO_PROT";

      // create patients
      let patient1 = {};
      createPath(patient1, "patient.attributes.firstname", "P1");
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C1"
      );
      let condId1 = createId();
      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, condId1, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient1...");
          callback(null);
        });
      };

      let patient2 = {};
      createPath(patient2, "patient.attributes.firstname", "P2");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C2"
      );
      let condId2 = createId();
      let addPatient2 = (callback) => {
        patientCreator.addPatient(patient2, condId2, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient2...");
          let patientId2 = data;
          let sql = addCustomChemo(patientId2, condId2, "CUSTOM_PROTOCOL1");
          testEnvironment.executeSqlCommand(sql, (err, data) => {
            if (err) {
              throw err;
            }
            //log("Created custom chemo for Patient2...");
            callback(null);
          });
        });
      };

      let patient3 = {};
      createPath(patient3, "patient.attributes.firstname", "P3");
      createPath(
        patient3,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C3"
      );
      let condId3 = createId();
      let addPatient3 = (callback) => {
        patientCreator.addPatient(patient3, condId3, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient3...");
          let patientId3 = data;
          let sql = addCustomChemo(patientId3, condId3, "CUSTOM_PROTOCOL1");
          testEnvironment.executeSqlCommand(sql, (err, data) => {
            if (err) {
              throw err;
            }
            //log("Created custom chemo for Patient3...");
            callback(null);
          });
        });
      };

      let patient4 = {};
      createPath(patient4, "patient.attributes.firstname", "P4");
      let condId4 = createId();
      let addPatient4 = (callback) => {
        patientCreator.addPatient(patient4, condId4, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient4...");
          let patientId4 = data;
          let sql = addCustomChemo(patientId4, condId4, "CUSTOM_PROTOCOL2");
          testEnvironment.executeSqlCommand(sql, (err, data) => {
            if (err) {
              throw err;
            }
            //log("Created custom chemo for Patient4...");
            callback(null);
          });
        });
      };

      let patient5 = {};
      createPath(patient5, "patient.attributes.firstname", "P5");
      let condId5 = createId();
      let addPatient5 = (callback) => {
        patientCreator.addPatient(patient5, condId5, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient5...");
          let patientId5 = data;
          let sql = addCustomChemo(patientId5, condId5, "CUSTOM_PROTOCOL2");
          testEnvironment.executeSqlCommand(sql, (err, data) => {
            if (err) {
              throw err;
            }
            //log("Created custom chemo for Patient5...");
            callback(null);
          });
        });
      };

      let patient6 = {};
      createPath(patient6, "patient.attributes.firstname", "P6");
      let condId6 = createId();
      let addPatient6 = (callback) => {
        patientCreator.addPatient(patient6, condId6, (err, data) => {
          if (err) {
            throw err;
          }
          //log("Added Patient6...");
          let patientId6 = data;
          let sql = addCustomChemo(patientId6, condId6, "CUSTOM_PROTOCOL2");
          testEnvironment.executeSqlCommand(sql, (err, data) => {
            if (err) {
              throw err;
            }
            //log("Created custom chemo for Patient6...");
            callback(null);
          });
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
          createCustomTable,
          registerCustomTable,
          addPatient1,
          addPatient2,
          addPatient3,
          addPatient4,
          addPatient5,
          addPatient6,
        ],
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
    // 1.
    it("the aggquery service should be able to query for patients having primary tumor diagnoses (regular tables)", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.firstname", [
        {
          xaxis: 1,
        },
      ]);

      // The empty filter card for primary tumor diagnoses
      createPath(
        request,
        "patient.conditions.acme.interactions.priDiag.1.attributes",
        {}
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
              "patient.attributes.firstname": ["P1", "P2", "P3"],
              "patient.attributes.pcount": [1, 1, 1],
            },
            null
          );
          done();
        }
      );
    });

    // 2.
    it(`the aggquery service should be able to query for patients having both, primary tumor diagnoses (regular tables) and chemotherapies
             (custom table)`, (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.firstname", [
        {
          xaxis: 1,
        },
      ]);

      // The empty filter card for chemotherapies
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.attributes",
        {}
      );
      // The empty filter card for primary tumor diagnoses
      createPath(
        request,
        "patient.conditions.acme.interactions.priDiag.1.attributes",
        {}
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
              "patient.attributes.firstname": ["P2", "P3"],
              "patient.attributes.pcount": [1, 1],
            },
            null
          );
          done();
        }
      );
    });

    // 3.
    it(`the aggquery service should be able to query for patients having only primary tumor diagnoses (regular tables), excluding patients with
             chemotherapies (custom table)`, (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.firstname", [
        {
          xaxis: 1,
        },
      ]);

      // The empty and excluded filter card for chemotherapies
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.attributes",
        {}
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.exclude",
        true
      );
      // The empty filter card for primary tumor diagnoses
      createPath(
        request,
        "patient.conditions.acme.interactions.priDiag.1.attributes",
        {}
      );

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
              "patient.attributes.firstname": ["P1"],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    // 4.
    it(`the aggquery service should be able to query for patients having only chemotherapies (custom table), excluding patients with
             primary tumor diagnoses (regular tables)`, (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.firstname", [
        {
          xaxis: 1,
        },
      ]);

      // The empty filter card for chemotherapies
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.attributes",
        {}
      );
      // The empty and excluded filter card for primary tumor diagnoses
      createPath(
        request,
        "patient.conditions.acme.interactions.priDiag.1.attributes",
        {}
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.priDiag.1.exclude",
        true
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
              "patient.attributes.firstname": ["P4", "P5", "P6"],
              "patient.attributes.pcount": [1, 1, 1],
            },
            null
          );
          done();
        }
      );
    });

    // 5.
    it("the aggquery service should be able to query for patients having chemotherapies (custom table)", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.firstname", [
        {
          xaxis: 1,
        },
      ]);

      // The empty filter card for chemotherapies
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.attributes",
        {}
      );

      let t = new Timer();
      let expectedTotalPCount = 5;
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
              "patient.attributes.firstname": ["P2", "P3", "P4", "P5", "P6"],
              "patient.attributes.pcount": [1, 1, 1, 1, 1],
            },
            null
          );
          done();
        }
      );
    });

    it(`the aggquery service should be able to query for patients having chemotherapies, constrained on specific attribute values (custom table)`, (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [
          {
            filter: [
              {
                op: "=",
                value: "CUSTOM_PROTOCOL1",
              },
            ],
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
        request2Bookmark(request),
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
                ["CUSTOM_PROTOCOL1"],
              "patient.attributes.pcount": [2],
            },
            null
          );
          done();
        }
      );
    });

    it("the aggquery service should be able to query for patients's chemotherapy attribute values (custom table)", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [
          {
            xaxis: 1,
          },
        ]
      );

      let t = new Timer();
      let expectedTotalPCount = 5;
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
                ["CUSTOM_PROTOCOL1", "CUSTOM_PROTOCOL2"],
              "patient.attributes.pcount": [2, 3],
            },
            null
          );
          done();
        }
      );
    });

    it("the aggquery service should be able to query for all patients not(!) having chemotherapies (custom table)", (done) => {
      let request = {};
      createPath(request, "patient.attributes.pcount", [
        {
          yaxis: 1,
        },
      ]);
      createPath(request, "patient.attributes.firstname", [
        {
          xaxis: 1,
        },
      ]);

      // The empty and excluded filter card for chemotherapies
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.attributes",
        {}
      );
      createPath(
        request,
        "patient.conditions.acme.interactions.chemo.1.exclude",
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
        request2Bookmark(request),
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
              "patient.attributes.firstname": ["P1"],
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
