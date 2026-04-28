/**
 * Test suite for the unit test utils.
 */

/* jslint undef:true */

import testUtilLib = require("../testutils/testutils");

/*
 * Test suite for normalizeSql().
 */
describe("TEST UTILITIES TEST SUITE", function () {
  describe("normalizeSql()... ", function () {
    it(" returns a capitalized SQL string when the argument does not contain quotations marks", function () {
      expect(
        testUtilLib.normalizeSql("select name from myschema.mytable")
      ).toBe("SELECT NAME FROM MYSCHEMA.MYTABLE");
      expect(
        testUtilLib.normalizeSql("SELECT NAME FROM MYSCHEMA.MYTABLE")
      ).toBe("SELECT NAME FROM MYSCHEMA.MYTABLE");
      expect(
        testUtilLib.normalizeSql("SELECT NaMe FROM MYschema.MYTABLE")
      ).toBe("SELECT NAME FROM MYSCHEMA.MYTABLE");
    });

    it(" replaces an arbitrary number of space characters with single spaces", function () {
      expect(
        testUtilLib.normalizeSql("SELECT    NAME FROM  \t  MYSCHEMA.MYTABLE")
      ).toBe("SELECT NAME FROM MYSCHEMA.MYTABLE");
    });

    it(" puts a single space on each side of parentheses", function () {
      expect(
        testUtilLib.normalizeSql(
          "SELECT NAME FROM MYSCHEMA.MYTABLE WHERE ((A > 1  ) AND (B < 2) )  )"
        )
      ).toBe(
        "SELECT NAME FROM MYSCHEMA.MYTABLE WHERE ( ( A > 1 ) AND ( B < 2 ) ) )"
      );
    });

    it(" replaces newlines with spaces", function () {
      expect(
        testUtilLib.normalizeSql(
          "SELECT NAME FROM MYSCHEMA.MYTABLE \nWHERE ( ( A > 1 ) AND\n ( B < 2 ) ) )"
        )
      ).toBe(
        "SELECT NAME FROM MYSCHEMA.MYTABLE WHERE ( ( A > 1 ) AND ( B < 2 ) ) )"
      );
    });

    it(" does not change the capitalization of strings inside double quotes", function () {
      expect(
        testUtilLib.normalizeSql(
          'SELECT NAME FROM "MySchema"."mytable" WHERE A > 1'
        )
      ).toBe('SELECT NAME FROM "MySchema"."mytable" WHERE A > 1');
    });

    it(" correctly handles double quotes at end of string", function () {
      expect(
        testUtilLib.normalizeSql('SELECT NAME FROM "MySchema"."mytable"')
      ).toBe('SELECT NAME FROM "MySchema"."mytable"');
    });

    it(" does not change the capitalization of strings inside single quotes", function () {
      expect(
        testUtilLib.normalizeSql(
          "SELECT NAME FROM MYSCHEMA.MYTABLE WHERE A = 'someValue' AND B = 'SOMEVALUE' AND C = 1"
        )
      ).toBe(
        "SELECT NAME FROM MYSCHEMA.MYTABLE WHERE A = 'someValue' AND B = 'SOMEVALUE' AND C = 1"
      );
    });

    it(" correctly handles single quotes at end of string", function () {
      expect(
        testUtilLib.normalizeSql(
          "SELECT NAME FROM MYSCHEMA.MYTABLE WHERE A = 'someValue' AND B = 'SOMEvalue'"
        )
      ).toBe(
        "SELECT NAME FROM MYSCHEMA.MYTABLE WHERE A = 'someValue' AND B = 'SOMEvalue'"
      );
    });

    it(" correctly normalizes string containing mixed (but non-embedded) single and double quotation marks", function () {
      expect(
        testUtilLib.normalizeSql(
          "SELECT NAME FROM \"MySchema\".\"mytable\" WHERE A = 'someValue' AND B = 'SOMEVALUE' AND C = 1"
        )
      ).toBe(
        "SELECT NAME FROM \"MySchema\".\"mytable\" WHERE A = 'someValue' AND B = 'SOMEVALUE' AND C = 1"
      );
    });

    it(" correctly handles strings with mixed features", function () {
      expect(
        testUtilLib.normalizeSql(
          "SELECT NAME FROM \"MySchema\".\"mytable\" \n WHERE \t A = 'someValue' AND B = 'SOMEVALUE' AND C = 1"
        )
      ).toBe(
        "SELECT NAME FROM \"MySchema\".\"mytable\" WHERE A = 'someValue' AND B = 'SOMEVALUE' AND C = 1"
      );
    });

    it(" correctly handles a realistic query snippet", function () {
      let rawSql = '"legacy.cdw.db.models::InterfaceViews.PATIENT" p0 ';
      let expectedSql = '"legacy.cdw.db.models::InterfaceViews.PATIENT" P0';
      expect(testUtilLib.normalizeSql(rawSql)).toBe(expectedSql);
    });

    it(" correctly handles a realistic query snippet by pattern matching", function () {
      let rawSql = '"legacy.cdw.db.models::InterfaceViews.PATIENT" p0 ';
      let expectedSql = '"legacy.cdw.db.models::InterfaceViews.PATIENT" P0';
      let expectedSqlRegExp = new RegExp(expectedSql);
      expect(testUtilLib.normalizeSql(rawSql)).toMatch(expectedSqlRegExp);
    });

    it(" correctly handles a realistic query", function () {
      let rawSql =
        'SELECT COUNT(DISTINCT(p0.PATIENT_ID)) AS pcount1, SUBSTR(c0.CODE,0,3) AS icd1 FROM "CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.PATIENT" p0 ';
      let expectedSql =
        'SELECT COUNT ( DISTINCT ( P0.PATIENT_ID ) ) AS PCOUNT1, SUBSTR ( C0.CODE,0,3 ) AS ICD1 FROM "CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.PATIENT" P0';
      expect(testUtilLib.normalizeSql(rawSql)).toBe(expectedSql);
    });

    it(" correctly handles a simple Medexplorer query", function () {
      let rawSql =
        "SELECT COUNT(DISTINCT(p0.PATIENT_ID)) AS pcount1, SUBSTR(c0.CODE,0,3) AS icd1" +
        ' FROM "CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.PATIENT" p0 ' +
        ' LEFT JOIN ("CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.INTERACTIONS" i0 ' +
        ' LEFT JOIN "CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV" c0 ' +
        " ON i0.INTERACTION_ID = c0.INTERACTION_ID AND c0.CATALOG = 'ICD' )" +
        " ON p0.PATIENT_ID = i0.PATIENT_ID AND i0.INTERACTION_TYPE = 'ACME_M03' " +
        " GROUP BY SUBSTR(c0.CODE,0,3) " +
        " HAVING COUNT(DISTINCT(p0.PATIENT_ID)) >= '15'" +
        " ORDER BY icd1 ASC";
      let expectedSql =
        "SELECT COUNT ( DISTINCT ( P0.PATIENT_ID ) ) AS PCOUNT1, SUBSTR ( C0.CODE,0,3 ) AS ICD1" +
        ' FROM "CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.PATIENT" P0' +
        ' LEFT JOIN ( "CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.INTERACTIONS" I0' +
        ' LEFT JOIN "CDMDEFAULT"."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV" C0' +
        " ON I0.INTERACTION_ID = C0.INTERACTION_ID AND C0.CATALOG = 'ICD' )" +
        " ON P0.PATIENT_ID = I0.PATIENT_ID AND I0.INTERACTION_TYPE = 'ACME_M03'" +
        " GROUP BY SUBSTR ( C0.CODE,0,3 )" +
        " HAVING COUNT ( DISTINCT ( P0.PATIENT_ID ) ) >= '15'" +
        " ORDER BY ICD1 ASC";
      expect(testUtilLib.normalizeSql(rawSql)).toBe(expectedSql);
    });
  });

  describe("getSqlRegExpString()... ", function () {
    it("replaces a single table alias with a regular expression", function () {
      let rawSql1 = "SELECT ID FROM MYSCHEMA.MYTABLE m1";
      let expectedRegExpString1 = "SELECT ID FROM MYSCHEMA\\.MYTABLE (\\w+)";
      expect(testUtilLib.getSqlRegExpString(rawSql1)).toBe(
        expectedRegExpString1
      );
      expect(testUtilLib.normalizeSql(rawSql1)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql1))
      );
      let rawSql2 = "BLAH JOIN ( MYTABLE m1 )";
      let expectedRegExpString2 = "BLAH JOIN \\( MYTABLE (\\w+) \\)";
      expect(testUtilLib.getSqlRegExpString(rawSql2)).toBe(
        expectedRegExpString2
      );
      expect(testUtilLib.normalizeSql(rawSql2)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql2))
      );
      let rawSql3 = 'BLAH JOIN "MYSCHEMA"."MYPACKAGE::MYTABLE" m1';
      let expectedRegExpString3 =
        'BLAH JOIN "MYSCHEMA"\\."MYPACKAGE::MYTABLE" (\\w+)';
      expect(testUtilLib.getSqlRegExpString(rawSql3)).toBe(
        expectedRegExpString3
      );
      expect(testUtilLib.normalizeSql(rawSql3)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql3))
      );
      let rawSql4 = 'BLAH JOIN "MYSCHEMA"."MY.PACKAGE::MYTABLE" m1';
      let expectedRegExpString4 =
        'BLAH JOIN "MYSCHEMA"\\."MY\\.PACKAGE::MYTABLE" (\\w+)';
      expect(testUtilLib.getSqlRegExpString(rawSql4)).toBe(
        expectedRegExpString4
      );
      expect(testUtilLib.normalizeSql(rawSql4)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql4))
      );
    });

    it("replaces a multiple table aliases according to order of occurrence", function () {
      let rawSql =
        'SELECT m1.ID FROM "MYSCHEMA"."MYTABLE" m1 JOIN "MYSCHEMA"."OTHERTABLE" t1 ON t1.X = m1.Y';
      let expectedRegExpString =
        'SELECT (\\w+)\\.ID FROM "MYSCHEMA"\\."MYTABLE" \\1 JOIN "MYSCHEMA"\\."OTHERTABLE" (\\w+) ON \\2\\.X = \\1\\.Y';
      expect(testUtilLib.getSqlRegExpString(rawSql)).toBe(expectedRegExpString);
      expect(testUtilLib.normalizeSql(rawSql)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql))
      );
    });

    it("replaces the column alias in a single AS-statement with a regular expression", function () {
      let rawSql1 = "SELECT COUNT(DISTINCT(p0.PATIENT_ID)) AS PCOUNT1";
      let expectedRegExpString1 =
        "SELECT COUNT \\( DISTINCT \\( P0\\.PATIENT_ID \\) \\) AS (\\w+)";
      let rawSql2 = "SELECT COUNT(DISTINCT(p0.PATIENT_ID)) AS PCOUNT1 WHERE";
      let expectedRegExpString2 =
        "SELECT COUNT \\( DISTINCT \\( P0\\.PATIENT_ID \\) \\) AS (\\w+) WHERE";
      expect(testUtilLib.getSqlRegExpString(rawSql1)).toBe(
        expectedRegExpString1
      );
      expect(testUtilLib.normalizeSql(rawSql1)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql1))
      );
      expect(testUtilLib.getSqlRegExpString(rawSql2)).toBe(
        expectedRegExpString2
      );
      expect(testUtilLib.normalizeSql(rawSql2)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql2))
      );
    });

    it("replaces a single column alias with a regular expression with back-references", function () {
      let rawSql =
        "SELECT COUNT(DISTINCT(p0.PATIENT_ID)) AS PCOUNT1 HAVING PCOUNT1 > 15";
      let expectedRegExpString =
        "SELECT COUNT \\( DISTINCT \\( P0\\.PATIENT_ID \\) \\) AS (\\w+) HAVING \\1 > 15";
      expect(testUtilLib.getSqlRegExpString(rawSql)).toBe(expectedRegExpString);
      expect(testUtilLib.normalizeSql(rawSql)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql))
      );
    });

    it("correctly orders multiple column aliases according to order of occurrence", function () {
      let rawSql =
        "SELECT X AS Z, S AS T, P AS Q FROM MYTABLE WHERE Q > 1 AND Z > 1 AND T > 1";
      let expectedRegExpString =
        "SELECT X AS (\\w+), S AS (\\w+), P AS (\\w+) FROM MYTABLE WHERE \\3 > 1 AND \\1 > 1 AND \\2 > 1";
      expect(testUtilLib.getSqlRegExpString(rawSql)).toBe(expectedRegExpString);
      expect(testUtilLib.normalizeSql(rawSql)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql))
      );
    });

    it("correctly handles mixtures of column and table aliases", function () {
      let rawSql = 'SELECT T.X AS Z FROM "MYSCHEMA"."MYTABLE" T WHERE Z > T.Y';
      let expectedRegExpString =
        'SELECT (\\w+)\\.X AS (\\w+) FROM "MYSCHEMA"\\."MYTABLE" \\1 WHERE \\2 > \\1\\.Y';
      expect(testUtilLib.getSqlRegExpString(rawSql)).toBe(expectedRegExpString);
      expect(testUtilLib.normalizeSql(rawSql)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql))
      );
    });

    it("handles a typical Medical Explorer query", function () {
      let rawSql =
        "SELECT COUNT(DISTINCT(p0.PATIENT_ID)) AS pcount1, SUBSTR(c0.CODE,0,3) AS icd1" +
        ' FROM "CDMDEFAULT"."legacy.cdw.db::PATIENT" p0 ' +
        ' LEFT JOIN ("CDMDEFAULT"."legacy.cdw.db::INTERACTIONS" i0 ' +
        ' LEFT JOIN "CDMDEFAULT"."legacy.cdw.db::INTERACTION_DETAILS" c0 ' +
        " ON i0.INTERACTION_ID = c0.INTERACTION_ID AND c0.CATALOG = 'ICD' )" +
        " ON p0.PATIENT_ID = i0.PATIENT_ID AND i0.INTERACTION_TYPE = 'ACME_M03' " +
        " GROUP BY SUBSTR(c0.CODE,0,3) " +
        " ORDER BY icd1 ASC";
      let expectedRegExpString =
        "SELECT COUNT \\( DISTINCT \\( (\\w+)\\.PATIENT_ID \\) \\) AS (\\w+), SUBSTR \\( (\\w+)\\.CODE,0,3 \\) AS (\\w+)" +
        ' FROM "CDMDEFAULT"\\."legacy\\.cdw\\.db::PATIENT" \\1' +
        ' LEFT JOIN \\( "CDMDEFAULT"\\."legacy\\.cdw\\.db::INTERACTIONS" (\\w+)' +
        ' LEFT JOIN "CDMDEFAULT"\\."legacy\\.cdw\\.db::INTERACTION_DETAILS" \\3' +
        " ON \\5\\.INTERACTION_ID = \\3\\.INTERACTION_ID AND \\3\\.CATALOG = 'ICD' \\)" +
        " ON \\1\\.PATIENT_ID = \\5\\.PATIENT_ID AND \\5\\.INTERACTION_TYPE = 'ACME_M03'" +
        " GROUP BY SUBSTR \\( \\3\\.CODE,0,3 \\)" +
        " ORDER BY \\4 ASC";
      expect(testUtilLib.getSqlRegExpString(rawSql)).toBe(expectedRegExpString);
      expect(testUtilLib.normalizeSql(rawSql)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql))
      );
    });

    it("does not replace columns aliases inside a single-quoted string", function () {
      let rawSql =
        "SELECT COUNT(DISTINCT(p0.PATIENT_ID)) AS pcount1, SUBSTR(c0.CODE,0,3) AS ICD1" +
        ' FROM "CDMDEFAULT"."legacy.cdw.db::PATIENT" p0 ' +
        ' LEFT JOIN ("CDMDEFAULT"."legacy.cdw.db::INTERACTIONS" i0 ' +
        ' LEFT JOIN "CDMDEFAULT"."legacy.cdw.db::INTERACTION_DETAILS" c0 ' +
        " ON i0.INTERACTION_ID = c0.INTERACTION_ID AND c0.CATALOG = 'ICD' )" +
        " ON p0.PATIENT_ID = i0.PATIENT_ID AND i0.INTERACTION_TYPE = 'ACME_M03 ICD1' " +
        " GROUP BY SUBSTR(c0.CODE,0,3) " +
        " ORDER BY icd1 ASC";
      let expectedRegExpString =
        "SELECT COUNT \\( DISTINCT \\( (\\w+)\\.PATIENT_ID \\) \\) AS (\\w+), SUBSTR \\( (\\w+)\\.CODE,0,3 \\) AS (\\w+)" +
        ' FROM "CDMDEFAULT"\\."legacy\\.cdw\\.db::PATIENT" \\1' +
        ' LEFT JOIN \\( "CDMDEFAULT"\\."legacy\\.cdw\\.db::INTERACTIONS" (\\w+)' +
        ' LEFT JOIN "CDMDEFAULT"\\."legacy\\.cdw\\.db::INTERACTION_DETAILS" \\3' +
        " ON \\5\\.INTERACTION_ID = \\3\\.INTERACTION_ID AND \\3\\.CATALOG = 'ICD' \\)" +
        " ON \\1\\.PATIENT_ID = \\5\\.PATIENT_ID AND \\5\\.INTERACTION_TYPE = 'ACME_M03 ICD1'" +
        " GROUP BY SUBSTR \\( \\3\\.CODE,0,3 \\)" +
        " ORDER BY \\4 ASC";
      expect(testUtilLib.getSqlRegExpString(rawSql)).toBe(expectedRegExpString);
      expect(testUtilLib.normalizeSql(rawSql)).toMatch(
        new RegExp(testUtilLib.getSqlRegExpString(rawSql))
      );
    });
  });

  /*
   * Test suite for toContainSameObjectsAsImpl().
   */
  describe("toContainSameObjectsAsImpl()... ", function () {
    it("matches two empty arrays", function () {
      let testObjectArr1 = [];
      let testObjectArr2 = [];

      expect(
        testUtilLib.toContainSameObjectsAsImpl(testObjectArr1, testObjectArr2)
      ).toBeTruthy();
    });

    it("matches for arrays both containing a single object array which are identical", function () {
      let testObjectArr1 = [
        {
          name: "hello",
        },
      ];
      let testObjectArr2 = [
        {
          name: "hello",
        },
      ];

      expect(
        testUtilLib.toContainSameObjectsAsImpl(testObjectArr1, testObjectArr2)
      ).toBeTruthy();
    });

    it("does not match for arrays containing single different objects", function () {
      let testObjectArr1 = [
        {
          name: "hello",
        },
      ];
      let testObjectArr2 = [
        {
          name: "good morning",
        },
      ];

      expect(
        testUtilLib.toContainSameObjectsAsImpl(testObjectArr1, testObjectArr2)
      ).toBeFalsy();
    });

    it("matches for multiple-element arrays with identical objects in same order", function () {
      let testObjectArr1 = [
        {
          name: "hello",
        },
        {
          phone: 123,
        },
        {
          age: 26,
        },
      ];
      let testObjectArr2 = [
        {
          name: "hello",
        },
        {
          phone: 123,
        },
        {
          age: 26,
        },
      ];

      expect(
        testUtilLib.toContainSameObjectsAsImpl(testObjectArr1, testObjectArr2)
      ).toBeTruthy();
    });

    it("does not match for arrays of different lengths", function () {
      let testObjectArr1 = [
        {
          name: "hello",
        },
        {
          age: 26,
        },
        {
          age: 26,
        },
      ];
      let testObjectArr2 = [
        {
          name: "hello",
        },
        {
          phone: 123,
        },
      ];

      expect(
        testUtilLib.toContainSameObjectsAsImpl(testObjectArr1, testObjectArr2)
      ).toBeFalsy();
    });

    it("does not match for arrays containing distinct elements", function () {
      let testObjectArr1 = [
        {
          name: "hello",
        },
        {
          age: 26,
        },
      ];
      let testObjectArr2 = [
        {
          name: "hello",
        },
        {
          phone: 123,
        },
      ];

      expect(
        testUtilLib.toContainSameObjectsAsImpl(testObjectArr1, testObjectArr2)
      ).toBeFalsy();
    });

    it("matches for multiple-element arrays with identical objects in different orders", function () {
      let testObjectArr1 = [
        {
          name: "hello",
        },
        {
          age: 26,
        },
        {
          phone: 123,
        },
      ];
      let testObjectArr2 = [
        {
          name: "hello",
        },
        {
          phone: 123,
        },
        {
          age: 26,
        },
      ];

      expect(
        testUtilLib.toContainSameObjectsAsImpl(testObjectArr1, testObjectArr2)
      ).toBeTruthy();
    });
  });

  describe("hashString()... ", function () {
    it("returns the same hash for the same string", function () {
      let str1 = '{ x : "hello", y : 2}';
      let str2 = '{ x : "hello", y : 2}';

      let hash1 = testUtilLib.hashString(str1);
      let hash2 = testUtilLib.hashString(str2);

      expect(hash1).toBe(hash2);
    });

    it("returns different hashes for different strings", function () {
      let str1 = '{ x : "hello", y : 2}';
      let str2 = '{ x : "hello", y : 3}';

      let hash1 = testUtilLib.hashString(str1);
      let hash2 = testUtilLib.hashString(str2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
