import { assertEquals, assertThrows } from "@std/assert";
import {
    CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
    formatConceptSetRef,
    isConceptSetRefString,
    parseConceptSetRef,
} from "./conceptSetRef";

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

Deno.test(
    "parseConceptSetRef parses bare numeric string below boundary as legacy (back-compat)",
    () => {
        assertEquals(parseConceptSetRef("869"), {
            source: "legacy",
            externalId: 869,
        });
    },
);

Deno.test(
    "parseConceptSetRef decodes offset-encoded numeric string as webapi (back-compat)",
    () => {
        assertEquals(
            parseConceptSetRef(String(CONCEPT_SET_LEGACY_OFFSET_BOUNDARY + 7)),
            { source: "webapi", externalId: 7 },
        );
    },
);

Deno.test("parseConceptSetRef throws on unknown source prefix", () => {
    assertThrows(
        () => parseConceptSetRef("foo:1"),
        Error,
        "foo:1",
    );
});

Deno.test("parseConceptSetRef throws on garbage input", () => {
    assertThrows(() => parseConceptSetRef("not-an-id"), Error);
});

Deno.test("parseConceptSetRef throws on empty string", () => {
    assertThrows(() => parseConceptSetRef(""), Error);
});

Deno.test("formatConceptSetRef round-trips legacy compound form", () => {
    assertEquals(
        formatConceptSetRef(parseConceptSetRef("legacy:1")),
        "legacy:1",
    );
});

Deno.test("formatConceptSetRef round-trips webapi compound form", () => {
    assertEquals(
        formatConceptSetRef(parseConceptSetRef("webapi:42")),
        "webapi:42",
    );
});

Deno.test("isConceptSetRefString accepts canonical legacy form", () => {
    assertEquals(isConceptSetRefString("legacy:1"), true);
});

Deno.test("isConceptSetRefString rejects bare numeric strings (not canonical)", () => {
    assertEquals(isConceptSetRefString("869"), false);
});

Deno.test("isConceptSetRefString rejects arbitrary strings", () => {
    assertEquals(isConceptSetRefString("foo"), false);
});
