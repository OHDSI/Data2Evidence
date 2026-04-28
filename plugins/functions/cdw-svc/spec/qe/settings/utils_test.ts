import { parseDbObjectName } from "../../../src/qe/settings/Utils";

describe("QE settings utils", () => {
  it("parseDbObjectName()...", () => {
    const resultNoSchema = parseDbObjectName(
      `"legacy.cdw.db.models::DWViews.Observations"`
    );
    expect(resultNoSchema.schema).toEqual("");
    expect(resultNoSchema.tableName).toEqual(
      "legacy.cdw.db.models::DWViews.Observations"
    );

    const resultWithSchemaQuoted = parseDbObjectName(
      `"CDMDEFAULT"."legacy.cdw.db.models::DWViews.Observations"`
    );
    expect(resultWithSchemaQuoted.schema).toEqual("CDMDEFAULT");
    expect(resultWithSchemaQuoted.tableName).toEqual(
      "legacy.cdw.db.models::DWViews.Observations"
    );

    const resultWithSchemaUnquoted = parseDbObjectName(
      `CDMDEFAULT."legacy.cdw.db.models::DWViews.Observations"`
    );
    expect(resultWithSchemaUnquoted.schema).toEqual("CDMDEFAULT");
    expect(resultWithSchemaUnquoted.tableName).toEqual(
      "legacy.cdw.db.models::DWViews.Observations"
    );
  });
});
