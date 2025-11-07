/**
 * Test suite for query utilities.
 */
import * as queryUtilsLib from "../../src/qe/utils/queryutils";
import { dw_views_pholderTableMap } from "../data/global/dw_views_pholdertablemap";

describe("--- QUERY UTILITIS TESTS ---", function () {
  describe("getAlias() ", function () {
    it("returns the request path *up to an including the interaction no.* for an interaction if there is a numbered interaction in the path", function () {
      let path = "my.long.path.to.interactions.priDiag.2.data";
      expect(queryUtilsLib.getAlias(path, "@INTERACTION")).toBe(
        "my.long.path.to.interactions.priDiag.2"
      );
    });

    it("returns null for @OBS, @CODE, @MEASURE, and @TEXT if there is no attribute in the path", function () {
      let path = "my.long.path.to.interactions.priDiag.2.data";
      expect(queryUtilsLib.getAlias(path, "@OBS")).toBeNull();
      expect(queryUtilsLib.getAlias(path, "@CODE")).toBeNull();
      expect(queryUtilsLib.getAlias(path, "@MEASURE")).toBeNull();
      expect(queryUtilsLib.getAlias(path, "@TEXT")).toBeNull();
    });

    it("returns the request path with $[tablecode] appended for @OBS, @CODE, @MEASURE, and @TEXT if there is an attribute in the path", function () {
      let path = "my.long.path.to.interactions.priDiag.2.attributes.data";
      expect(queryUtilsLib.getAlias(path, "@OBS")).toBe(path + "$obs");
      expect(queryUtilsLib.getAlias(path, "@CODE")).toBe(path + "$code");
      expect(queryUtilsLib.getAlias(path, "@MEASURE")).toBe(path + "$measure");
      expect(queryUtilsLib.getAlias(path, "@TEXT")).toBe(path + "$text");
    });

    it("returns null for an interaction if there are no numberd interactions in the path", function () {
      let path1 = "my.long.path.to.interactions.priDiag.data";
      let path2 = "my.long.path.to.priDiag.1.data";
      expect(queryUtilsLib.getAlias(path1, "@INTERACTION")).toBeNull();
      expect(queryUtilsLib.getAlias(path2, "@INTERACTION")).toBeNull();
    });

    it("returns the request path for and attribute", function () {
      let path = "my.long.path.to.data";
      expect(queryUtilsLib.getAlias(path, "@ATTRIBUTE")).toBe(path);
    });

    it("returns the request path for and attribute", function () {
      let path = "my.long.path.to.data";
      expect(queryUtilsLib.getAlias(path, "@ATTRIBUTE")).toBe(path);
    });

    it("throws an error for an unknown placeholder type", function () {
      let path = "my.long.path.to.data";
      expect(function () {
        queryUtilsLib.getAlias(path, "@UNKNOWN");
      }).toThrowError();
    });
  });

  //TYPESCRIPT: second parameter added to replacePlaceholderAndGetUsedAliases method
  describe("replacePlaceholderAndGetUsedAliases() ", function () {
    it("returns an empty result (with a null expression) if not expression is passed", function () {
      let path = "my.long.path.to.interactions.priDiag.2.data";
      expect(
        queryUtilsLib.replacePlaceholderAndGetUsedAliases(path, "")
      ).toEqual({ expression: null, aliases: [] });
    });

    it("returns an empty result (with an empty expression) if the expression does not contain any table placeholders", function () {
      let path = "my.long.path.to.interactions.priDiag.2.data";
      let expression = "HI, I CONTAIN NO PLACEHOLDERS";
      expect(
        queryUtilsLib.replacePlaceholderAndGetUsedAliases(path, expression)
      ).toEqual({ expression: "", aliases: [] });
    });

    it("returns the quoted aliases for all table placeholders", function () {
      let path = "my.long.path.to.interactions.priDiag.2.attributes.data";
      let expression = "HI, I CONTAIN @TEXT AND @OBS";
      let result = queryUtilsLib.replacePlaceholderAndGetUsedAliases(
        path,
        expression
      );
      expect(result.aliases).toEqual([
        '"' + queryUtilsLib.getAlias(path, "@TEXT") + '"',
        '"' + queryUtilsLib.getAlias(path, "@OBS") + '"',
      ]);
    });

    it("returns the SQl expression with all table placeholders replaced with the quoted aliases", function () {
      let path = "my.long.path.to.interactions.priDiag.2.attributes.data";
      let expression = "HI, I CONTAIN @TEXT AND @OBS";
      let result = queryUtilsLib.replacePlaceholderAndGetUsedAliases(
        path,
        expression
      );
      expect(result.expression).toEqual(
        'HI, I CONTAIN "' +
          queryUtilsLib.getAlias(path, "@TEXT") +
          '" AND "' +
          queryUtilsLib.getAlias(path, "@OBS") +
          '"'
      );
    });

    it("replacePlaceholderWithCustomString() replaces both table and columns", function () {
      let expression = "HI, I CONTAIN @TEXT AND @OBS";
      let result = queryUtilsLib.replacePlaceholderWithCustomString(
        dw_views_pholderTableMap,
        expression
      );
      expect(result).toEqual(
        `HI, I CONTAIN ${dw_views_pholderTableMap["@TEXT"]} AND ${dw_views_pholderTableMap["@OBS"]}`
      );

      expression = "@INTERACTION.INTERACTION_TYPE";
      result = queryUtilsLib.replacePlaceholderWithCustomString(
        dw_views_pholderTableMap,
        expression
      );
      expect(result).toEqual(
        `${dw_views_pholderTableMap["@INTERACTION"]}.${dw_views_pholderTableMap["@INTERACTION.INTERACTION_TYPE"]}`
      );

      expression = `@INTERACTION."customColumnName"`;
      result = queryUtilsLib.replacePlaceholderWithCustomString(
        dw_views_pholderTableMap,
        expression
      );
      expect(result).toEqual(
        `${dw_views_pholderTableMap["@INTERACTION"]}."customColumnName"`
      );
    });
  });
});
