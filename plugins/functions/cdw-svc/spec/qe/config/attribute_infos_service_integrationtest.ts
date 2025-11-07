import { User } from "@alp/alp-base-utils";
import { createConnection } from "../../testutils/connection";
import { createConnection as createConfigConnection } from "../settings/utils/connection";
import { CDWServicesFacade } from "../../../src/qe/config/CDWServicesFacade";
import { FfhQeConfig } from "../../../src/qe/config/config";
import { AssignmentProxy } from "../../../src/AssignmentProxy";
import { Settings } from "../../../src/qe/settings/Settings";
import { cloneJson } from "../../../src/utils/utils";
import { DisableLogger } from "../../../src/utils/Logger";
import { MRI3_ADVANCED_SETTINGS } from "../../data/cdw/configs";

DisableLogger();

let connection;
let analyticsConnection;
let testedLib: CDWServicesFacade;
const request = {
  attributePath:
    "patient.conditions.acme.interactions.priDiag.attributes.icd_10",
  exprToUse: "expression",
  useRefText: false,
  config: {
    patient: {
      conditions: {
        acme: {
          interactions: {
            priDiag: {
              name: [
                {
                  lang: "",
                  value: "Primary Tumor Diagnosis",
                },
                {
                  lang: "en",
                  value: "Primary Tumor Diagnosis",
                },
                {
                  lang: "de",
                  value: "Primärtumor-Diagnose",
                },
                {
                  lang: "fr",
                  value: "Diagnostic Primaire",
                },
              ],
              defaultFilter: `@INTERACTION."InteractionTypeValue" = 'ACME_M03'`,
              defaultFilterKey: "ACME_M03",
              order: 4,
              parentInteraction: [],
              parentInteractionLabel: "parent",
              attributes: {
                icd_10: {
                  name: [
                    {
                      lang: "",
                      value: "ICD-10-CM Code",
                    },
                    {
                      lang: "en",
                      value: "ICD-10-CM Code",
                    },
                    {
                      lang: "de",
                      value: "ICD-10-CM-Code",
                    },
                    {
                      lang: "fr",
                      value: "Code CIM-10",
                    },
                  ],
                  type: "text",
                  expression: `LEFT(@CODE."Value",3)`,
                  defaultFilter: `@CODE."AttributeValue" = 'ICD_10'`,
                  // tslint:disable-next-line:max-line-length
                  referenceFilter: `@REF."VOCABULARY_ID" = 'ots.ICD.ICD10GM' AND (LENGTH(@REF."CONCEPT_ID")=3 OR (LENGTH(@REF."CONCEPT_ID")=5 AND @REF."CONCEPT_ID" LIKE '%.-'))`,
                  referenceExpression: `LEFT(@REF."CONCEPT_ID",3)`,
                  order: 1,
                },
              },
            },
          },
          name: "acme",
        },
      },
      interactions: {},
      attributes: {},
    },
    mapping: {},
    censor: {},
    advancedSettings: {
      ...MRI3_ADVANCED_SETTINGS,
    },
  },
};

describe("Attributes infos service integration test", () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
  beforeAll(async () => {
    createConfigConnection((err, connection) => {
      analyticsConnection = await createConnection("duckdb");
      const ffhQeConfig = new FfhQeConfig(
        connection,
        new AssignmentProxy([]),
        new Settings(),
        new User("TEST_USER")
      );
      testedLib = new CDWServicesFacade(analyticsConnection, ffhQeConfig);
    });
  });

  afterAll(function () {
    connection.close();
    analyticsConnection.close();
  });

  describe("Test Attribute", () => {
    it("returns a data array object with a single element", (done) => {
      testedLib.invokeService(
        "attribute_infos_service",
        request,
        true,
        (err, response) => {
          expect(response.data.length).toEqual(1);
          done();
        }
      );
    });

    it("throws a DBError object when passing an SQL expression with invalid syntax", (done) => {
      const invalidRequest = cloneJson(request);
      invalidRequest.config.patient.conditions.acme.interactions.priDiag.attributes.icd_10.expression =
        "LEFT(@REF.CODE2,3)";
      testedLib.invokeService(
        "attribute_infos_service",
        invalidRequest,
        true,
        (err, response) => {
          expect(err.name).toEqual("MRIDBError");
          expect(err.logId).toBeDefined();
          done();
        }
      );
    });
  });

  describe("Test Catalog Attribute", () => {
    const refExpressionRequest = cloneJson(request);
    refExpressionRequest.exprToUse = "referenceExpression";

    it("returns a data array object with a single element", (done) => {
      testedLib.invokeService(
        "attribute_infos_service",
        refExpressionRequest,
        true,
        (err, response) => {
          expect(err).toBeNull();
          expect(response.data.length).toEqual(1);
          done();
        }
      );
    });

    it("throws a DBError object when passing an SQL expression with invalid syntax", (done) => {
      const invalidRequest = cloneJson(refExpressionRequest);
      invalidRequest.config.patient.conditions.acme.interactions.priDiag.attributes.icd_10.referenceExpression =
        "LEFT(@REF.CODE2,3)";
      testedLib.invokeService(
        "attribute_infos_service",
        invalidRequest,
        true,
        (err, response) => {
          expect(err.name).toEqual("MRIDBError");
          expect(err.logId).toBeDefined();
          done();
        }
      );
    });
  });
});
