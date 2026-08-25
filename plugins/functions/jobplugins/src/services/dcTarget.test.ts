import { assertEquals, assertThrows } from "jsr:@std/assert";
import { resolveDcTarget } from "./dcTarget.ts";

Deno.test("webapi + postgres runs on the source with the registered results schema", () => {
  const target = resolveDcTarget(
    { id: "ds1", type: "webapi", dialect: "postgres", resultsSchemaName: "cdm_results" },
    "ignored_override",
  );
  assertEquals(target, { useSourceConnection: true, resultsSchema: "cdm_results" });
});

Deno.test("webapi + bigquery runs on the source with the registered results schema", () => {
  const target = resolveDcTarget(
    { id: "ds1", type: "webapi", dialect: "bigquery", resultsSchemaName: "cdm_results" },
    undefined,
  );
  assertEquals(target, { useSourceConnection: true, resultsSchema: "cdm_results" });
});

Deno.test("webapi dataset without a results schema fails fast as a client error", () => {
  const error = assertThrows(
    () => resolveDcTarget({ id: "ds1", type: "webapi", dialect: "postgres", resultsSchemaName: "" }, undefined),
    Error,
    "webapi dataset ds1 has no results schema configured",
  );
  // Tagged so the controller answers 400 instead of falling into the catch-all 500.
  assertEquals((error as Error & { statusCode?: number }).statusCode, 400);
});

Deno.test("non-webapi datasets keep the caller's schema handling", () => {
  const target = resolveDcTarget(
    { id: "ds1", type: undefined, dialect: "postgres", resultsSchemaName: "cdm_results" },
    undefined,
  );
  assertEquals(target, { useSourceConnection: false, resultsSchema: null });
});

Deno.test("webapi on a non-source dialect (hana) keeps current behavior", () => {
  const target = resolveDcTarget(
    { id: "ds1", type: "webapi", dialect: "hana", resultsSchemaName: "CDM_RESULTS" },
    undefined,
  );
  assertEquals(target, { useSourceConnection: false, resultsSchema: null });
});
