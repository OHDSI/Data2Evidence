import { translateHanaToDuckdb } from "./hanaTranslation";

describe("translateHanaToDuckdb where hana and duckdb have same syntax", () => {
  it("should ", () => {
    const input = ``;
    const expected = ``;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should be same for empty string", () => {
    const input = ``;
    const expected = ``;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should reduce extra whitespace to a single space", () => {
    const input1 = ` `;
    const expected1 = ` `;
    expect(translateHanaToDuckdb(input1, "schema", "vocab_schema")).toBe(expected1);
    const input2 = `   `;
    const expected2 = ` `;
    expect(translateHanaToDuckdb(input2, "schema", "vocab_schema")).toBe(expected2);
  });
});

describe("translateHanaToDuckdb where hana and duckdb have different syntax", () => {
  it("", () => {
    const input = ``;
    const expected = ``;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should be different for temp table creation", () => {
    const input = `CREATE LOCAL TEMPORARY COLUMN TABLE someuniquename AS (select * from existingPatientTable where 1=0)`;
    const expected = `CREATE TEMPORARY TABLE someuniquename AS (select * from existingPatientTable where 1=0)`;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should be different when getting next value from a sequence", () => {
    const input = `select schema."SEQUENCE".nextval;`;
    const expected = `select nextval('schema."SEQUENCE"');`;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax when one parameter TO_VARCHAR is used", () => {
    const input = `SELECT TO_VARCHAR("COHORT_DEFINITION_DESCRIPTION") FROM schema."COHORT_DEFINITION"`;
    const expected = `SELECT ("COHORT_DEFINITION_DESCRIPTION")::varchar FROM schema."COHORT_DEFINITION"`;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax when two parameter TO_VARCHAR is used", () => {
    const input = `select TO_TIMESTAMP(TO_VARCHAR("COHORT_INITIATION_DATE", 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD HH24:MI:SS') from schema."TABLE";`;
    const expected = `select TO_TIMESTAMP(TO_CHAR("COHORT_INITIATION_DATE", 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD HH24:MI:SS') from schema."TABLE";`;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax for YEAR()", () => {
    const input = `select YEAR(CURRENT_DATE);`;
    const expected = `select date_part('year', current_date);`;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax for to_decimal(50)", () => {
    const input = `select to_decimal(50);`;
    const expected = `select (50)::decimal;`;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
  it("should have correct syntax for DAYS_BETWEEN", () => {
    const input = `TO_INTEGER(DAYS_BETWEEN ((("PATIENT"."DOB")),(("INTERACTION"."END"))) / 365)`;
    const expected = `TO_INTEGER(date_diff ('day', (("PATIENT"."DOB")),(("INTERACTION"."END"))) / 365)`;
    expect(translateHanaToDuckdb(input, "schema", "vocab_schema")).toBe(expected);
  });
});
