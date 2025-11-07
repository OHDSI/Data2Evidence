import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import * as testUtilLib from "../testutils/testutils";

describe("--- TEST SUITE FOR THE QUERY OBJECT ---", () => {
  describe("QueryObject.", () => {
    describe("QueryObject() ", () => {
      it("sets the placeholder array to the empty array if one is passed", () => {
        expect(new QueryObject("randomname").parameterPlaceholders).toEqual([]);
      });

      // TODO: This spec uses settings, which requires DB connection. Ideally this should be part of some integration tests where DB connection exists.
      // it("sets the sql return flag to false, if no value is passed and no global default is defined",() =>{
      //     var crazyValue = "this value would never occur";
      //     var oldVal = settings.sqlReturnOn;
      //     delete settings.sqlReturnOn;
      //     var queryObject1 = new QueryObject("someSqlString",[]);
      //     expect(queryObject1.sqlReturnOn).toBeFalsy();
      //     settings.sqlReturnOn = oldVal;
      // });

      // it("sets the sql return flag to global settings.sqlReturnOn value if none is passed",() =>{
      //     var crazyValue = "this value would never occur";
      //     var oldVal = qol.settings.sqlReturnOn;
      //     qol.settings.sqlReturnOn = crazyValue;
      //     var queryObject1 = new QueryObject("someSqlString",[]);
      //     expect(queryObject1.sqlReturnOn).toBe(crazyValue);
      //     qol.settings.sqlReturnOn = oldVal;
      // });

      // The two tests below may seem redundant, but in fact pin down a corner case that appears
      // if one triers to use the "val = passedVal || defaulVal" shortcut.
      xit("sets the sql return flag to false if false is passed => Skipping: NOT valid with the new QueryObject", () => {
        let queryObject = new QueryObject("someSqlString", [], false);
        expect(queryObject.sqlReturnOn).toBeFalsy();
      });

      xit("sets the sql return flag to true if true is passed => Skipping: NOT valid with the new QueryObject", () => {
        let queryObject = new QueryObject("someSqlString", [], true);
        expect(queryObject.sqlReturnOn).toBeTruthy();
      });
    });

    describe("clone() ", () => {
      xit("correctly clones sqlReturnOn value => Skipping: NOT valid with the new QueryObject", () => {
        expect(
          new QueryObject("randomname", [], true).clone().sqlReturnOn
        ).toBeTruthy();
        expect(
          new QueryObject("randomname", [], false).clone().sqlReturnOn
        ).toBeFalsy();
      });
    });

    describe("concat() ", () => {
      it("adds the queryString of the passed object to the query string of the current object (with a newline in between)", () => {
        let obj1 = new QueryObject("some long SQL string");
        let obj2 = new QueryObject("another complicated string");
        let concatObj = obj1.concat(obj2);
        expect(concatObj.queryString).toBe(
          "some long SQL string\nanother complicated string"
        );
      });

      it("adds the parameterPlaceholders of the passed object to the parameterPlaceholders of the current object (with a newline in between)", () => {
        let obj1 = new QueryObject("some long SQL string", [
          { a: 1 },
          { b: "c" },
        ]);
        let obj2 = new QueryObject("another complicated string", [
          { d: 2 },
          { e: "f" },
        ]);
        let concatObj = obj1.concat(obj2);
        expect(concatObj.parameterPlaceholders).toEqual([
          { a: 1 },
          { b: "c" },
          { d: 2 },
          { e: "f" },
        ]);
      });

      xit("chooses the most restrictive sqlReturnOn value of the two concatenated query objects => Skipping: NOT valid with the new QueryObject", () => {
        let obj1 = new QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          false
        );
        let obj2 = new QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          false
        );
        let concatObj1 = obj1.concat(obj2);
        expect(concatObj1.sqlReturnOn).toBeFalsy();

        let obj3 = new QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          true
        );
        let obj4 = new QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          false
        );
        let concatObj2 = obj3.concat(obj4);
        expect(concatObj2.sqlReturnOn).toBeFalsy();

        let obj5 = new QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          false
        );
        let obj6 = new QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          true
        );
        let concatObj3 = obj5.concat(obj6);
        expect(concatObj3.sqlReturnOn).toBeFalsy();

        let obj7 = new QueryObject(
          "some long SQL string",
          [{ a: 1 }, { b: "c" }],
          true
        );
        let obj8 = new QueryObject(
          "another complicated string",
          [{ d: 2 }, { e: "f" }],
          true
        );
        let concatObj4 = obj7.concat(obj8);
        expect(concatObj4.sqlReturnOn).toBeTruthy();
      });
    });

    describe("join() ", () => {
      it("combines queryobjects with a separator similar to the string join function", () => {
        let q = new QueryObject(" X ");
        let x = ["a", "b", "c", "d"].map((c, i) => {
          let o = {};
          o[c] = i;
          return new QueryObject(c, o);
        });
        let joinedObj = q.join(x);
        expect(joinedObj.queryString).toBe("a X b X c X d");
        expect(joinedObj.parameterPlaceholders).toEqual([
          { a: 0 },
          { b: 1 },
          { c: 2 },
          { d: 3 },
        ]);
      });

      xit("chooses the most restrictive sqlReturnOn value of the joined query objects => Skipping: NOT valid with the new QueryObject", () => {
        let q1 = new QueryObject(" X ", [], false);
        let x1 = ["a", "b", "c", "d"].map((c, i) => {
          let o = {};
          o[c] = i;
          return new QueryObject(c, o, false);
        });
        let joinedObj1 = q1.join(x1);
        expect(joinedObj1.sqlReturnOn).toBeFalsy();

        let q2 = new QueryObject(" X ", [], false);
        let x2 = ["a", "b", "c", "d"].map((c, i) => {
          let o = {};
          o[c] = i;
          return new QueryObject(c, o, true);
        });
        let joinedObj2 = q2.join(x2);
        expect(joinedObj2.sqlReturnOn).toBeFalsy();

        let q3 = new QueryObject(" X ", [], true);
        let x3 = ["a", "b", "c", "d"].map((c, i) => {
          let o = {};
          o[c] = i;
          return new QueryObject(c, o, false);
        });
        let joinedObj3 = q3.join(x3);
        expect(joinedObj3.sqlReturnOn).toBeFalsy();

        let q4 = new QueryObject(" X ", [], true);
        let x4 = ["a", "b", "c", "d"].map((c, i) => {
          let o = {};
          o[c] = i;
          return new QueryObject(c, o, i === 2);
        });
        let joinedObj4 = q4.join(x4);
        expect(joinedObj4.sqlReturnOn).toBeFalsy();

        let q5 = new QueryObject(" X ", [], true);
        let x5 = ["a", "b", "c", "d"].map((c, i) => {
          let o = {};
          o[c] = i;
          return new QueryObject(c, o, true);
        });
        let joinedObj5 = q5.join(x5);
        expect(joinedObj5.sqlReturnOn).toBeTruthy();
      });

      it("does not include the separator if the array has only one element", () => {
        let q = new QueryObject(" X ");
        let x = ["a"].map((c, i) => {
          let o = {};
          o[c] = i;
          return new QueryObject(c, o);
        });
        let joinedObj = q.join(x);
        expect(joinedObj.queryString).toBe("a");
        expect(joinedObj.parameterPlaceholders).toEqual([{ a: 0 }]);
      });

      it("returns an empty queryobejct when called with an empty array", () => {
        let q = new QueryObject(" X ");
        let x = [];
        let joinedObj = q.join(x);
        expect(joinedObj.queryString).toBe("");
        expect(joinedObj.parameterPlaceholders).toEqual([]);
      });

      it("adds the parameterPlaceholders of the passed object to the parameterPlaceholders of the current object (with a newline in between)", () => {
        let obj1 = new QueryObject("some long SQL string", [
          { a: 1 },
          { b: "c" },
        ]);
        let obj2 = new QueryObject("another complicated string", [
          { d: 2 },
          { e: "f" },
        ]);
        let concatObj = obj1.concat(obj2);
        expect(concatObj.parameterPlaceholders).toEqual([
          { a: 1 },
          { b: "c" },
          { d: 2 },
          { e: "f" },
        ]);
      });
    });

    describe("joinNonEmpty() ", () => {
      it("filters out null, undefined and empty queryobjects, before joining", () => {
        let q = new QueryObject(" X ");
        /* tslint:disable-next-line: max-line-length */
        let x = [
          QueryObject.format("a"),
          null,
          QueryObject.format("b"),
          undefined,
          undefined,
          QueryObject.format("c"),
          QueryObject.format(""),
          QueryObject.format("d"),
        ];
        let joinedObj = q.joinNonEmpty(x);
        expect(joinedObj.queryString).toBe("a X b X c X d");
      });
    });

    describe("_prepareQuery() ", () => {
      it("replaces all placeholders of the form '{somestring}' with question marks but numbers are included directly in the string", () => {
        /* tslint:disable-next-line: max-line-length */
        let obj = new QueryObject("smt {pl1} and then {abc} {z}", [
          { key: "{abc}", type: "text", value: "hello" },
          { key: "{z}", type: "time", value: "1995-12-17T03:24:00" },
          { key: "{pl1}", type: "num", value: 3.5 },
        ]);
        let replacedObj = obj._prepareQuery();
        testUtilLib.expectEqualAsSql(replacedObj.sql, "smt 3.5 and then ? ?");
      });

      it("outputs the placeholder objects (minus the key) in an array, ordered by their order of occurrence except for numbers", () => {
        /* tslint:disable-next-line: max-line-length */
        let obj = new QueryObject("smt {pl1} and then {abc} {z}", [
          { key: "{abc}", type: "text", value: "hello" },
          { key: "{z}", type: "time", value: "1995-12-17T03:24:00" },
          { key: "{pl1}", type: "num", value: 3.5 },
        ]);
        let replacedObj = obj._prepareQuery();
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

      it("throws an error if for a numeric placeholder a string value is given", () => {
        let obj = new QueryObject("smt {pl1} and then {abc} {z}", [
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
        expect(() => {
          obj._prepareQuery();
        }).toThrowError();
      });

      it("returns sql query as part of result object irrespective of sqlReturnOn flag", () => {
        let obj1 = new QueryObject("this is a test query", [], false);
        let replacedObj1 = obj1._prepareQuery();
        expect(replacedObj1.sql).toEqual("this is a test query");

        let obj2 = new QueryObject("this is a test query", [], true);
        let replacedObj2 = obj2._prepareQuery();
        expect(replacedObj2.sql).toEqual("this is a test query");
      });
    });

    // TODO: Since the parseResults() is moved to the connection implementations,
    // these unit tests also should be moved to ../../../src/utils/ConnectionInterface repo later.
    // describe("parseResults()", () =>{
    //     var mockDb = null;
    //     var mockResultSet = null;

    //     beforeEach(() =>{
    //         mockDb = new mockdbLib.MockDb([["a", 1, "hello"], ["b", 2, "goodbye"]], [{label : "Col1", type : "VARCHAR"},
    //                                       {label : "Col2", type : "INTEGER"}, {label : "Col3", type : "VARCHAR"}]);
    //         mockResultSet = mockDb.backdoorResultSet();
    //     });

    //     //TYPESCRIPT: second parameter added to parseResults method
    //     it("returns an array with as many elements as there are rows in the result set", () =>{
    //         var result = qol.parseResults(mockResultSet, {});
    //         expect(result.length).toBe(2);
    //     });

    //      //TYPESCRIPT: second parameter added to parseResults method
    //     it("returns an array with the column labels as keys and the corresponding values as values", () =>{
    //         var result = qol.parseResults(mockResultSet, {});
    //         expect(result).toEqual([{Col1 : "a", Col2 : 1, Col3: "hello"}, {Col1 : "b", Col2 : 2, Col3: "goodbye"}]);
    //     });
    // });
  });

  describe("format.", () => {
    it("should format a the string correctly", () => {
      let q0 = QueryObject.generateParameterQueryObject("20", "num");
      let q = QueryObject.format(
        "a %UNSAFE b %s c %f d %t e %Q",
        "fieldName",
        "someValue",
        2,
        "2010-12-01",
        q0
      );
      let s = q.queryString;
      let pars = q.parameterPlaceholders;
      let m = s.match(
        /^a fieldName b ({[^}]+}) c ({[^}]+}) d ({[^}]+}) e ({[^}]+})$/
      );
      pars.forEach((p, i) => {
        expect(p.key).toEqual(m[i + 1]);
      });
    });
  });

  describe("formatDict.", () => {
    it("should format a the string correctly", () => {
      let q0 = QueryObject.generateParameterQueryObject("20", "num");
      let dict = {
        unsafe_string: "fieldName",
        user_string: "someValue",
        user_num: 2,
        user_date: "2010-12-01",
        query_object: q0,
      };
      /* tslint:disable-next-line: max-line-length */
      let q = QueryObject.formatDict(
        "%(unsafe_string)UNSAFE a %(unsafe_string)UNSAFE b %(user_string)s c %(user_num)f d %(user_date)t e %(query_object)Q",
        dict
      );
      let s = q.queryString;
      let pars = q.parameterPlaceholders;
      let m = s.match(
        /^fieldName a fieldName b ({[^}]+}) c ({[^}]+}) d ({[^}]+}) e ({[^}]+})$/
      );
      pars.forEach((p, i) => {
        expect(p.key).toEqual(m[i + 1]);
      });
    });
  });

  describe("handles identifiers", () => {
    let qo: QueryObject;
    beforeEach(() => {
      qo = new QueryObject();
    });
    it("by shorten them to prevent sql errors", () => {
      let query =
        'SELECT 1 AS "patient.replace.me", 2 AS "not.to.be.replaced" FROM "Let me"."be.like.this"';
      let expected =
        /SELECT 1 AS "\w{8,9}", 2 AS "not\.to\.be\.replaced" FROM "Let me"\."be\.like\.this"/;
      let result = qo.shortenIdentifier(query);
      expect(result).toMatch(expected);
    });
    // TODO: moved to ../../../src/utils/ConnectionInterface repo
    // it("without effecting the result set", () =>{
    //     var mockDb = new mockdbLib.MockDb([["a", 1, "hello"], ["b", 2, "goodbye"]], [{label : "12345678", type : "VARCHAR"},
    //                                       {label : "87654321", type : "INTEGER"}, {label : "12344321", type : "VARCHAR"}]);
    //     var mockResultSet = mockDb.backdoorResultSet();
    //     var expectedResult = [{Col1 : "a", Col2 : 1, Col3 : "hello"}, {Col1 : "b", Col2: 2, Col3 : "goodbye"}];
    //     var identifierMap = {"12345678": "Col1", "87654321": "Col2", "12344321": "Col3"};

    //     var result = qol.parseResults(mockResultSet,identifierMap);
    //     expect(result).toEqual(expectedResult);
    // });
  });
});
