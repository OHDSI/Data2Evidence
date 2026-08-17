import { assertEquals, assertThrows } from "jsr:@std/assert";
import { isValidConceptCode, substituteTemplateParams } from "./index.ts";

const baseParams = {
  cohortId: 1,
  schema: "cdm",
  vocabSchema: "cdm",
  resultsSchema: "cdm",
};

Deno.test("isValidConceptCode accepts SNOMED codes", () => {
  assertEquals(isValidConceptCode("73211009"), true);
  assertEquals(isValidConceptCode("E11"), true);
  assertEquals(isValidConceptCode("I10.9"), true);
});

Deno.test("isValidConceptCode rejects a concept name", () => {
  // The original bug: the wizard sent the concept name as CONCEPT_CODE, and the
  // space made the endpoint reject the whole request.
  assertEquals(isValidConceptCode("Acute bronchitis"), false);
});

Deno.test("isValidConceptCode rejects injection attempts", () => {
  assertEquals(isValidConceptCode("1; DROP TABLE"), false);
  assertEquals(isValidConceptCode("' OR '1'='1"), false);
  assertEquals(isValidConceptCode(""), false);
});

Deno.test("substitutes CONCEPT_CODE inside the template's quotes", () => {
  const sql =
    "SELECT '{{CONCEPT_CODE1}}' AS concept_code, {{WILDCARD_FLAG1}} AS wildcard_flag";
  const out = substituteTemplateParams(sql, baseParams, {
    CONCEPT_CODE1: "73211009",
    WILDCARD_FLAG1: "1",
  });
  assertEquals(
    out,
    "SELECT '73211009' AS concept_code, 1 AS wildcard_flag",
  );
});

Deno.test("empty CONCEPT_CODE slot substitutes to an empty string", () => {
  // Unused slots become '' in the SQL, which simply fails the join.
  const sql = "SELECT '{{CONCEPT_CODE2}}' AS concept_code";
  const out = substituteTemplateParams(sql, baseParams, {});
  assertEquals(out, "SELECT '' AS concept_code");
});

Deno.test("rejects a concept name passed as CONCEPT_CODE", () => {
  const sql = "SELECT '{{CONCEPT_CODE1}}' AS concept_code";
  assertThrows(
    () =>
      substituteTemplateParams(sql, baseParams, {
        CONCEPT_CODE1: "Acute bronchitis",
      }),
    Error,
    "Invalid CONCEPT_CODE1",
  );
});

Deno.test("rejects a SQL-injection CONCEPT_CODE", () => {
  const sql = "SELECT '{{CONCEPT_CODE1}}' AS concept_code";
  assertThrows(
    () =>
      substituteTemplateParams(sql, baseParams, {
        CONCEPT_CODE1: "1; DROP TABLE person",
      }),
    Error,
    "Invalid CONCEPT_CODE1",
  );
});

Deno.test("CONCEPT_IDS concept-set substitution is unaffected", () => {
  const sql = "SELECT * FROM concept WHERE concept_id IN ({{CONCEPT_IDS}})";
  const out = substituteTemplateParams(sql, baseParams, {}, [1, 2, 3]);
  assertEquals(
    out,
    "SELECT * FROM concept WHERE concept_id IN (1,2,3)",
  );
});
