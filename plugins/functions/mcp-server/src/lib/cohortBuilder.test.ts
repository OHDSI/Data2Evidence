import { assertEquals, assertExists, assertObjectMatch } from "@std/assert";
import {
  buildCohortBookmark,
  buildDeepLinkUrl,
  extractConfigStamp,
  validateCohortSpec,
  type ConfigStamp,
} from "./cohortBuilder.ts";
import { decompress } from "./cohortUrlCodec.ts";
// Real PA loader validator — same oracle as the codec test. A spec that builds
// a tree convertBM2IFR rejects would silently load the wrong cohort.
import BMv2Parser from "../../../../ui/apps/vue-mri-ui-lib/src/lib/bookmarks/BMv2Parser.ts";

const CONFIG: ConfigStamp = { configId: "cfg-1", configVersion: "1" };

/** Decode a deep-link URL's query back to the bookmark, as the loader does. */
function decodeQuery(url: string) {
  const query = new URL(url, "https://x").searchParams.get("query")!;
  return decompress<any>(query);
}

Deno.test("extractConfigStamp reads the live getMyConfig LIST shape", () => {
  // Exact shape from a live analytics-svc response (datasetId c61914d0...).
  const data = [
    {
      meta: {
        configId: "4fce3cb7-32bf-4b46-8cba-32e4f77a14dd",
        configVersion: "A",
        configName: "OMOP",
      },
      config: { patient: { attributes: {} } },
    },
  ];
  assertEquals(extractConfigStamp(data), {
    configId: "4fce3cb7-32bf-4b46-8cba-32e4f77a14dd",
    configVersion: "A",
  });
});

Deno.test("extractConfigStamp tolerates a bare object and rejects missing/empty", () => {
  assertEquals(extractConfigStamp({ meta: { configId: "x", configVersion: "1" } }), {
    configId: "x",
    configVersion: "1",
  });
  assertEquals(extractConfigStamp([]), null);
  assertEquals(extractConfigStamp({ meta: {} }), null);
  assertEquals(extractConfigStamp(null), null);
});

Deno.test("validateCohortSpec rejects an empty spec", () => {
  const result = validateCohortSpec({});
  assertObjectMatch(result, { error: "Specify at least an age range or a gender." });
});

Deno.test("validateCohortSpec rejects an unmapped gender", () => {
  const result = validateCohortSpec({ gender: "nonbinary" });
  assertObjectMatch(result, { error: "Gender must be FEMALE or MALE." });
});

Deno.test("validateCohortSpec rejects ageMin greater than ageMax", () => {
  const result = validateCohortSpec({ ageMin: 80, ageMax: 20 });
  assertObjectMatch(result, { error: "ageMin (80) must not be greater than ageMax (20)." });
});

Deno.test("validateCohortSpec normalises gender casing", () => {
  const result = validateCohortSpec({ gender: "female" });
  assertEquals("spec" in result && result.spec.gender, "FEMALE");
});

Deno.test("age-only cohort builds a tree the real parser accepts", () => {
  const bookmark = buildCohortBookmark({ ageMin: 60 }, CONFIG);
  assertExists(BMv2Parser.convertBM2IFR(bookmark.filter));

  // Single bound => one Expression under OR.
  const card = bookmark.filter.cards.content[0].content[0] as any;
  const ageAttr = card.attributes.content[0];
  assertEquals(ageAttr.configPath, "patient.attributes.Age");
  assertEquals(ageAttr.constraints.op, "OR");
  assertEquals(ageAttr.constraints.content, [
    { type: "Expression", operator: ">=", value: 60 },
  ]);
});

Deno.test("age-range cohort builds two Expressions under AND", () => {
  const bookmark = buildCohortBookmark({ ageMin: 18, ageMax: 65 }, CONFIG);
  assertExists(BMv2Parser.convertBM2IFR(bookmark.filter));

  const card = bookmark.filter.cards.content[0].content[0] as any;
  const ageAttr = card.attributes.content[0];
  assertEquals(ageAttr.constraints.op, "AND");
  assertEquals(ageAttr.constraints.content.length, 2);
});

Deno.test("gender-only cohort builds a tree the real parser accepts", () => {
  const bookmark = buildCohortBookmark({ gender: "FEMALE" }, CONFIG);
  assertExists(BMv2Parser.convertBM2IFR(bookmark.filter));

  const card = bookmark.filter.cards.content[0].content[0] as any;
  const genderAttr = card.attributes.content[0];
  assertEquals(genderAttr.configPath, "patient.attributes.Gender_concept_name");
  assertEquals(genderAttr.constraints.content, [
    { type: "Expression", operator: "=", value: "FEMALE" },
  ]);
});

Deno.test("age+gender cohort builds both attributes and passes the parser", () => {
  const bookmark = buildCohortBookmark({ ageMin: 60, gender: "FEMALE" }, CONFIG);
  assertExists(BMv2Parser.convertBM2IFR(bookmark.filter));

  const card = bookmark.filter.cards.content[0].content[0] as any;
  assertEquals(card.attributes.content.length, 2);
});

Deno.test("deep-link URL is well-formed and round-trips through the loader codec", () => {
  const bookmark = buildCohortBookmark({ ageMin: 60, gender: "FEMALE" }, CONFIG);
  const { url, tooLong } = buildDeepLinkUrl(bookmark, "ds-123");

  assertEquals(tooLong, false);
  const parsed = new URL(url, "https://x");
  assertEquals(parsed.pathname, "/portal/researcher/cohort");
  assertEquals(parsed.searchParams.get("datasetId"), "ds-123");
  assertEquals(parsed.searchParams.get("linkType"), "cohort-definition");

  // The query the loader receives must decode back to exactly this bookmark.
  assertEquals(decodeQuery(url), bookmark);
});

Deno.test("buildDeepLinkUrl flags an over-length URL", () => {
  const bookmark = buildCohortBookmark({ ageMin: 60 }, CONFIG);
  const { tooLong } = buildDeepLinkUrl(bookmark, "x".repeat(2100));
  assertEquals(tooLong, true);
});
