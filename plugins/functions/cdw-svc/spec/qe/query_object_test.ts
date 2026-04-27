import { QueryObject as qol } from "@alp/alp-base-utils";
import * as testUtilLib from "../testutils/testutils";

describe("--- TEST SUITE FOR THE QUERY OBJECT ---", function () {
  describe("QueryObject.", function () {
    describe("QueryObject() ", function () {
      it("sets the placeholder array to the empty array if one is passed", function () {
        expect(new qol.QueryObject("randomname").parameterPlaceholders).toEqual(
          []
        );
      });

      // TODO: This spec uses settings, which requires DB connection. Ideally this should be part of some integration tests where DB connection exists.
      // it("sets the sql return flag to false, if no value is passed and no global default is defined",function(){
      //     var crazyValue = "this value would never occur";
      //     var oldVal = settings.sqlReturnOn;
      //     delete settings.sqlReturnOn;
      //     var queryObject1 = new qol.QueryObject("someSqlString",[]);
      //     expect(queryObject1.sqlReturnOn).toBeFalsy();
      //     settings.sqlReturnOn = oldVal;
      // });

      // it("sets the sql return flag to global settings.sqlReturnOn value if none is passed",function(){
      //     var crazyValue = "this value would never occur";
      //     var oldVal = qol.settings.sqlReturnOn;
      //     qol.settings.sqlReturnOn = crazyValue;
      //     var queryObject1 = new qol.QueryObject("someSqlString",[]);
      //     expect(queryObject1.sqlReturnOn).toBe(crazyValue);
      //     qol.settings.sqlReturnOn = oldVal;
      // });

      // The two tests below may seem redundant, but in fact pin down a corner case that appears
      // if one triers to use the "val = passedVal || defaulVal" shortcut.
      xit("sets the sql return flag to false if false is passed => Skipping: NOT valid with the new QueryObject", function () {
        const queryObject = new qol.QueryObject("someSqlString", [], false);
        expect(queryObject.sqlReturnOn).toBeFalsy();
      });

      xit("sets the sql return flag to true if true is passed => Skipping: NOT valid with the new QueryObject", function () {
        const queryObject = new qol.QueryObject("someSqlString", [], true);
        expect(queryObject.sqlReturnOn).toBeTruthy();
      });
    });

    describe("clone() ", function () {
      xit("correctly clones sqlReturnOn value => Skipping: NOT valid with the new QueryObject", function () {
        expect(
          new qol.QueryObject("randomname", [], true).clone().sqlReturnOn
        ).toBeTruthy();
        expect(
          new qol.QueryObject("randomname", [], false).clone().sqlReturnOn
        ).toBeFalsy();
      });
    });

    describe("concat() ", function () {
      it("adds the queryString of the passed object to the query string of the current object (with a newline in between)", function () {
        const obj1 = new qol.QueryObject("some long SQL string");
        const obj2 = new qol.QueryObject("another complicated string");
        const concatObj = obj1.concat(obj2);
        expect(concatObj.queryString).toBe(
          "some long SQL string\nanother complicated string"
        );
      });

      it("adds the parameterPlaceholders of the passed object to the parameterPlaceholders of the current object (with a newline in between)", function () {
        const obj1 = new qol.QueryObject("some long SQL string", [
          { a: 1 },
          { b: "c" },
        ]);
        const obj2 = new qol.QueryObject("another complicated string", [
          { d: 2 },
          { e: "f" },
        ]);
        const concatObj = obj1.concat(obj2);
        expect(concatObj.parameterPlaceholders).toEqual([
          { a: 1 },
          { b: "c" },
          { d: 2 },
          { e: "f" },
        ]);
      });

      xit("chooses the most restrictive sqlReturnOn value of the two concatenated query objects => Skipping: NOT valid with the new QueryObject", function () {
        const obj1 = new qol.QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          false
        );
        const obj2 = new qol.QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          false
        );
        const concatObj1 = obj1.concat(obj2);
        expect(concatObj1.sqlReturnOn).toBeFalsy();

        const obj3 = new qol.QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          true
        );
        const obj4 = new qol.QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          false
        );
        const concatObj2 = obj3.concat(obj4);
        expect(concatObj2.sqlReturnOn).toBeFalsy();

        const obj5 = new qol.QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          false
        );
        const obj6 = new qol.QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          true
        );
        const concatObj3 = obj5.concat(obj6);
        expect(concatObj3.sqlReturnOn).toBeFalsy();

        const obj7 = new qol.QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          true
        );
        const obj8 = new qol.QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          true
        );
        const concatObj4 = obj7.concat(obj8);
        expect(concatObj4.sqlReturnOn).toBeTruthy();
      });
    });

    describe("join() ", function () {
      it("combines queryobjects with a separator similar to the string join function", function () {
        const q = new qol.QueryObject(" X ");
        const x = ["a", "b", "c", "d"].map(function (c, i) {
          const o = {};
          o[c] = i;
          return new qol.QueryObject(c, o);
        });
        const joinedObj = q.join(x);
        expect(joinedObj.queryString).toBe("a X b X c X d");
        expect(joinedObj.parameterPlaceholders).toEqual([
          { a: 0 },
          { b: 1 },
          { c: 2 },
          { d: 3 },
        ]);
      });

      xit("chooses the most restrictive sqlReturnOn value of the joined query objects => Skipping: NOT valid with the new QueryObject", function () {
        const q1 = new qol.QueryObject(" X ", [], false);
        const x1 = ["a", "b", "c", "d"].map(function (c, i) {
          const o = {};
          o[c] = i;
          return new qol.QueryObject(c, o, false);
        });
        const joinedObj1 = q1.join(x1);
        expect(joinedObj1.sqlReturnOn).toBeFalsy();

        const q2 = new qol.QueryObject(" X ", [], false);
        const x2 = ["a", "b", "c", "d"].map(function (c, i) {
          const o = {};
          o[c] = i;
          return new qol.QueryObject(c, o, true);
        });
        const joinedObj2 = q2.join(x2);
        expect(joinedObj2.sqlReturnOn).toBeFalsy();

        const q3 = new qol.QueryObject(" X ", [], true);
        const x3 = ["a", "b", "c", "d"].map(function (c, i) {
          const o = {};
          o[c] = i;
          return new qol.QueryObject(c, o, false);
        });
        const joinedObj3 = q3.join(x3);
        expect(joinedObj3.sqlReturnOn).toBeFalsy();

        const q4 = new qol.QueryObject(" X ", [], true);
        const x4 = ["a", "b", "c", "d"].map(function (c, i) {
          const o = {};
          o[c] = i;
          return new qol.QueryObject(c, o, i === 2);
        });
        const joinedObj4 = q4.join(x4);
        expect(joinedObj4.sqlReturnOn).toBeFalsy();

        const q5 = new qol.QueryObject(" X ", [], true);
        const x5 = ["a", "b", "c", "d"].map(function (c, i) {
          const o = {};
          o[c] = i;
          return new qol.QueryObject(c, o, true);
        });
        const joinedObj5 = q5.join(x5);
        expect(joinedObj5.sqlReturnOn).toBeTruthy();
      });

      it("does not include the separator if the array has only one element", function () {
        const q = new qol.QueryObject(" X ");
        const x = ["a"].map(function (c, i) {
          const o = {};
          o[c] = i;
          return new qol.QueryObject(c, o);
        });
        const joinedObj = q.join(x);
        expect(joinedObj.queryString).toBe("a");
        expect(joinedObj.parameterPlaceholders).toEqual([{ a: 0 }]);
      });

      it("returns an empty queryobejct when called with an empty array", function () {
        const q = new qol.QueryObject(" X ");
        const x = [];
        const joinedObj = q.join(x);
        expect(joinedObj.queryString).toBe("");
        expect(joinedObj.parameterPlaceholders).toEqual([]);
      });

      it("adds the parameterPlaceholders of the passed object to the parameterPlaceholders of the current object (with a newline in between)", function () {
        const obj1 = new qol.QueryObject("some long SQL string", [
          { a: 1 },
          { b: "c" },
        ]);
        const obj2 = new qol.QueryObject("another complicated string", [
          { d: 2 },
          { e: "f" },
        ]);
        const concatObj = obj1.concat(obj2);
        expect(concatObj.parameterPlaceholders).toEqual([
          { a: 1 },
          { b: "c" },
          { d: 2 },
          { e: "f" },
        ]);
      });
    });

    describe("joinNonEmpty() ", function () {
      it("filters out null, undefined and empty queryobjects, before joining", function () {
        const q = new qol.QueryObject(" X ");
        const x = [
          qol.QueryObject.format("a"),
          null,
          qol.QueryObject.format("b"),
          undefined,
          undefined,
          qol.QueryObject.format("c"),
          qol.QueryObject.format(""),
          qol.QueryObject.format("d"),
        ];
        const joinedObj = q.joinNonEmpty(x);
        expect(joinedObj.queryString).toBe("a X b X c X d");
      });
    });

    describe("_prepareQuery() ", function () {
      it("replaces all placeholders of the form '{somestring}' with question marks but numbers are included directly in the string", function () {
        const obj = new qol.QueryObject("smt {pl1} and then {abc} {z}", [
          { key: "{abc}", type: "text", value: "hello" },
          { key: "{z}", type: "time", value: "1995-12-17T03:24:00" },
          { key: "{pl1}", type: "num", value: 3.5 },
        ]);
        const replacedObj = obj._prepareQuery();
        testUtilLib.expectEqualAsSql(replacedObj.sql, "smt 3.5 and then ? ?");
      });

      it("outputs the placeholder objects (minus the key) in an array, ordered by their order of occurrence except for numbers", function () {
        const obj = new qol.QueryObject("smt {pl1} and then {abc} {z}", [
          { key: "{abc}", type: "text", value: "hello" },
          { key: "{z}", type: "time", value: "1995-12-17T03:24:00" },
          { key: "{pl1}", type: "num", value: 3.5 },
        ]);
        const replacedObj = obj._prepareQuery();
        expect(replacedObj.placeholders).toEqual([
          {
            type: "text",
            value: "hello",
          },
          {
            type: "time",
            value: "1995-12-17T03:24:00",
          },
        ]);
      });

      it("throws an error if for a numeric placeholder a string value is given", function () {
        const obj = new qol.QueryObject("smt {pl1} and then {abc} {z}", [
          {
            key: "{abc}",
            type: "text",
            value: "hello",
          },
          {
            key: "{z}",
            type: "time",
            value: "1995-12-17T03:24:00",
          },
          {
            key: "{pl1}",
            type: "num",
            value: "bobby tables",
          },
        ]);
        expect(function () {
          obj._prepareQuery();
        }).toThrowError();
      });

      it("returns sql query as part of result object irrespective of sqlReturnOn flag", function () {
        const obj1 = new qol.QueryObject("this is a test query", [], false);
        const replacedObj1 = obj1._prepareQuery();
        expect(replacedObj1.sql).toEqual("this is a test query");

        const obj2 = new qol.QueryObject("this is a test query", [], true);
        const replacedObj2 = obj2._prepareQuery();
        expect(replacedObj2.sql).toEqual("this is a test query");
      });
    });

    // TODO: Since the parseResults() is moved to the connection implementations, these unit tests also should be moved to ../../../src/utils/ConnectionInterface repo later.
    // describe("parseResults()", function(){
    //     var mockDb = null;
    //     var mockResultSet = null;

    //     beforeEach(function(){
    //         mockDb = new mockdbLib.MockDb([["a", 1, "hello"], ["b", 2, "goodbye"]], [{label : "Col1", type : "VARCHAR"}, {label : "Col2", type : "INTEGER"}, {label : "Col3", type : "VARCHAR"}]);
    //         mockResultSet = mockDb.backdoorResultSet();
    //     });

    //     //TYPESCRIPT: second parameter added to parseResults method
    //     it("returns an array with as many elements as there are rows in the result set", function(){
    //         var result = qol.parseResults(mockResultSet, {});
    //         expect(result.length).toBe(2);
    //     });

    //      //TYPESCRIPT: second parameter added to parseResults method
    //     it("returns an array with the column labels as keys and the corresponding values as values", function(){
    //         var result = qol.parseResults(mockResultSet, {});
    //         expect(result).toEqual([{Col1 : "a", Col2 : 1, Col3: "hello"}, {Col1 : "b", Col2 : 2, Col3: "goodbye"}]);
    //     });
    // });
  });

  describe("format.", function () {
    it("should format a the string correctly", function () {
      const q0 = qol.QueryObject.generateParameterQueryObject("20", "num");
      const q = qol.QueryObject.format(
        "a %UNSAFE b %s c %f d %t e %Q",
        "fieldName",
        "someValue",
        2,
        "2010-12-01",
        q0
      );
      const s = q.queryString;
      const pars = q.parameterPlaceholders;
      const m = s.match(
        /^a fieldName b ({[^}]+}) c ({[^}]+}) d ({[^}]+}) e ({[^}]+})$/
      );
      pars.forEach(function (p, i) {
        expect(p.key).toEqual(m[i + 1]);
      });
    });
  });

  describe("formatDict.", function () {
    it("should format a the string correctly", function () {
      const q0 = qol.QueryObject.generateParameterQueryObject("20", "num");
      const dict = {
        unsafe_string: "fieldName",
        user_string: "someValue",
        user_num: 2,
        user_date: "2010-12-01",
        query_object: q0,
      };
      const q = qol.QueryObject.formatDict(
        "%(unsafe_string)UNSAFE a %(unsafe_string)UNSAFE b %(user_string)s c %(user_num)f d %(user_date)t e %(query_object)Q",
        dict
      );
      const s = q.queryString;
      const pars = q.parameterPlaceholders;
      const m = s.match(
        /^fieldName a fieldName b ({[^}]+}) c ({[^}]+}) d ({[^}]+}) e ({[^}]+})$/
      );
      pars.forEach(function (p, i) {
        expect(p.key).toEqual(m[i + 1]);
      });
    });
  });

  describe("handles identifiers", function () {
    let qo;
    beforeEach(function () {
      qo = new qol.QueryObject();
    });
    it("by shorten them to prevent sql errors", function () {
      const query =
        'SELECT 1 AS "patient.replace.me", 2 AS "not.to.be.replaced" FROM "Let me"."be.like.this"';
      const expected =
        /SELECT 1 AS "\w{8,9}", 2 AS "not\.to\.be\.replaced" FROM "Let me"\."be\.like\.this"/;
      const result = qo.shortenIdentifier(query);
      expect(result).toMatch(expected);
    });
    // TODO: moved to ../../../src/utils/ConnectionInterface repo
    // it("without effecting the result set", function(){
    //     var mockDb = new mockdbLib.MockDb([["a", 1, "hello"], ["b", 2, "goodbye"]], [{label : "12345678", type : "VARCHAR"}, {label : "87654321", type : "INTEGER"}, {label : "12344321", type : "VARCHAR"}]);
    //     var mockResultSet = mockDb.backdoorResultSet();
    //     var expectedResult = [{Col1 : "a", Col2 : 1, Col3 : "hello"}, {Col1 : "b", Col2: 2, Col3 : "goodbye"}];
    //     var identifierMap = {"12345678": "Col1", "87654321": "Col2", "12344321": "Col3"};

    //     var result = qol.parseResults(mockResultSet,identifierMap);
    //     expect(result).toEqual(expectedResult);
    // });
  });
});
