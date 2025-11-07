/**
 * Test suite for the domain_values_service.xsjslib library.
 */

import { cloneJson, createPathInObject } from "@alp/alp-base-utils";
import { TestEnvironment } from "../../testutils/testenvironment";
import { PatientCreator } from "../../testutils/create_patients";
import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import * as async from "async";
import testedLib = require("../../../src/mri/endpoint/domain_values_service");
import { pholderTableMap } from "../../data/global/pholdertablemap";
import { dw_views_pholderTableMap } from "../../data/global/dw_views_pholdertablemap";
import {
  Settings,
  PholderTableMapType,
} from "../../../src/qe/settings/Settings";

let createPath = createPathInObject;
let testSchemaName = process.env.TESTSCHEMA;
let testEnvironment;
let client;
let connection;
let patientCreator;
const mockReq = {
  headers: {
    authorization: "Bearer dummy jwt",
    "x-alp-usersessionclaims": "test",
    "x-source-origin": "test",
  },
};
let testConfig = {
  patient: {
    conditions: {
      acme: {
        interactions: {
          priDiag: {
            defaultFilter: "@INTERACTION.INTERACTION_TYPE = 'ACME_M03'",
            attributes: {
              icd_data_with_text: {
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                referenceFilter: `@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM' AND (LENGTH(@REF.CODE)=3
                                                       OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))`,
                expression: "SUBSTR(@CODE.VALUE,0,3)",
                useRefText: true,
                useRefValue: false,
              },
              icd_ref_with_text: {
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                referenceFilter: `@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM'
                                                       AND (LENGTH(@REF.CODE)=3 OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))`,
                expression: "SUBSTR(@CODE.VALUE,0,3)",
                referenceExpression: "SUBSTR(@REF.CODE,0,3)",
                useRefText: true,
                useRefValue: true,
              },
              icd_data_no_text: {
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                expression: "@CODE.VALUE",
                useRefText: false,
                useRefValue: false,
              },
              icd_ref_no_text: {
                type: "text",
                defaultFilter: "@CODE.ATTRIBUTE = 'ICD'",
                referenceFilter: `@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM'
                                                       AND (LENGTH(@REF.CODE)=3 OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))`,
                expression: "@CODE.VALUE",
                referenceExpression: "SUBSTR(@REF.CODE,0,3)",
                useRefText: false,
                useRefValue: true,
              },
            },
          },
        },
      },
    },
    attributes: {
      smoker: {
        type: "text",
        defaultFilter: "@OBS.OBS_TYPE = 'SMOKER'",
        expression: "@OBS.OBS_CHAR_VAL",
      },
      gender: {
        type: "text",
        expression: "@PATIENT.GENDER",
      },
    },
  },
  chartOptions: {
    minCohortSize: 0,
  },
};

let testConfig_dw_views = {
  patient: {
    conditions: {
      acme: {
        interactions: {
          priDiag: {
            defaultFilter: `@INTERACTION."InteractionTypeValue" = 'ACME_M03'`,
            attributes: {
              icd_data_with_text: {
                type: "text",
                defaultFilter: `@CODE."AttributeValue" = 'ICD'`,
                referenceFilter: `@REF."VocabularyID" = 'ots.ICD.ICD10GM'
                                                       AND (LENGTH(@REF."Code")=3 OR (LENGTH(@REF."Code")=5 AND @REF."Code" LIKE '%.-'))`,
                expression: `SUBSTR(@CODE."Value",0,3)`,
                useRefText: true,
                useRefValue: false,
              },
              icd_ref_with_text: {
                type: "text",
                defaultFilter: `@CODE."AttributeValue" = 'ICD'`,
                referenceFilter: `@REF."VocabularyID" = 'ots.ICD.ICD10GM'
                                                       AND (LENGTH(@REF."Code")=3 OR (LENGTH(@REF."Code")=5 AND @REF."Code" LIKE '%.-'))`,
                expression: `SUBSTR(@CODE."Value",0,3)`,
                referenceExpression: `SUBSTR(@REF."Code",0,3)`,
                useRefText: true,
                useRefValue: true,
              },
              icd_data_no_text: {
                type: "text",
                defaultFilter: `@CODE."AttributeValue" = 'ICD'`,
                expression: `@CODE."Value"`,
                useRefText: false,
                useRefValue: false,
              },
              icd_ref_no_text: {
                type: "text",
                defaultFilter: `@CODE."AttributeValue" = 'ICD'`,
                referenceFilter: `@REF."VocabularyID" = 'ots.ICD.ICD10GM'
                                                       AND (LENGTH(@REF."Code")=3 OR (LENGTH(@REF."Code")=5 AND @REF."Code" LIKE '%.-'))`,
                expression: `@CODE."Value"`,
                referenceExpression: `SUBSTR(@REF."Code",0,3)`,
                useRefText: false,
                useRefValue: true,
              },
            },
          },
        },
      },
    },
    attributes: {
      smoker: {
        type: "text",
        defaultFilter: `@OBS."ObsType" = 'SMOKER'`,
        expression: `@OBS."ObsCharValue"`,
      },
      gender: {
        type: "text",
        expression: `@PATIENT."GenderValue"`,
      },
    },
  },
  chartOptions: {
    minCohortSize: 0,
  },
};

let testInsertConfig = {
  patient: {
    conditions: {
      acme: {
        interactions: {
          priDiag: {
            defaultFilter:
              "@INTERACTION.\"InteractionType.OriginalValue\" = 'ACME_M03'",
            defaultInserts: [
              "@INTERACTION.\"InteractionType.OriginalValue\" = 'ACME_M03'",
            ],
            attributes: {
              icd_data_with_text: {
                type: "text",
                defaultFilter: "@CODE.\"Attribute.OriginalValue\" = 'ICD'",
                referenceFilter: `@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM'
                                                       AND (LENGTH(@REF.CODE)=3 OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))`,
                expression: 'SUBSTR(@CODE."Value.OriginalValue",0,3)',
              },
              icd_ref_with_text: {
                type: "text",
                defaultFilter: "@CODE.\"Attribute.OriginalValue\" = 'ICD'",
                referenceFilter: `@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM'
                                                       AND (LENGTH(@REF.CODE)=3 OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))`,
                expression: 'SUBSTR(@CODE."Value.OriginalValue",0,3)',
                referenceExpression: "@REF.CODE",
              },
              icd_data_no_text: {
                type: "text",
                defaultFilter: "@CODE.\"Attribute.OriginalValue\" = 'ICD'",
                expression: '@CODE."Value.OriginalValue"',
                defaultInserts: [
                  "@CODE.\"Attribute.OriginalValue\" = 'ICD'",
                  '@CODE."Value.OriginalValue" = $$',
                ],
              },
              icd_ref_no_text: {
                type: "text",
                defaultFilter: "@CODE.\"Attribute.OriginalValue\" = 'ICD'",
                referenceFilter: `@REF.VOCABULARY_ID = 'ots.ICD.ICD10GM
                                                       AND (LENGTH(@REF.CODE)=3 OR (LENGTH(@REF.CODE)=5 AND @REF.CODE LIKE '%.-'))`,
                expression: '@CODE."Value.OriginalValue"',
                referenceExpression: "SUBSTR(@REF.CODE,0,3)",
                defaultInserts: [
                  "@CODE.\"Attribute.OriginalValue\" = 'ICD'",
                  '@CODE."Value.OriginalValue" = $$',
                ],
              },
            },
          },
        },
      },
    },
    attributes: {
      smoker: {
        type: "text",
        defaultFilter: "@OBS.\"ObsType\" = 'SMOKER'",
        expression: '@OBS."ObsCharValue"',
        defaultInserts: [
          "@OBS.\"ObsType\" = 'SMOKER'",
          '@OBS."ObsCharValue" = $$',
        ],
      },
      gender: {
        type: "text",
        expression: '@PATIENT."Gender.OriginalValue"',
        defaultInserts: ['@PATIENT."Gender.OriginalValue" = $$'],
      },
    },
  },
};

xdescribe("TEST SUITE TO DEFINE THE BEHAVIOR OF THE DOMAIN VALUES SERVICE ENDPOINT -- Currently disabling this because OTS DB Model has changed", () => {
  beforeAll((done) => {
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
      }

      let initConnection = (callback) => {
        dbConnectionUtil.DBConnectionUtil.getConnection(
          credentials.dialect,
          client,
          testSchemaName,
          (err, data) => {
            if (err) {
              console.error("Error in seting default schema!");
            }
            connection = data;
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
          testInsertConfig,
          (err, results) => {
            if (err) {
              console.error("Error in initializing PatientCreator!");
            }

            callback(null);
          }
        );
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
        [clearSchema, initConnection, initTestEnvironment, initPatientCreator],
        (err, data) => {
          if (err) {
            throw err;
          }
          done();
        }
      );
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
  }, 300000);

  xdescribe("the domain values service: Currently disabling this because OTS DB Model has changed", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(patient1, "patient.attributes.smoker", "yes");
      createPath(patient1, "patient.attributes.gender", "M");
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd_data_no_text",
        "C01"
      );

      let patient2 = {};
      createPath(patient2, "patient.attributes.smoker", "no");
      createPath(patient2, "patient.attributes.gender", "F");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd_data_no_text",
        "C02"
      );

      let addPatient1 = (callback) => {
        patientCreator.addPatient(patient1, null, (err, data) => {
          if (err) {
            throw err;
          }
          callback(null);
        });
      };

      let addPatient2 = (callback) => {
        patientCreator.addPatient(patient2, null, (err, data) => {
          if (err) {
            throw err;
          }
          callback(null);
        });
      };

      let addRefCode1 = (callback) => {
        testEnvironment.insertIntoTable(
          "legacy.ots.services::Entities.Terms",
          {
            VocabularyID: "ots.ICD.ICD10GM",
            Code: "C01",
            Context: "default",
            Language: "de",
            Text: "Zungengrund c01 description",
            Provider: "mri.demodata",
            DWAuditID: -1,
          },
          (err, results) => {
            if (err) {
              console.error(err);
              console.error("Error in adding refCode1!");
            }

            callback(null);
          }
        );
      };

      let addRefCode2 = (callback) => {
        testEnvironment.insertIntoTable(
          "legacy.ots.services::Entities.Terms",
          {
            VocabularyID: "ots.ICD.ICD10GM",
            Code: "C02",
            Context: "default",
            Language: "de",
            Text: "Sonstige und nicht näher bezeichnete Teile der Zunge C02 description",
            Provider: "mri.demodata",
            DWAuditID: -1,
          },
          (err, results) => {
            if (err) {
              console.error(err);
              console.error("Error in adding refCode2!");
            }

            callback(null);
          }
        );
      };

      let addRefCode3 = (callback) => {
        testEnvironment.insertIntoTable(
          "legacy.ots.services::Entities.Terms",
          {
            VocabularyID: "ots.ICD.ICD10GM",
            Code: "C03",
            Context: "default",
            Language: "de",
            Provider: "mri.demodata",
            DWAuditID: -1,
          },
          (err, results) => {
            if (err) {
              console.error(err);
              console.error("Error in adding refCode3!");
            }

            callback(null);
          }
        );
      };

      async.series(
        [addPatient1, addPatient2, addRefCode1, addRefCode2, addRefCode3],
        (err, data) => {
          if (err) {
            throw err;
          }

          done();
        }
      );
    });

    let run = (
      testDescription: string,
      pholderTableMap: PholderTableMapType,
      config
    ) => {
      let currentConfig;

      beforeEach(() => {
        currentConfig = cloneJson(config);
      });

      it("returns the distinct values from data (1)", (done) => {
        let request = {
          attributePath: "patient.attributes.smoker",
          config: currentConfig,
        };

        testedLib.processRequest(
          mockReq,
          request,
          connection,
          (err, result) => {
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(result.data.length).toBe(2);
            expect(result.data[0].value).toBe("no");
            expect(result.data[1].value).toBe("yes");
            done();
          }
        );
      });

      it("returns the distinct values from data (2)", (done) => {
        let request = {
          attributePath: "patient.attributes.gender",
          config: currentConfig,
        };

        testedLib.processRequest(
          mockReq,
          request,
          connection,
          (err, result) => {
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(result.data.length).toBe(2);
            expect(result.data[0].value).toBe("F");
            expect(result.data[1].value).toBe("M");
            done();
          }
        );
      });

      it("returns the distinct values from data (3)", (done) => {
        let request = {
          attributePath:
            "patient.conditions.acme.interactions.priDiag.attributes.icd_data_no_text",
          config: currentConfig,
        };

        testedLib.processRequest(
          mockReq,
          request,
          connection,
          (err, result) => {
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(result.data.length).toBe(2);
            expect(result.data[0].value).toBe("C01");
            expect(result.data[1].value).toBe("C02");
            done();
          }
        );
      });

      it("can return additionnal text for values found in the data", (done) => {
        let request = {
          attributePath:
            "patient.conditions.acme.interactions.priDiag.attributes.icd_data_with_text",
          config: currentConfig,
          useRefText: true,
        };

        testedLib.processRequest(
          mockReq,
          request,
          connection,
          (err, result) => {
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(result.data.length).toBe(2);
            expect(result.data[0].value).toBe("C01");
            expect(result.data[1].value).toBe("C02");
            expect(result.data[0].text).toBe("Zungengrund c01 description");
            expect(result.data[1].text).toBe(
              "Sonstige und nicht näher bezeichnete Teile der Zunge C02 description"
            );
            done();
          }
        );
      });

      it("returns the distinct values from the catalog", (done) => {
        let request = {
          attributePath:
            "patient.conditions.acme.interactions.priDiag.attributes.icd_ref_no_text",
          config: currentConfig,
        };

        testedLib.processRequest(
          mockReq,
          request,
          connection,
          (err, result) => {
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(result.data.length).toBe(2);
            expect(result.data[0].value).toBe("C01");
            expect(result.data[1].value).toBe("C02");
            done();
          }
        );
      });

      it("can return the catalog values with text description", (done) => {
        let request = {
          attributePath:
            "patient.conditions.acme.interactions.priDiag.attributes.icd_ref_with_text",
          config: currentConfig,
          useRefText: true,
        };

        testedLib.processRequest(
          mockReq,
          request,
          connection,
          (err, result) => {
            if (err) {
              console.error(err);
              done.fail(err);
              return;
            }
            expect(result.data.length).toBe(2);
            expect(result.data[0].value).toBe("C01");
            expect(result.data[1].value).toBe("C02");
            expect(result.data[0].text).toBe("Zungengrund c01 description");
            expect(result.data[1].text).toBe(
              "Sonstige und nicht näher bezeichnete Teile der Zunge C02 description"
            );

            done();
          }
        );
      });
    };

    run("Using InterfaceViews", cloneJson(pholderTableMap), testConfig);
    run(
      "Using dw_views",
      cloneJson(dw_views_pholderTableMap),
      testConfig_dw_views
    );
  });
});
