/**
 * Pipeline test: clauses -> resolver (stubbed I/O) -> serializer -> codec,
 * with a best-effort round-trip through the REAL BMv2Parser.
 *
 * The structural assertions are the silent-wrong-cohort guard: a subtly wrong
 * tree loads the WRONG cohort, so we pin the exact shape (cards, paths,
 * instanceIDs, NOT for exclusion, compound measurement card).
 *
 * Run: deno test --allow-read --sloppy-imports --no-check src/lib/cohort_pipeline.test.ts
 */

import { buildCohortCatalog } from "./cohortCatalog.ts";
import { resolveClausesToConstraints, type ResolverDeps } from "./cohortResolver.ts";
import { buildCohortBookmarkTree } from "./cohortBookmarkTree.ts";
import type { CohortClause } from "./cohortClause.ts";
import { compress, decompress } from "./cohortUrlCodec.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}
function eq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`ASSERT FAILED: ${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const STAMP = { configId: "test-config", configVersion: "A" };

// Deterministic stubs so the resolver runs offline. Real deps hit the values
// endpoint; here categories just map raw -> upper. Concept sets are NOT resolved
// here — the agent resolves them to ids up front, so clauses carry conceptSetId.
const stubDeps: ResolverDeps = {
  resolveValue: (_card, _attr, raw) => Promise.resolve(raw.toUpperCase()),
};

// "aged > 50 with hypertension(111), systolic BP(222) < 120, excluding diabetes(333)"
const CLAUSES: CohortClause[] = [
  { card: "Basic Data", constraints: [{ attribute: "Age", op: ">", value: 50 }] },
  { card: "Condition Occurrence", conceptSetId: 111 },
  {
    card: "Measurement",
    conceptSetId: 222,
    constraints: [{ attribute: "Value As Number", op: "<", value: 120 }],
  },
  { card: "Condition Occurrence", conceptSetId: 333, exclude: true },
];

async function buildTree() {
  const configText = await Deno.readTextFile(new URL("../api/example.json", import.meta.url));
  const catalog = buildCohortCatalog(JSON.parse(configText));
  const constraints = await resolveClausesToConstraints(CLAUSES, catalog, stubDeps);
  return buildCohortBookmarkTree(constraints, STAMP);
}

Deno.test("tree shape: AND over 4 cards, exclusion wrapped in NOT", async () => {
  const bm = await buildTree();
  eq(bm.metadata.version, 3, "metadata.version");
  eq(bm.filter.configMetadata.id, "test-config", "configMetadata.id");
  eq(bm.filter.configMetadata.version, "A", "configMetadata.version");

  const cards = bm.filter.cards;
  eq(cards.op, "AND", "top op");
  eq(cards.content.length, 4, "number of card containers");

  // [0] patient inclusion
  const c0: any = cards.content[0];
  eq(c0.op, "OR", "patient container op");
  const fc0 = c0.content[0];
  eq(fc0.type, "FilterCard", "patient is FilterCard");
  eq(fc0.configPath, "patient", "patient configPath");
  eq(fc0.instanceID, "patient", "patient instanceID");
  eq(fc0.name, "Basic Data", "patient name");
  const age = fc0.attributes.content[0];
  eq(age.configPath, "patient.attributes.Age", "age configPath");
  eq(age.instanceID, "patient.attributes.Age", "age instanceID");
  eq(age.constraints.content[0].operator, ">", "age op");
  eq(age.constraints.content[0].value, 50, "age value");

  // [1] condition A (hypertension) -> primary conceptSet attr, id 111
  const fc1: any = cards.content[1].content[0];
  eq(fc1.name, "Condition Occurrence A", "condition A name");
  eq(fc1.instanceID, "patient.interactions.conditionoccurrence.1", "condition A instanceID");
  const condAttr = fc1.attributes.content[0];
  eq(condAttr.configPath, "patient.interactions.conditionoccurrence.attributes.conditionconceptset", "condition concept set path");
  eq(condAttr.constraints.content[0].value, "111", "hypertension concept set id");

  // [2] measurement A — COMPOUND: concept set + numval in ONE card
  const fc2: any = cards.content[2].content[0];
  eq(fc2.name, "Measurement A", "measurement name");
  eq(fc2.attributes.content.length, 2, "measurement has 2 attributes");
  const mAttrs = fc2.attributes.content.map((a: any) => a.configPath);
  assert(mAttrs.includes("patient.interactions.measurement.attributes.measurementconceptset"), "measurement concept set present");
  assert(mAttrs.includes("patient.interactions.measurement.attributes.numval"), "numval present");
  const numval = fc2.attributes.content.find((a: any) => a.configPath.endsWith("numval"));
  eq(numval.constraints.content[0].operator, "<", "numval op");
  eq(numval.constraints.content[0].value, 120, "numval value");

  // [3] EXCLUSION: diabetes condition wrapped in NOT
  const c3: any = cards.content[3];
  eq(c3.op, "NOT", "exclusion container is NOT");
  const inner = c3.content[0];
  eq(inner.op, "OR", "NOT wraps an OR");
  const fc3 = inner.content[0];
  eq(fc3.name, "Condition Occurrence B", "excluded condition name (B)");
  eq(fc3.instanceID, "patient.interactions.conditionoccurrence.2", "excluded condition instanceID .2");
  eq(fc3.attributes.content[0].constraints.content[0].value, "333", "diabetes concept set id");
});

Deno.test("numeric range -> two AND expressions", async () => {
  const configText = await Deno.readTextFile(new URL("../api/example.json", import.meta.url));
  const catalog = buildCohortCatalog(JSON.parse(configText));
  const constraints = await resolveClausesToConstraints(
    [{ card: "Basic Data", constraints: [{ attribute: "Age", op: "range", value: [50, 80] }] }],
    catalog,
    stubDeps,
  );
  const bm = buildCohortBookmarkTree(constraints, STAMP);
  const age: any = (bm.filter.cards.content[0] as any).content[0].attributes.content[0];
  eq(age.constraints.op, "AND", "range uses AND");
  eq(age.constraints.content.length, 2, "range has 2 expressions");
  eq(age.constraints.content[0].operator, ">=", "lower op");
  eq(age.constraints.content[1].operator, "<=", "upper op");
});

Deno.test("codec round-trips the bookmark", async () => {
  const bm = await buildTree();
  const round = decompress(compress(bm));
  eq(JSON.stringify(round), JSON.stringify(bm), "decompress(compress(x)) === x");
});

Deno.test("resolver rejects unknown card with an actionable error", async () => {
  const configText = await Deno.readTextFile(new URL("../api/example.json", import.meta.url));
  const catalog = buildCohortCatalog(JSON.parse(configText));
  let threw = false;
  try {
    await resolveClausesToConstraints([{ card: "Nonexistent Card", conceptSetId: 1 }], catalog, stubDeps);
  } catch (e) {
    threw = true;
    assert(String(e).includes("Unknown filter card"), "error names the problem");
  }
  assert(threw, "unknown card must throw");
});

Deno.test("real BMv2Parser accepts the generated bookmark (best-effort)", async () => {
  const bm = await buildTree();
  let parser: any;
  try {
    parser = await import(
      "../../../../ui/apps/vue-mri-ui-lib/src/lib/bookmarks/BMv2Parser.ts"
    );
  } catch (e) {
    console.warn("  [skip] real BMv2Parser not importable here:", String(e).slice(0, 120));
    return;
  }
  const convert = parser.default?.convertBM2IFR ?? parser.convertBM2IFR;
  assert(typeof convert === "function", "convertBM2IFR is a function");
  const ifr = convert(bm.filter); // throws if the tree is malformed
  assert(ifr, "convertBM2IFR returned an IFR");
  console.log("  [ok] real BMv2Parser parsed the bookmark");
});
