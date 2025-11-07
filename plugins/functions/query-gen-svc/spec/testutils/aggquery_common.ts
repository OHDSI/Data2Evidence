/**
 * Common objects to be used in aggquery integration tests. This is to break
 * the aggquery integration tests to smaller files
 */

import { assert, cloneJson } from "@alp/alp-base-utils";
import { TestEnvironment } from "./testenvironment";
import { PatientCreator } from "./create_patients";
import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import * as hdb from "hdb";
import * as fs from "fs-extra";
import * as async from "async";
import { mock_config } from "../data/pa/mock_config";
import { testsLogger } from "./logger";
import { DisableLogger } from "../../src/utils/Logger";
DisableLogger();

export let testSuiteName =
  "TEST SUITE TO DEFINE THE BEHAVIOR OF THE AGGQUERY ENDPOINT --";
export let testSchemaName = process.env.TESTSCHEMA;
export const DEFAULT_TIMEOUT_INTERVAL = 600000;
export { pholderTableMap } from "../data/global/pholdertablemap";

export class Timer {
  public tstart: Date;
  public tstop: Date;
  constructor() {
    this.tstart = new Date();
  }
  public stop() {
    this.tstop = new Date();
  }
}

export function removePid(res) {
  res.data.forEach((resDatum, i) => {
    delete resDatum.pid;
    delete resDatum.totalpcount;
  });
}

export function testResult(res, obj, accuracy) {
  accuracy = accuracy || 0.1;

  let tmp;

  let keys = Object.keys(obj);
  // assert(keys.length > 0, "cannot compare results")
  let objLength = obj[keys[0]].length;
  keys.forEach((key) => {
    assert(
      obj[key].length === objLength,
      "invalid expected result, the result arrays must have the same length for every key"
    );
  });
  expect(res.data.length).toEqual(objLength);

  // Get all numerical measures. For numerical measures we test approximate equality.
  let numericalMeasures = {};
  res.measures.forEach((measure) => {
    if (measure.type === "num") {
      numericalMeasures[measure.id] = 1;
    }
  });

  res.data.forEach((resDatum, i) => {
    tmp = {};
    keys.forEach((key) => {
      tmp[key] = obj[key][i];
    });

    keys.forEach((key) => {
      if (key in numericalMeasures) {
        expect(Math.abs(resDatum[key] - tmp[key])).toBeLessThan(accuracy);
        //console.log("Got: " + JSON.stringify(resDatum, null, 2) + " Expected (within accuacy): " + JSON.stringify(tmp));
      } else {
        expect(resDatum[key]).toEqual(tmp[key]);
        //console.log("Got: " + resDatum[key] + " Expected: " + tmp[key]);
      }
    });
  });
}

export async function aggquery_setup(
  done: (client, mockConfig, testEnvironment, patientCreator) => void
) {
  let testEnvironment;

  let creationConfig;
  let patientCreator;
  let connection;
  const credentials = {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
    user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
    password: process.env.TESTSYSTEMPW ? process.env.TESTSYSTEMPW : "Toor1234",
    dialect: "hana",
  };

  await dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
    if (err) {
      throw err;
    }

    let client = c;
    if (!client) {
      testsLogger("client undefined");
    }

    let loadCreationConfig = (cb) => {
      let path = "spec/data/acme_creation_config.json";
      //log("path: " + path);
      fs.readJson(path, (err, data) => {
        if (err) {
          console.error("CreationConfig file not found!");
          throw err;
        }
        creationConfig = data;
        cb(null);
      });
    };

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
          testsLogger("Set default schema to " + testSchemaName);
          callback(null);
        }
      );
    };

    let initTestEnvironment = (cb) => {
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
          cb(null);
        }
      );
    };

    let initPatientCreator = (cb) => {
      patientCreator = new PatientCreator(
        credentials.dialect,
        testSchemaName,
        client,
        creationConfig,
        (err, results) => {
          if (err) {
            console.error("Error in initializing PatientCreator!");
          }
          cb(null);
        }
      );
    };

    async.series(
      [
        loadCreationConfig,
        initConnection,
        initTestEnvironment,
        initPatientCreator,
      ],
      (err, data) => {
        if (err) {
          throw err;
        }
        done(
          connection,
          cloneJson(mock_config),
          testEnvironment,
          patientCreator
        );
      }
    );
  });
}
