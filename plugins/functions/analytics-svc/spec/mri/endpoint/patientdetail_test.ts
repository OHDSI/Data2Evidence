/**
 * Test suite for the patient detail processor
 */
import { PatientListEndpoint } from "../../../src/mri/endpoint/PatientListEndpoint";
import { createPathInObject as createPath } from "@alp/alp-base-utils";
import * as async from "async";
import * as ana from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { mock_config } from "../../data/pa/mock_config";
import {
  DEFAULT_TIMEOUT_INTERVAL,
  removePid,
  Timer,
  pholderTableMap,
  aggquery_setup,
} from "../../testutils/aggquery_common";
import { BackendConfigWithCDMConfigMetaDataType } from "../../../src/types";
const mockReq = {
  headers: {
    authorization: "Bearer dummy jwt",
    "x-alp-usersessionclaims": "test",
    "x-source-origin": "test",
  },
};
describe("--- TESTS SUITE FOR PATIENT DETAIL PROCESSOR ---", () => {
  let testEnvironment;
  let connection;
  let patientCreator;
  let mockConfig = mock_config;
  let settingsObj;
  let configWithCDMConfigMetaData: BackendConfigWithCDMConfigMetaDataType;

  beforeAll((done) => {
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
  // TODO: SG-1221
  describe("processRequest() ", () => {
    beforeAll((done) => {
      let patient1 = {};
      createPath(patient1, "patient.attributes.gender", "M");
      createPath(patient1, "patient.attributes.firstname", "Mad");
      createPath(patient1, "patient.attributes.lastname", "Max");
      createPath(patient1, "patient.attributes.dob", "10.06.1957");
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "26.08.2015"
      );
      createPath(
        patient1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C00"
      );

      let patient2 = {};
      createPath(patient2, "patient.attributes.gender", "M");
      createPath(patient2, "patient.attributes.firstname", "Nathan");
      createPath(patient2, "patient.attributes.lastname", "Drake");
      createPath(patient2, "patient.attributes.dob", "19.06.1960");
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1._start",
        "26.08.2009"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        "C01"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.2._start",
        "26.08.2010"
      );
      createPath(
        patient2,
        "patient.conditions.acme.interactions.priDiag.2.attributes.icd",
        "C02"
      );

      let addPatient1 = (callback) => {
        patientCreator.addPatient(
          patient1,
          null,
          (err, patientId, interactionMap) => {
            if (err) {
              throw err;
            }
            callback(null);
          }
        );
      };

      let addPatient2 = (callback) => {
        patientCreator.addPatient(
          patient2,
          null,
          (err, patientId, interactionMap) => {
            if (err) {
              throw err;
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
      async.series([clearSchema, addPatient1, addPatient2], (err, data) => {
        if (err) {
          throw err;
        }
        done();
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
    });

    it("(1) should return all distinct patients (default patient list query)", (done) => {
      //The format of the ifrbackend which is used in the patientlist endpoint is not possible to be achieved
      //using the "request2IFR" format function. hence hardcoding the request
      /*
             let request1 = {};
             createPath(request1, "patient.attributes.dob", [{
                 yaxis: 4,
                 aggregation: "string_agg",
                 isFiltercard: true,
             }]);
             createPath(request1, "patient.attributes.firstname", [{
                 yaxis: 3,
                 aggregation: "string_agg",
                 isFiltercard: true,
             }]);
             createPath(request1, "patient.attributes.lastname", [{
                 yaxis: 2,
                 aggregation: "string_agg",
                 isFiltercard: true,
             }]);
             createPath(request1, "patient.attributes.gender", [{
                 yaxis: 1,
                 aggregation: "string_agg",
                 isFiltercard: true,
             }]);
             createPath(request1, "patient.conditions.acme.interactions.priDiag.10000.attributes.age", [{
                 yaxis: 5,
                 aggregation: "string_agg",
                 isFiltercard: false,
             }]);
             createPath(request1, "patient.conditions.acme.interactions.priDiag.10000.attributes.icd", [{
                 yaxis: 6,
                 aggregation: "string_agg",
                 isFiltercard: false,
             }]);
             createPath(request1, "patient.isFilterCard", true); */

      const getGuardedPlaceholderMap = jest.fn();
      getGuardedPlaceholderMap.mockReturnValue(pholderTableMap);

      let t = new Timer();

      const ifrRequest = {
        axes: [
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.pid",
            instanceID: "patient",
            isFiltercard: true,
            seq: 0,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.dob",
            instanceID: "patient",
            isFiltercard: true,
            seq: 1,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.firstname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 2,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.lastname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 3,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.gender",
            instanceID: "patient",
            isFiltercard: true,
            seq: 4,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 5,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.age",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 6,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.icd",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 7,
          },
        ],
        cards: {
          content: [
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath: "patient.attributes.dob",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.dob",
                      },
                      {
                        _configPath: "patient.attributes.firstname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.firstname",
                      },
                      {
                        _configPath: "patient.attributes.lastname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.lastname",
                      },
                      {
                        _configPath: "patient.attributes.gender",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.gender",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient",
                  _inactive: false,
                  _instanceID: "patient",
                  _instanceNumber: 0,
                  _name: "",
                  op: "AND",
                },
              ],
              op: "OR",
            },
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.icd",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
                      },
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.age",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.age",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient.conditions.acme.interactions.priDiag",
                  _inactive: false,
                  _instanceID: "patient.conditions.acme.interactions.priDiag.1",
                  _instanceNumber: 1,
                  _name: "Primary Tumor Diagnosis A",
                  op: "AND",
                },
              ],
              op: "OR",
            },
          ],
          op: "AND",
        },
        configData: {
          configId: "No config id",
          configVersion: "No config version",
        },
      };

      ana.processRequest(
        "patientdetail",
        mockReq,
        "configWithCDMConfigMetaData",
        "0",
        "datasetId_1",
        ifrRequest,
        "en",
        null,
        connection,
        (err, res1) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }

          removePid(res1);
          expect(res1.data.length).toEqual(3);
          if (res1.data && res1.data.length > 0) {
            res1.data.sort((a, b) => {
              return a[
                `patient.conditions.acme.interactions.priDiag.10000.attributes.icd`
              ][0].localeCompare(
                b[
                  `patient.conditions.acme.interactions.priDiag.10000.attributes.icd`
                ][0]
              );
            });

            res1.data.forEach((el) => {
              delete el[`patient.attributes.pid`];
              delete el[
                `patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id`
              ];
            });
          }

          expect(res1.totalPatientCount).toEqual(2);
          expect(res1.data).toEqual([
            {
              "patient.attributes.dob": ["1957-06-10T00:00:00"],
              "patient.attributes.firstname": ["Max"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C00"],
            },
            {
              "patient.attributes.dob": ["1960-06-19T00:00:00"],
              "patient.attributes.firstname": ["Drake"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C01"],
            },
            {
              "patient.attributes.dob": ["1960-06-19T00:00:00"],
              "patient.attributes.firstname": ["Drake"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C02"],
            },
          ]);
          done();
        }
      );
    });

    it("(2) should return all patients with specified year filter", (done) => {
      //The format of the ifrbackend which is used in the patientlist endpoint is not possible to be achieved
      //using the "request2IFR" format function. hence hardcoding the request
      /*    let request1 = {};
                 createPath(request1, "patient.attributes.dob", [{
                     yaxis: 4,
                     aggregation: "string_agg",
                 }]);
                 createPath(request1, "patient.attributes.firstname", [{
                     yaxis: 3,
                     aggregation: "string_agg",
                 }]);
                 createPath(request1, "patient.attributes.lastname", [{
                     yaxis: 2,
                     aggregation: "string_agg",
                 }]);
                 createPath(request1, "patient.attributes.gender", [{
                     yaxis: 1,
                     aggregation: "string_agg",
                 }]);
                 createPath(request1, "patient.conditions.acme.interactions.priDiag.10000.attributes.age", [{
                     yaxis: 5,
                     aggregation: "string_agg",
                 }]);
                 createPath(request1, "patient.conditions.acme.interactions.priDiag.10000.attributes.icd", [{
                     yaxis: 6,
                     aggregation: "string_agg",
                 }]);
                 createPath(request1, "patient.conditions.acme.interactions.priDiag.1.attributes.calYear", [{
                     filter: [{
                         op: ">",
                         value: 2012,
                     }],
                 }]);
                 createPath(request1, "patient.isFilterCard", true);
                 createPath(request1, "patient.conditions.acme.interactions.priDiag.1.isFiltercard", true); */

      const getGuardedPlaceholderMap = jest.fn();
      getGuardedPlaceholderMap.mockReturnValue(pholderTableMap);

      const ifrRequest = {
        axes: [
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.pid",
            instanceID: "patient",
            isFiltercard: true,
            seq: 0,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.dob",
            instanceID: "patient",
            isFiltercard: true,
            seq: 1,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.firstname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 2,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.lastname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 3,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.gender",
            instanceID: "patient",
            isFiltercard: true,
            seq: 4,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 5,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.age",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 6,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.icd",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 7,
          },
        ],
        cards: {
          content: [
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath: "patient.attributes.dob",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.dob",
                      },
                      {
                        _configPath: "patient.attributes.firstname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.firstname",
                      },
                      {
                        _configPath: "patient.attributes.lastname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.lastname",
                      },
                      {
                        _configPath: "patient.attributes.gender",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.gender",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient",
                  _inactive: false,
                  _instanceID: "patient",
                  _instanceNumber: 0,
                  _name: "",
                  op: "AND",
                },
              ],
              op: "OR",
            },
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.icd",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
                      },
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.age",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.age",
                      },
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.calYear",
                        _constraints: {
                          content: [
                            {
                              _operator: ">",
                              _value: "2012",
                            },
                          ],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.calYear",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient.conditions.acme.interactions.priDiag",
                  _inactive: false,
                  _instanceID: "patient.conditions.acme.interactions.priDiag.1",
                  _instanceNumber: 1,
                  _name: "Primary Tumor Diagnosis A",
                  op: "AND",
                },
              ],
              op: "OR",
            },
          ],
          op: "AND",
        },
        configData: {
          configId: "No config id",
          configVersion: "No config version",
        },
      };

      let t = new Timer();
      ana.processRequest(
        "patientdetail",
        mockReq,
        "configWithCDMConfigMetaData",
        "0",
        "datasetId_1",
        ifrRequest,
        "en",
        null,
        connection,
        (err, res1) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          removePid(res1);

          expect(res1.totalPatientCount).toEqual(1);
          expect(res1.data.length).toEqual(1);
          if (res1.data && res1.data.length > 0) {
            res1.data.forEach((el) => {
              delete el[`patient.attributes.pid`];
              delete el[
                `patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id`
              ];
            });
          }
          expect(res1.data).toEqual([
            {
              "patient.attributes.dob": ["1957-06-10T00:00:00"],
              "patient.attributes.firstname": ["Max"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C00"],
            },
          ]);

          done();
        }
      );
    });

    it("(3) should return all patients with specified icd filter", (done) => {
      let request1 = {};

      createPath(request1, "patient.attributes.dob", [
        {
          yaxis: 4,
          aggregation: "string_agg",
        },
      ]);

      createPath(request1, "patient.attributes.firstname", [
        {
          yaxis: 3,
          aggregation: "string_agg",
        },
      ]);

      createPath(request1, "patient.attributes.lastname", [
        {
          yaxis: 2,
          aggregation: "string_agg",
        },
      ]);

      createPath(request1, "patient.attributes.gender", [
        {
          yaxis: 1,
          aggregation: "string_agg",
        },
      ]);

      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.age",
        [
          {
            yaxis: 5,
            aggregation: "string_agg",
          },
        ]
      );

      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
        [
          {
            filter: [
              {
                op: "=",
                value: "C00",
              },
            ],
            yaxis: 6,
            aggregation: "string_agg",
          },
        ]
      );

      createPath(request1, "patient.isFilterCard", true);
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.isFiltercard",
        true
      );

      const getGuardedPlaceholderMap = jest.fn();
      getGuardedPlaceholderMap.mockReturnValue(pholderTableMap);

      const ifrRequest = {
        axes: [
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.pid",
            instanceID: "patient",
            isFiltercard: true,
            seq: 0,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.dob",
            instanceID: "patient",
            isFiltercard: true,
            seq: 1,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.firstname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 2,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.lastname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 3,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.gender",
            instanceID: "patient",
            isFiltercard: true,
            seq: 4,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 5,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.age",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 6,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.icd",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 7,
          },
        ],
        cards: {
          content: [
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath: "patient.attributes.dob",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.dob",
                      },
                      {
                        _configPath: "patient.attributes.firstname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.firstname",
                      },
                      {
                        _configPath: "patient.attributes.lastname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.lastname",
                      },
                      {
                        _configPath: "patient.attributes.gender",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.gender",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient",
                  _inactive: false,
                  _instanceID: "patient",
                  _instanceNumber: 0,
                  _name: "",
                  op: "AND",
                },
              ],
              op: "OR",
            },
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.icd",
                        _constraints: {
                          content: [
                            {
                              _operator: "=",
                              _value: "C00",
                            },
                          ],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
                      },
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.age",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.age",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient.conditions.acme.interactions.priDiag",
                  _inactive: false,
                  _instanceID: "patient.conditions.acme.interactions.priDiag.1",
                  _instanceNumber: 1,
                  _name: "Primary Tumor Diagnosis A",
                  op: "AND",
                },
              ],
              op: "OR",
            },
          ],
          op: "AND",
        },
        configData: {
          configId: "No config id",
          configVersion: "No config version",
        },
      };

      let t = new Timer();
      ana.processRequest(
        "patientdetail",
        mockReq,
        "configWithCDMConfigMetaData",
        "0",
        "datasetId_1",
        ifrRequest,
        "en",
        null,
        connection,
        (err, res1) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          removePid(res1);
          expect(res1.totalPatientCount).toEqual(1);
          expect(res1.data.length).toEqual(1);
          if (res1.data && res1.data.length > 0) {
            res1.data.forEach((el) => {
              delete el[`patient.attributes.pid`];
              delete el[
                `patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id`
              ];
            });
          }
          expect(res1.data).toEqual([
            {
              "patient.attributes.dob": ["1957-06-10T00:00:00"],
              "patient.attributes.firstname": ["Max"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C00"],
            },
          ]);
          done();
        }
      );
    });

    it("(4) should return all distinct patients with last name sorted in ascending order", (done) => {
      //The format of the ifrbackend which is used in the patientlist endpoint is not possible to be achieved
      //using the "request2IFR" format function. hence hardcoding the request
      /*
             let request1 = {};
             createPath(request1, "patient.attributes.dob", [{
                 yaxis: 4,
                 aggregation: "string_agg",
             }]);
             createPath(request1, "patient.attributes.firstname", [{
                 order: "D",
                 yaxis: 3,
                 aggregation: "string_agg",
             }]);
             createPath(request1, "patient.attributes.lastname", [{
                 yaxis: 2,
                 aggregation: "string_agg",
             }]);
             createPath(request1, "patient.attributes.gender", [{
                 yaxis: 1,
                 aggregation: "string_agg",
             }]);
             createPath(request1, "patient.conditions.acme.interactions.priDiag.1.attributes.age", [{
                 yaxis: 5,
                 aggregation: "string_agg",
             }]);
             createPath(request1, "patient.conditions.acme.interactions.priDiag.1.attributes.icd", [{
                 yaxis: 6,
                 aggregation: "string_agg",
             }]);
             createPath(request1, "patient.isFilterCard", true);*/

      const getGuardedPlaceholderMap = jest.fn();
      getGuardedPlaceholderMap.mockReturnValue(pholderTableMap);

      const ifrRequest = {
        axes: [
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.pid",
            instanceID: "patient",
            isFiltercard: true,
            seq: 0,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.dob",
            instanceID: "patient",
            isFiltercard: true,
            seq: 1,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.firstname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 2,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.lastname",
            instanceID: "patient",
            isFiltercard: true,
            seq: 3,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient",
            id: "patient.attributes.gender",
            instanceID: "patient",
            isFiltercard: true,
            seq: 4,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 5,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.age",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 6,
          },
          {
            aggregation: "string_agg",
            axis: "y",
            configPath: "patient.conditions.acme.interactions.priDiag",
            id: "patient.conditions.acme.interactions.priDiag.10000.attributes.icd",
            instanceID: "patient.conditions.acme.interactions.priDiag.10000",
            isFiltercard: false,
            seq: 7,
          },
        ],
        cards: {
          content: [
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath: "patient.attributes.dob",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.dob",
                      },
                      {
                        _configPath: "patient.attributes.firstname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.firstname",
                      },
                      {
                        _configPath: "patient.attributes.lastname",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.lastname",
                      },
                      {
                        _configPath: "patient.attributes.gender",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID: "patient.attributes.gender",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient",
                  _inactive: false,
                  _instanceID: "patient",
                  _instanceNumber: 0,
                  _name: "",
                  op: "AND",
                },
              ],
              op: "OR",
            },
            {
              content: [
                {
                  _attributes: {
                    content: [
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.icd",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
                      },
                      {
                        _configPath:
                          "patient.conditions.acme.interactions.priDiag.attributes.age",
                        _constraints: {
                          content: [],
                          op: "OR",
                        },
                        _instanceID:
                          "patient.conditions.acme.interactions.priDiag.1.attributes.age",
                      },
                    ],
                    op: "AND",
                  },
                  _configPath: "patient.conditions.acme.interactions.priDiag",
                  _inactive: false,
                  _instanceID: "patient.conditions.acme.interactions.priDiag.1",
                  _instanceNumber: 1,
                  _name: "Primary Tumor Diagnosis A",
                  op: "AND",
                },
              ],
              op: "OR",
            },
          ],
          op: "AND",
        },
        configData: {
          configId: "No config id",
          configVersion: "No config version",
        },
      };

      let t = new Timer();
      ana.processRequest(
        "patientdetail",
        mockReq,
        "configWithCDMConfigMetaData",
        "0",
        "datasetId_1",
        ifrRequest,
        "en",
        null,
        connection,
        (err, res1) => {
          t.stop();
          if (err) {
            console.error(err);
            done.fail(err);
            return;
          }
          removePid(res1);
          expect(res1.totalPatientCount).toEqual(2);
          expect(res1.data.length).toEqual(3);
          if (res1.data && res1.data.length > 0) {
            res1.data.sort((a, b) => {
              return a[
                `patient.conditions.acme.interactions.priDiag.10000.attributes.icd`
              ][0].localeCompare(
                b[
                  `patient.conditions.acme.interactions.priDiag.10000.attributes.icd`
                ][0]
              );
            });

            res1.data.forEach((el) => {
              delete el[`patient.attributes.pid`];
              delete el[
                `patient.conditions.acme.interactions.priDiag.10000.attributes._interaction_id`
              ];
            });
          }
          expect(res1.data).toEqual([
            {
              "patient.attributes.dob": ["1957-06-10T00:00:00"],
              "patient.attributes.firstname": ["Max"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C00"],
            },
            {
              "patient.attributes.dob": ["1960-06-19T00:00:00"],
              "patient.attributes.firstname": ["Drake"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C01"],
            },
            {
              "patient.attributes.dob": ["1960-06-19T00:00:00"],
              "patient.attributes.firstname": ["Drake"],
              "patient.attributes.lastname": ["NoValue"],
              "patient.attributes.gender": ["M"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.age":
                ["NoValue"],
              "patient.conditions.acme.interactions.priDiag.10000.attributes.icd":
                ["C02"],
            },
          ]);
          done();
        }
      );
    });
  });
});
