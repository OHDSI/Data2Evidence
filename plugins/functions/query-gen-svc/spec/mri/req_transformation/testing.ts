/**
 * Used for testing the fast query builder
 */

import * as fast from "../../../src/req_transformation/fast";
import * as sql_gen from "../../../src/qe/sql_generator2/AstFactory";
import * as qconfig from "../../../src/qe/qe_config_interface/Config";
import { Connection as connLib } from "@alp/alp-base-utils";
import ConnectionInterface = connLib.ConnectionInterface;
import CallBackInterface = connLib.CallBackInterface;
import * as utilsLib from "@alp/alp-base-utils";
import { testsLogger } from "../../testutils/logger";
import { dw_views_pholderTableMap } from "../../data/global/dw_views_pholdertablemap";
import { pholderTableMap } from "../../data/global/pholdertablemap";
import { dw_views_config } from "../../../spec/data/pa/dw_views_config";
import { mock_config } from "../../../spec/data/pa/mock_config";

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
                icd_10: [{ yaxis: 6, aggregation: "string_agg" }],
                icd_10_smoker: [{ yaxis: 7, aggregation: "string_agg" }],
                age: [{ yaxis: 5, aggregation: "string_agg" }],
              },
            },
          },
        },
      },
    },
  },
  configData: { configId: "PatientAnalyticsInitialCI", configVersion: "A" },
  guarded: true,
  limit: 0,
  offset: 0,
};

let request2 = {
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
                icd: [{ yaxis: 6, aggregation: "string_agg" }],
                icd_smoker: [{ yaxis: 7, aggregation: "string_agg" }],
                age: [{ yaxis: 5, aggregation: "string_agg" }],
              },
            },
          },
        },
      },
    },
  },
  configData: { configId: "PatientAnalyticsInitialCI", configVersion: "A" },
  guarded: true,
  limit: 0,
  offset: 0,
};

let boxplotReq = {
  patient: {
    isFiltercard: true,
    attributes: {
      smoker: [{}],
      gender: [{ xaxis: 1 }],
      biomarker: [{}],
      packYearsSmoked: [{ yaxis: 1 }],
    },
    conditions: {
      acme: {
        interactions: {
          priDiag: {
            1: { isFiltercard: true, attributes: { icd_10: [{}], age: [{}] } },
          },
        },
      },
    },
  },
  configData: { configId: "PatientAnalyticsInitialCI", configVersion: "A" },
};
let b = new fast.Fast("boxplot", boxplotReq, mock_config, pholderTableMap);
let f = new fast.Fast("patientdetail", request2, mock_config, pholderTableMap);
let confHelper = new qconfig.Config(mock_config, pholderTableMap);
let astFactory = sql_gen.getAstFactory(confHelper);
let nql = astFactory.astElementFactory(
  JSON.parse(JSON.stringify(f.statement.statement)),
  "statement",
  "statement",
  null
);
nql.generateSQL();

testsLogger("done");
