import { assertEquals, assertThrows } from "jsr:@std/assert";
import { isValidConceptId, substituteTemplateParams } from "./index.ts";

const baseParams = {
  cohortId: 1,
  schema: "cdm",
  vocabSchema: "cdm",
  resultsSchema: "cdm",
};

Deno.test("isValidConceptId accepts digit strings only", () => {
  assertEquals(isValidConceptId("201820"), true);
  assertEquals(isValidConceptId("0"), true);
  assertEquals(isValidConceptId("Acute bronchitis"), false);
  assertEquals(isValidConceptId("1; DROP TABLE"), false);
  assertEquals(isValidConceptId("12.3"), false);
  assertEquals(isValidConceptId(""), false);
});

Deno.test("substitutes CONCEPT_ID unquoted", () => {
  const sql =
    "SELECT {{CONCEPT_ID1}} AS concept_id, {{WILDCARD_FLAG1}} AS wildcard_flag";
  const out = substituteTemplateParams(sql, baseParams, {
    CONCEPT_ID1: "201820",
    WILDCARD_FLAG1: "1",
  });
  assertEquals(out, "SELECT 201820 AS concept_id, 1 AS wildcard_flag");
});

Deno.test("empty CONCEPT_ID slot defaults to 0", () => {
  const sql = "SELECT {{CONCEPT_ID2}} AS concept_id";
  const out = substituteTemplateParams(sql, baseParams, {});
  assertEquals(out, "SELECT 0 AS concept_id");
});

Deno.test("rejects a non-numeric CONCEPT_ID", () => {
  const sql = "SELECT {{CONCEPT_ID1}} AS concept_id";
  assertThrows(
    () =>
      substituteTemplateParams(sql, baseParams, {
        CONCEPT_ID1: "Acute bronchitis",
      }),
    Error,
    "Invalid CONCEPT_ID1",
  );
});

Deno.test("rejects a SQL-injection CONCEPT_ID", () => {
  const sql = "SELECT {{CONCEPT_ID1}} AS concept_id";
  assertThrows(
    () =>
      substituteTemplateParams(sql, baseParams, {
        CONCEPT_ID1: "1; DROP TABLE person",
      }),
    Error,
    "Invalid CONCEPT_ID1",
  );
});

Deno.test("concept_code path still works unchanged", () => {
  const sql = "SELECT '{{CONCEPT_CODE1}}' AS concept_code";
  const out = substituteTemplateParams(sql, baseParams, {
    CONCEPT_CODE1: "E11",
  });
  assertEquals(out, "SELECT 'E11' AS concept_code");
});
