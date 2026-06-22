import {
    CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
    formatConceptSetRef,
    isConceptSetRefString,
    parseConceptSetRef,
} from "./conceptSetRef";

describe("parseConceptSetRef", () => {
    it("parses canonical legacy compound form", () => {
        expect(parseConceptSetRef("legacy:869")).toEqual({
            source: "legacy",
            externalId: 869,
        });
    });

    it("parses canonical webapi compound form", () => {
        expect(parseConceptSetRef("webapi:7")).toEqual({
            source: "webapi",
            externalId: 7,
        });
    });

    it("parses bare numeric string below boundary as legacy (back-compat)", () => {
        expect(parseConceptSetRef("869")).toEqual({
            source: "legacy",
            externalId: 869,
        });
    });

    it("decodes offset-encoded numeric string as webapi (back-compat)", () => {
        expect(
            parseConceptSetRef(String(CONCEPT_SET_LEGACY_OFFSET_BOUNDARY + 7))
        ).toEqual({ source: "webapi", externalId: 7 });
    });

    it("throws on unknown source prefix", () => {
        expect(() => parseConceptSetRef("foo:1")).toThrow(/foo:1/);
    });

    it("throws on garbage input", () => {
        expect(() => parseConceptSetRef("not-an-id")).toThrow();
    });

    it("throws on empty string", () => {
        expect(() => parseConceptSetRef("")).toThrow();
    });
});

describe("formatConceptSetRef", () => {
    it("round-trips legacy compound form", () => {
        expect(formatConceptSetRef(parseConceptSetRef("legacy:1"))).toEqual(
            "legacy:1"
        );
    });

    it("round-trips webapi compound form", () => {
        expect(formatConceptSetRef(parseConceptSetRef("webapi:42"))).toEqual(
            "webapi:42"
        );
    });
});

describe("isConceptSetRefString", () => {
    it("accepts canonical legacy form", () => {
        expect(isConceptSetRefString("legacy:1")).toBe(true);
    });

    it("rejects bare numeric strings (not canonical)", () => {
        expect(isConceptSetRefString("869")).toBe(false);
    });

    it("rejects arbitrary strings", () => {
        expect(isConceptSetRefString("foo")).toBe(false);
    });
});
