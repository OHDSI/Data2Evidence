import { translateHanaToPostgres } from "./hanaTranslation";

describe("translateHanaToPostgres where hana and postgres have same syntax", () => {
  it("should ", () => {
    const input = ``;
    const expected = ``;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should be same for empty string", () => {
    const input = ``;
    const expected = ``;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should reduce extra whitespace to a single space", () => {
    const input1 = ` `;
    const expected1 = ` `;
    expect(translateHanaToPostgres(input1, "schema", "vocab_schema")).toBe(expected1);
    const input2 = `   `;
    const expected2 = ` `;
    expect(translateHanaToPostgres(input2, "schema", "vocab_schema")).toBe(expected2);
  });
  it("should replace $$SCHEMA$$ placeholder correctly", () => {
    const input = `select * from $$SCHEMA$$."TABLE";`;
    const expected = `select * from schema."TABLE";`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
});

describe("translateHanaToPostgres where hana and postgres have different syntax", () => {
  it("", () => {
    const input = ``;
    const expected = ``;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should be different for temp table creation", () => {
    const input = `CREATE LOCAL TEMPORARY COLUMN TABLE someuniquename AS (select * from existingPatientTable where 1=0)`;
    const expected = `CREATE TEMPORARY TABLE someuniquename AS (select * from existingPatientTable where 1=0)`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should be different when getting next value from a sequence", () => {
    const input = `select schema."SEQUENCE".nextval;`;
    const expected = `select nextval('schema."SEQUENCE"');`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax when one parameter TO_VARCHAR is used", () => {
    const input = `SELECT TO_VARCHAR("COHORT_DEFINITION_DESCRIPTION") FROM schema."COHORT_DEFINITION"`;
    const expected = `SELECT ("COHORT_DEFINITION_DESCRIPTION")::varchar FROM schema."COHORT_DEFINITION"`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax when two parameter TO_VARCHAR is used", () => {
    const input = `select TO_TIMESTAMP(TO_VARCHAR("COHORT_INITIATION_DATE", 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD HH24:MI:SS') from schema."TABLE";`;
    const expected = `select TO_TIMESTAMP(TO_CHAR("COHORT_INITIATION_DATE", 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD HH24:MI:SS') from schema."TABLE";`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax for regex search", () => {
    const input = `(@REF."CONCEPT_CODE") LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'`;
    const expected = `(@REF."CONCEPT_CODE") ~* '@SEARCH_QUERY' `;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax for YEAR()", () => {
    const input = `select YEAR(CURRENT_DATE);`;
    const expected = `select date_part('year', current_date);`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax for to_decimal(50)", () => {
    const input = `select to_decimal(50);`;
    const expected = `select (50)::decimal;`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax for DAYS_BETWEEN", () => {
    const input = `TO_INTEGER(DAYS_BETWEEN ((("PATIENT"."DOB")),(("INTERACTION"."END"))) / 365)`;
    const expected = `TO_INTEGER(("INTERACTION"."END"::date - "PATIENT"."DOB"::date) / 365)`;
    expect(translateHanaToPostgres(input, "schema", "vocab_schema")).toBe(expected);
  });
});
