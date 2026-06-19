import { assertEquals, assertThrows } from "@std/assert";

import {
  CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
  ConceptSetCompoundIdSchema,
  ConceptSetIdParamSchema,
  ConceptSetRef,
  formatConceptSetRef,
  isConceptSetRefString,
  parseConceptSetRef,
} from "./conceptSetRef.ts";

// NOTE: We intentionally do NOT import WEBAPI_CONCEPT_SET_ID_OFFSET here because
// conceptset.service.ts pulls in env validation that requires runtime config.
// The constant equality is enforced by the literal assertion below and a
// comment in conceptSetRef.ts. If the offset in conceptset.service.ts changes,
// update CONCEPT_SET_LEGACY_OFFSET_BOUNDARY in lockstep.
Deno.test("CONCEPT_SET_LEGACY_OFFSET_BOUNDARY equals 1_000_000_000", () => {
  assertEquals(CONCEPT_SET_LEGACY_OFFSET_BOUNDARY, 1_000_000_000);
});

Deno.test("parseConceptSetRef parses canonical legacy compound form", () => {
  assertEquals(parseConceptSetRef("legacy:869"), {
    source: "legacy",
    externalId: 869,
  });
});

Deno.test("parseConceptSetRef parses canonical webapi compound form", () => {
  assertEquals(parseConceptSetRef("webapi:7"), {
    source: "webapi",
    externalId: 7,
  });
});

Deno.test("parseConceptSetRef parses bare numeric string below boundary as legacy (back-compat)", () => {
  assertEquals(parseConceptSetRef("869"), {
    source: "legacy",
    externalId: 869,
  });
});

Deno.test("parseConceptSetRef parses bare number below boundary as legacy (back-compat)", () => {
  assertEquals(parseConceptSetRef(869), {
    source: "legacy",
    externalId: 869,
  });
});

Deno.test("parseConceptSetRef decodes offset-encoded numeric string as webapi (back-compat)", () => {
  assertEquals(parseConceptSetRef("1000000007"), {
    source: "webapi",
    externalId: 7,
  });
});

Deno.test("parseConceptSetRef decodes offset-encoded number as webapi (back-compat)", () => {
  assertEquals(parseConceptSetRef(1_000_000_007), {
    source: "webapi",
    externalId: 7,
  });
});

Deno.test("parseConceptSetRef throws on unknown source prefix", () => {
  assertThrows(
    () => parseConceptSetRef("foo:1"),
    Error,
    "foo:1",
  );
});

Deno.test("parseConceptSetRef throws on negative externalId in compound form", () => {
  assertThrows(
    () => parseConceptSetRef("legacy:-1"),
    Error,
    "legacy:-1",
  );
});

Deno.test("parseConceptSetRef throws on non-integer externalId in compound form", () => {
  assertThrows(
    () => parseConceptSetRef("webapi:1.5"),
    Error,
    "webapi:1.5",
  );
});

Deno.test("parseConceptSetRef throws on empty string", () => {
  assertThrows(
    () => parseConceptSetRef(""),
    Error,
  );
});

Deno.test("parseConceptSetRef throws on negative number", () => {
  assertThrows(
    () => parseConceptSetRef(-1),
    Error,
    "-1",
  );
});

Deno.test("formatConceptSetRef formats legacy refs", () => {
  assertEquals(
    formatConceptSetRef({ source: "legacy", externalId: 869 }),
    "legacy:869",
  );
});

Deno.test("formatConceptSetRef formats webapi refs", () => {
  assertEquals(
    formatConceptSetRef({ source: "webapi", externalId: 7 }),
    "webapi:7",
  );
});

Deno.test("round-trip preserves legacy compound form", () => {
  assertEquals(formatConceptSetRef(parseConceptSetRef("legacy:1")), "legacy:1");
});

Deno.test("round-trip preserves webapi compound form", () => {
  assertEquals(
    formatConceptSetRef(parseConceptSetRef("webapi:42")),
    "webapi:42",
  );
});

Deno.test("isConceptSetRefString accepts canonical legacy form", () => {
  assertEquals(isConceptSetRefString("legacy:1"), true);
});

Deno.test("isConceptSetRefString accepts canonical webapi form", () => {
  assertEquals(isConceptSetRefString("webapi:1"), true);
});

Deno.test("isConceptSetRefString rejects bare numeric strings (not canonical)", () => {
  assertEquals(isConceptSetRefString("869"), false);
});

Deno.test("isConceptSetRefString rejects arbitrary strings", () => {
  assertEquals(isConceptSetRefString("foo"), false);
});

Deno.test("isConceptSetRefString rejects empty string", () => {
  assertEquals(isConceptSetRefString(""), false);
});

Deno.test("isConceptSetRefString rejects non-string values", () => {
  assertEquals(isConceptSetRefString(869), false);
});

Deno.test("isConceptSetRefString rejects non-integer compound form", () => {
  assertEquals(isConceptSetRefString("legacy:1.5"), false);
});

Deno.test("isConceptSetRefString rejects negative compound form", () => {
  assertEquals(isConceptSetRefString("legacy:-1"), false);
});

Deno.test("isConceptSetRefString rejects compound form with leading zeros (non-canonical)", () => {
  assertEquals(isConceptSetRefString("legacy:007"), false);
});

Deno.test("parseConceptSetRef throws on whitespace-padded input", () => {
  assertThrows(
    () => parseConceptSetRef("  legacy:1  "),
    Error,
  );
});

Deno.test("parseConceptSetRef throws on NaN", () => {
  assertThrows(
    () => parseConceptSetRef(NaN),
    Error,
  );
});

Deno.test("parseConceptSetRef throws on Infinity", () => {
  assertThrows(
    () => parseConceptSetRef(Infinity),
    Error,
  );
});

// Decision: bare numeric strings with leading zeros are accepted (back-compat
// tolerance). The compound form is canonical and strict; the bare-numeric path
// is the back-compat lenient path. Pins current behaviour of parseConceptSetRef("007").
Deno.test("parseConceptSetRef accepts bare numeric string with leading zeros (back-compat)", () => {
  assertEquals(parseConceptSetRef("007"), {
    source: "legacy",
    externalId: 7,
  });
});

Deno.test("parseConceptSetRef returns a fresh object on each call (immutability)", () => {
  const a = parseConceptSetRef("legacy:1");
  const b = parseConceptSetRef("legacy:1");
  assertEquals(a, b);
  // Ensure distinct object identity
  assertEquals(a === b, false);
});

Deno.test("ConceptSetRef type is exported and usable", () => {
  const ref: ConceptSetRef = { source: "webapi", externalId: 1 };
  assertEquals(ref.source, "webapi");
});

// --- ConceptSetCompoundIdSchema (strict canonical compound form) ---

Deno.test("ConceptSetCompoundIdSchema accepts legacy:1", () => {
  assertEquals(ConceptSetCompoundIdSchema.safeParse("legacy:1").success, true);
});

Deno.test("ConceptSetCompoundIdSchema accepts webapi:7", () => {
  assertEquals(ConceptSetCompoundIdSchema.safeParse("webapi:7").success, true);
});

Deno.test("ConceptSetCompoundIdSchema rejects bare numeric 869", () => {
  assertEquals(ConceptSetCompoundIdSchema.safeParse("869").success, false);
});

Deno.test("ConceptSetCompoundIdSchema rejects legacy:1.5 (non-integer)", () => {
  assertEquals(
    ConceptSetCompoundIdSchema.safeParse("legacy:1.5").success,
    false,
  );
});

Deno.test("ConceptSetCompoundIdSchema rejects empty string", () => {
  assertEquals(ConceptSetCompoundIdSchema.safeParse("").success, false);
});

// --- ConceptSetIdParamSchema (permissive: compound OR bare numeric) ---

Deno.test("ConceptSetIdParamSchema accepts legacy:1", () => {
  assertEquals(ConceptSetIdParamSchema.safeParse("legacy:1").success, true);
});

Deno.test("ConceptSetIdParamSchema accepts webapi:7", () => {
  assertEquals(ConceptSetIdParamSchema.safeParse("webapi:7").success, true);
});

Deno.test("ConceptSetIdParamSchema accepts bare numeric 869 (back-compat)", () => {
  assertEquals(ConceptSetIdParamSchema.safeParse("869").success, true);
});

Deno.test("ConceptSetIdParamSchema accepts offset-encoded numeric 1000000007 (back-compat)", () => {
  assertEquals(
    ConceptSetIdParamSchema.safeParse("1000000007").success,
    true,
  );
});

Deno.test("ConceptSetIdParamSchema rejects abc", () => {
  assertEquals(ConceptSetIdParamSchema.safeParse("abc").success, false);
});

Deno.test("ConceptSetIdParamSchema rejects empty string", () => {
  assertEquals(ConceptSetIdParamSchema.safeParse("").success, false);
});

Deno.test("ConceptSetIdParamSchema rejects legacy:abc", () => {
  assertEquals(
    ConceptSetIdParamSchema.safeParse("legacy:abc").success,
    false,
  );
});
