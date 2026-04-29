import { allowedPlaceholderRegex } from "../../../src/qe/config/configDefinition";
import { isSchemaAllowed } from "../../../src/qe/settings/Utils";

describe("Testing Allowed schemas regex,", () => {
  const t = new RegExp(allowedPlaceholderRegex);
  it("config definition - will not allow schemas in _SYS_*, SYS, SYSTEM, HANA_XS_BASE  format except _SYS_BIC", () => {
    expect(t.test(`_SYS_REPO."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`"_SYS_REPO"."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`"_SYS_BIC"."FAKE_TABLE"`)).toBeTruthy();
    expect(t.test(`_SYS_BIC."FAKE_TABLE"`)).toBeTruthy();
    expect(t.test(`"_SYS_biC"."FAKE_TABLE"`)).toBeTruthy();
    expect(t.test(`CDMDEFAULT."FAKE_TABLE"`)).toBeTruthy();
    expect(t.test(`CDMDEFAULT."FAKE_TABLE"`)).toBeTruthy();

    expect(t.test(`_SYS."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`SYS."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`SYSTEM."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`HANA_XS_BASE."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`"_SYS"."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`"SYS"."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`"SYSTEM"."FAKE_TABLE"`)).toBeFalsy();
    expect(t.test(`"HANA_Xs_BASE"."FAKE_TABLE"`)).toBeFalsy();

    expect(t.test(`"FAKE_TABLE"`)).toBeTruthy();
    expect(t.test(`."FAKE_TABLE"`)).toBeFalsy();
  });

  it("global settings schema - will not allow schemas in _SYS_*, SYS, SYSTEM, HANA_XS_BASE format except _SYS_BIC", () => {
    expect(isSchemaAllowed("CDMDEFAULT")).toBeTruthy();
    expect(isSchemaAllowed("_SYS_BIC")).toBeTruthy();

    expect(isSchemaAllowed("_SYS_234234")).toBeFalsy();
    expect(isSchemaAllowed("SYS")).toBeFalsy();
    expect(isSchemaAllowed("SYSTEM")).toBeFalsy();
    expect(isSchemaAllowed("_SYS")).toBeFalsy();
    expect(isSchemaAllowed("HANA_Xs_BASE")).toBeFalsy();
  });
});
