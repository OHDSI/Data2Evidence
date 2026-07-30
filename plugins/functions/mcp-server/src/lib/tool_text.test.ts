/**
 * Guards the invariant that the model can SEE what a tool found.
 *
 * The MCP client forwards `structuredContent` only for tools that declare an
 * `outputSchema`, so data placed there alone is silently dropped and the model
 * gets a summary sentence with no ids in it. When that happened to
 * `list_concept_sets` the model re-called it 13 times and then guessed concept
 * set ids 1 and 2 (the real ones were 39 and 40), which 400'd.
 *
 * These assertions are deliberately about the ids being PRESENT IN THE TEXT —
 * that is the property that broke, and it is invisible in a type check.
 *
 * Run (deno lives in the trex container, not on the host):
 *   docker exec d2e-trex sh -c 'cd /usr/src/plugins/d2ef/mcp-server && \
 *     deno test --allow-read --sloppy-imports --no-check src/lib/tool_text.test.ts'
 */

import {
  formatConceptSetExpression,
  formatConceptSetListing,
  formatPhenotypeListing,
} from "./toolText.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}
function eq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `ASSERT FAILED: ${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

// The exact payload from the reported bug.
const ALZHEIMER_SETS = [
  { id: 39, name: "Alzheimer's disease", shared: false },
  { id: 40, name: "Alzheimer's 2", shared: false },
];

Deno.test("concept set listing carries the real ids, not just a count", () => {
  const text = formatConceptSetListing(ALZHEIMER_SETS);

  assert(text.includes("39"), "id 39 must be in the text");
  assert(text.includes("40"), "id 40 must be in the text");
  assert(text.includes("Alzheimer's disease"), "name must be in the text");
  assert(text.includes("Alzheimer's 2"), "second name must be in the text");
});

Deno.test("concept set listing flags shared sets", () => {
  const text = formatConceptSetListing([
    { id: 7, name: "Shared set", shared: true },
    { id: 8, name: "Private set", shared: false },
  ]);

  assert(text.includes("- 7 Shared set [shared]"), "shared set is marked");
  eq(text.includes("Private set [shared]"), false, "private set is not marked");
});

Deno.test("empty listing says so rather than rendering nothing", () => {
  eq(formatConceptSetListing([]), "(none)", "empty concept set list");
  eq(formatPhenotypeListing([]), "(no matches)", "empty phenotype list");
  eq(formatConceptSetExpression([]), "(empty)", "empty expression");
});

// A count cannot distinguish two sets that differ only by an exclusion, which is
// exactly the disambiguation the assistant is being asked to make.
Deno.test("concept set expression shows the flags that change its meaning", () => {
  const text = formatConceptSetExpression([
    { id: 378419, name: "Alzheimer's disease", useDescendants: true, useMapped: false, isExcluded: false },
    { id: 4182210, name: "Dementia", useDescendants: false, useMapped: false, isExcluded: true },
  ]);

  assert(text.includes("378419"), "concept id present");
  assert(text.includes("+descendants"), "descendants flag present");
  assert(text.includes("EXCLUDED"), "exclusion present — it narrows the cohort");
});

// The terminology service returns free-form JSON; a missing label must not turn
// into "undefined" text or throw.
Deno.test("expression tolerates rows with missing fields", () => {
  const text = formatConceptSetExpression([{ conceptId: 12 }, {}]);

  assert(text.includes("- 12"), "falls back to conceptId");
  assert(!text.includes("undefined"), `no undefined leaked: ${text}`);
});

Deno.test("expression handles a non-array payload", () => {
  eq(formatConceptSetExpression(undefined), "(empty)", "undefined expression");
  eq(formatConceptSetExpression(null), "(empty)", "null expression");
});

Deno.test("phenotype listing carries ids and names", () => {
  const text = formatPhenotypeListing([
    { cohortId: 123, cohortName: "Type 2 diabetes mellitus" },
    { cohortId: 124, cohortName: "Type 1 diabetes mellitus" },
  ]);

  assert(text.includes("123"), "phenotype id present");
  assert(text.includes("Type 2 diabetes mellitus"), "phenotype name present");
  assert(!text.includes("undefined"), `no undefined leaked: ${text}`);
});
