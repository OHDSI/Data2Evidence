/**
 * Test suite for the aggregate querybuilder
 */
import { StackedBarchartEndpoint } from "../../../src/mri/endpoint/StackedBarchartEndpoint";
import { BaseQueryEngineEndpoint } from "../../../src/mri/endpoint/BaseQueryEngineEndpoint";
import * as utilsLib from "@alp/alp-base-utils";
import { doesNotMatch } from "assert";
const mockReq = {
  headers: {
    authorization: "Bearer dummy jwt",
    "x-alp-usersessionclaims": "test",
    "x-source-origin": "test",
  },
};
let testAttr = {
  textAttr: {
    type: "text",
  },
  numAttr: {
    type: "num",
  },
  timeAttr: {
    type: "time",
  },
};

let testConfig = {
  patient: {
    attributes: testAttr,
    interactions: {
      testInt: {
        attributes: testAttr,
      },
    },
    conditions: {
      testCond: {
        interactions: {
          testInt: {
            attributes: testAttr,
          },
        },
      },
    },
  },
};

let PATHS = [
  "patient.attributes",
  "patient.interactions.testInt.1.attributes",
  "patient.conditions.testCond.interactions.testInt.1.attributes",
];

describe("--- TESTS SUITE FOR AGGREGATION PROCESSOR ---", () => {
  describe("processRequest() ", () => {
    xit(" returns an empty result if requerst is empty", () => {
      new StackedBarchartEndpoint(null)
        .processRequest(mockReq, null, null, null, {}, null)
        .then((result) => {
          expect(result).toEqual({
            sql: "",
            data: [],
            measures: [],
            categories: [],
            totalPatientCount: 0,
          });
        });
    });
  });
});
//  xdescribe("assertValidRequest() ",  () => {
//      it("allows default aggregation",  () => {
//          PATHS.forEach( (path) => {
//              let request = {};
//              utilsLib.createPathInObject(request, path, { numAttr: [{ yaxis: 1 }] });
//             //  function testFunc() {
//             //      (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//             //  }
//              expect(testFunc).not.toThrow();
//          });
//      });
//      it("allows numerical standard aggregations",  () => {
//          let aggregations = ["avg", "sum"];
//          let request;
//          aggregations.forEach( (aggrFunction) => {
//              PATHS.forEach( (path) => {
//                  request = {};
//                  utilsLib.createPathInObject(request, path, { numAttr: [{ yaxis: 1, aggregation: aggrFunction }] });
//                  function testFunc() {
//                      (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//                  }
//                  expect(testFunc).not.toThrow();
//              });
//          });
//      });
//      it("allows standard count aggregations",  () => {
//          let aggregations = ["countDistinct", "count"];
//          let request;
//          aggregations.forEach( (aggrFunction) => {
//              PATHS.forEach( (path) => {
//                  request = {};
//                  utilsLib.createPathInObject(request, path, { textAttr: [{ yaxis: 1, aggregation: aggrFunction }] });
//                  function testFunc() {
//                      (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//                  }
//                  expect(testFunc).not.toThrow();
//              });
//          });
//      });
//      it("allows min/max aggregations for numerical attributes",  () => {
//          let aggregations = ["min", "max"];
//          let request;
//          aggregations.forEach( (aggrFunction) => {
//              PATHS.forEach( (path) => {
//                  request = {};
//                  utilsLib.createPathInObject(request, path, { numAttr: [{ yaxis: 1, aggregation: aggrFunction }] });
//                  function testFunc() {
//                      (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//                  }
//                  expect(testFunc).not.toThrow();
//              });
//          });
//      });
//      it("does not allow min/max aggregations for text attributes",  () => {
//          let aggregations = ["min", "max"];
//          let textAttributes = ["textAttr", "freetextAttr"];
//          let request;
//          aggregations.forEach( (aggrFunction) => {
//              PATHS.forEach( (path) => {
//                  textAttributes.forEach( (attr) => {
//                      request = {};
//                      utilsLib.createPathInObject(request, path + "." + attr, [{ yaxis: 1, aggregation: aggrFunction }]);
//                      function testFunc() {
//                          (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//                      }
//                      expect(testFunc).toThrow();
//                  });
//              });
//          });
//      });
//      it("does not allow min/max aggregations for time attributes",  () => {
//          let aggregations = ["min", "max"];
//          let request;
//          aggregations.forEach( (aggrFunction) => {
//              PATHS.forEach( (path) => {
//                  request = {};
//                  utilsLib.createPathInObject(request, path, { timeAttr: [{ yaxis: 1, aggregation: aggrFunction }] });
//                  function testFunc() {
//                      (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//                  }
//                  expect(testFunc).toThrow();
//              });
//          });
//      });
//      it("does not allow usage of string aggregation",  () => {
//          let aggregations = ["string_agg"];
//          let request;
//          aggregations.forEach( (aggrFunction) => {
//              PATHS.forEach( (path) => {
//                  request = {};
//                  utilsLib.createPathInObject(request, path, { numAttr: [{ yaxis: 1, aggregation: aggrFunction }] });
//                  function testFunc() {
//                      (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//                  }
//                  expect(testFunc).toThrow();
//              });
//          });
//      });
//      it("does not allow usage of non existing aggregations",  () => {
//          let aggregations = ["thisIsNotADefinedAggregation"];
//          let request;
//          aggregations.forEach( (aggrFunction) => {
//              PATHS.forEach( (path) => {
//                  request = {};
//                  utilsLib.createPathInObject(request, path, { numAttr: [{ yaxis: 1, aggregation: aggrFunction }] });
//                  function testFunc() {
//                      (new StackedBarchartEndpoint(null, null, null, true)).assertValidRequest([request], testConfig);
//                  }
//                  expect(testFunc).toThrow();
//              });
//          });
//      });
//  });
//  });
