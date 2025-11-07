import { createPathInObject as createPath } from "@alp/alp-base-utils";
import * as async from "async";
import * as aggQuery from "../../../src/mri/endpoint/analytics";
import { Settings } from "../../../src/qe/settings/Settings";
import { request2Bookmark } from "../../testutils/Request2Bookmark";

import {
  testSuiteName,
  pholderTableMap,
  testResult,
  Timer,
  aggquery_setup,
} from "../../testutils/aggquery_common";

describe(testSuiteName, () => {
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
  beforeAll((done) => {
    aggquery_setup((_connection, _testEnvironment, _patientCreator) => {
      connection = _connection;
      testEnvironment = _testEnvironment;
      patientCreator = _patientCreator;
      settingsObj = new Settings();
      done();
    });
  });

  describe("temporal query", () => {
    let patients;
    //            01.01    5.01.   10.01    15.01.  20.01.     25.01.  30.01.
    //              |       |        |        |        |        |        |
    //              |       |        |        |        |        |        |
    // P1           [----------------x-----------------]
    //              [----------------y-----------------]
    //********************************************************************//
    // P2           [--x---]
    //                                        [---y----]
    //********************************************************************//
    // P3                            [--------x--------]
    //                                                 [--------y--------]
    //********************************************************************//
    // P4                            [--------x--------]
    //                                        [--------y--------]
    //********************************************************************//
    // P5           [-------x--------]
    //              [---------------------y---------------------]
    //********************************************************************//
    // P6                                     [---x----]
    //                               [------------y-------------]
    //********************************************************************//
    // P7                            [------------x-------------]
    //              [-------------------y-----------------------]
    //********************************************************************//
    // P8               [------------x-------------]
    //      [------------y-------------]
    //                                  OR
    //                              [------------x-------------]
    //                  [------------y-------------]
    //                                  OR
    //                  [------------x-------------]
    //             [-----------------y------------------]
    //                                  OR
    //             [-----------------x------------------]
    //                  [------------y-------------]
    //********************************************************************//

    beforeAll((done) => {
      patients = [
        {
          x_name: "P01",
          x_start: "10.01.1900",
          x_end: "20.01.1900",
          y_name: "P01",
          y_start: "10.01.1900",
          y_end: "20.01.1900",
        },
        {
          x_name: "P02",
          x_start: "01.01.1900",
          x_end: "05.01.1900",
          y_name: "P02",
          y_start: "15.01.1900",
          y_end: "20.01.1900",
        },
        {
          x_name: "P03",
          x_start: "10.01.1900",
          x_end: "20.01.1900",
          y_name: "P03",
          y_start: "20.01.1900",
          y_end: "30.01.1900",
        },
        {
          x_name: "P04",
          x_start: "10.01.1900",
          x_end: "20.01.1900",
          y_name: "P04",
          y_start: "15.01.1900",
          y_end: "25.01.1900",
        },
        {
          x_name: "P05",
          x_start: "01.01.1900",
          x_end: "10.01.1900",
          y_name: "P05",
          y_start: "01.01.1900",
          y_end: "25.01.1900",
        },
        {
          x_name: "P06",
          x_start: "15.01.1900",
          x_end: "20.01.1900",
          y_name: "P06",
          y_start: "10.01.1900",
          y_end: "25.01.1900",
        },
        {
          x_name: "P07",
          x_start: "10.01.1900",
          x_end: "25.01.1900",
          y_name: "P07",
          y_start: "01.01.1900",
          y_end: "25.01.1900",
        },
        {
          x_name: "P08",
          x_start: "10.01.1900",
          x_end: "25.01.1900",
          y_name: "P08",
          y_start: "01.01.1900",
          y_end: "25.01.1900",
        },
      ];

      let tasks = [];

      patients.forEach((e) => {
        let p = {};
        createPath(
          p,
          "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
          e.x_name
        );
        createPath(
          p,
          "patient.conditions.acme.interactions.priDiag.1._start",
          e.x_start
        );
        createPath(
          p,
          "patient.conditions.acme.interactions.priDiag.1._end",
          e.x_end
        );
        createPath(
          p,
          "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
          e.y_name
        );
        createPath(
          p,
          "patient.conditions.acme.interactions.chemo.1._start",
          e.y_start
        );
        createPath(
          p,
          "patient.conditions.acme.interactions.chemo.1._end",
          e.y_end
        );
        tasks.push((callback) => {
          patientCreator.addPatient(p, null, (err, data) => {
            if (err) {
              throw err;
            }
            callback(null);
          });
        });
      });

      const clearSchema = (callback) => {
        testEnvironment.clearSchema((err, results) => {
          if (err) {
            console.error("Error in clearing schema tables!");
          }
          callback(null);
        });
      };
      async.series([clearSchema, ...tasks], (err, data) => {
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

    it("should limit the result to patients that had the specified interactions within the given time frame (1)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P01",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                value: "patient.conditions.acme.interactions.chemo.1",
                filter: [
                  {
                    this: "start",
                    other: "start",
                    and: [
                      {
                        op: "=",
                        value: 0,
                      },
                    ],
                  },
                  {
                    this: "end",
                    other: "end",
                    and: [
                      {
                        op: "=",
                        value: 0,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P01",
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (2)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P02",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                value: "patient.conditions.acme.interactions.chemo.1",
                filter: [
                  {
                    this: "end",
                    other: "start",
                    and: [
                      {
                        op: ">=",
                        value: 1,
                      },
                      {
                        op: "<",
                        value: 11,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P02",
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (3)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P03",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                value: "patient.conditions.acme.interactions.chemo.1",
                filter: [
                  {
                    this: "end",
                    other: "start",
                    and: [
                      {
                        op: "=",
                        value: 0,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P03",
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (4)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P04",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                value: "patient.conditions.acme.interactions.chemo.1",
                filter: [
                  {
                    this: "start",
                    other: "start",
                    and: [
                      {
                        op: ">=",
                        value: 0,
                      },
                      {
                        op: "<",
                        value: 6,
                      },
                    ],
                  },
                  {
                    this: "end",
                    other: "end",
                    and: [
                      {
                        op: ">=",
                        value: 0,
                      },
                      {
                        op: "<",
                        value: 6,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P04",
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (5)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P05",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                value: "patient.conditions.acme.interactions.chemo.1",
                filter: [
                  {
                    this: "start",
                    other: "start",
                    and: [
                      {
                        op: "=",
                        value: 0,
                      },
                    ],
                  },
                  {
                    this: "end",
                    other: "end",
                    and: [
                      {
                        op: ">=",
                        value: 0,
                      },
                      {
                        op: "<",
                        value: 16,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P05",
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (6)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P06",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                value: "patient.conditions.acme.interactions.chemo.1",
                filter: [
                  {
                    this: "start",
                    other: "start",
                    and: [
                      {
                        op: ">=",
                        value: -5,
                      },
                      {
                        op: "<",
                        value: 1,
                      },
                    ],
                  },
                  {
                    this: "end",
                    other: "end",
                    and: [
                      {
                        op: ">=",
                        value: 0,
                      },
                      {
                        op: "<",
                        value: 6,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P06",
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (7)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P07",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                value: "patient.conditions.acme.interactions.chemo.1",
                filter: [
                  {
                    this: "start",
                    other: "start",
                    and: [
                      {
                        op: ">=",
                        value: -10,
                      },
                      {
                        op: "<",
                        value: 1,
                      },
                    ],
                  },
                  {
                    this: "end",
                    other: "end",
                    and: [
                      {
                        op: "=",
                        value: 0,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P07",
              ],
              "patient.attributes.pcount": [1],
            },
            null
          );
          done();
        }
      );
    });

    it("should limit the result to patients that had the specified interactions within the given time frame (Occurred While) (8)", (done) => {
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
            filter: [
              {
                op: "=",
                value: "P08",
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.priDiag.1.attributes._tempQ",
        [
          {
            and: [
              {
                or: [
                  {
                    value: "patient.conditions.acme.interactions.chemo.1",
                    filter: [
                      {
                        this: "start",
                        other: "start",
                        and: [
                          {
                            op: ">=",
                            value: 0,
                          },
                        ],
                      },
                      {
                        this: "end",
                        other: "end",
                        and: [
                          {
                            op: ">=",
                            value: 0,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    value: "patient.conditions.acme.interactions.chemo.1",
                    filter: [
                      {
                        this: "start",
                        other: "start",
                        and: [
                          {
                            op: "<",
                            value: -1,
                          },
                        ],
                      },
                      {
                        this: "end",
                        other: "end",
                        and: [
                          {
                            op: "<",
                            value: -1,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    value: "patient.conditions.acme.interactions.chemo.1",
                    filter: [
                      {
                        this: "start",
                        other: "start",
                        and: [
                          {
                            op: ">=",
                            value: 0,
                          },
                        ],
                      },
                      {
                        this: "end",
                        other: "end",
                        and: [
                          {
                            op: "<=",
                            value: 0,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    value: "patient.conditions.acme.interactions.chemo.1",
                    filter: [
                      {
                        this: "start",
                        other: "start",
                        and: [
                          {
                            op: "<=",
                            value: 0,
                          },
                        ],
                      },
                      {
                        this: "end",
                        other: "end",
                        and: [
                          {
                            op: ">=",
                            value: 0,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );
      createPath(
        request1,
        "patient.conditions.acme.interactions.chemo.1.attributes.chemo_prot",
        [{}]
      );

      let t = new Timer();
      let expectedTotalPCount = 1;
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
          expect(res1.totalPatientCount).toEqual(expectedTotalPCount);
          testResult(
            res1,
            {
              "patient.conditions.acme.interactions.priDiag.1.attributes.icd": [
                "P08",
              ],
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
