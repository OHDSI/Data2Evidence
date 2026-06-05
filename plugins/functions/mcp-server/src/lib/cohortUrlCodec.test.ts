import { assertEquals, assertExists } from "@std/assert";
import { compress, decompress } from "./cohortUrlCodec.ts";
// The REAL PA loader validator. convertBM2IFR is the only public export and it
// IS parseFilter (BMv2Parser.ts:170-172). If the fixture passes this, the
// frontend will accept the deep link, because this is exactly what the loader
// runs (bookmark.ts:434).
import BMv2Parser from "../../../../ui/apps/vue-mri-ui-lib/src/lib/bookmarks/BMv2Parser.ts";

/**
 * Hand-built minimal age+gender bookmark, matching buildMriBookmark's output
 * shape (mriQuery.ts):
 *   - one "Basic Data" FilterCard (configPath/instanceID "patient")
 *   - Age range = two Expressions (>=, <=) under an AND container
 *   - Gender = single "=" Expression under an OR container, value "FEMALE"
 *   - top-level cards: AND > [ OR > FilterCard ]
 */
function buildAgeGenderFixture() {
  return {
    filter: {
      configMetadata: { id: "test-config-id", version: "1" },
      cards: {
        type: "BooleanContainer",
        op: "AND",
        content: [
          {
            type: "BooleanContainer",
            op: "OR",
            content: [
              {
                type: "FilterCard",
                configPath: "patient",
                instanceNumber: 1,
                instanceID: "patient",
                name: "Basic Data",
                inactive: false,
                attributes: {
                  type: "BooleanContainer",
                  op: "AND",
                  content: [
                    {
                      type: "Attribute",
                      configPath: "patient.attributes.Age",
                      instanceID: "patient.attributes.Age",
                      constraints: {
                        type: "BooleanContainer",
                        op: "AND",
                        content: [
                          { type: "Expression", operator: ">=", value: 18 },
                          { type: "Expression", operator: "<=", value: 65 },
                        ],
                      },
                    },
                    {
                      type: "Attribute",
                      configPath: "patient.attributes.Gender_concept_name",
                      instanceID: "patient.attributes.Gender_concept_name",
                      constraints: {
                        type: "BooleanContainer",
                        op: "OR",
                        content: [
                          { type: "Expression", operator: "=", value: "FEMALE" },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
    metadata: { version: 3 },
  };
}

Deno.test("cohortUrlCodec round-trips the age+gender bookmark exactly", () => {
  const bookmark = buildAgeGenderFixture();

  const query = compress(bookmark);
  // Must be base64url: no +, /, or = (the deep-link query variant).
  assertEquals(/[+/=]/.test(query), false, "query must be base64url");

  const decoded = decompress(query);
  // Deep equal catches the binary-string/btoa porting trap silently corrupting
  // bytes — the one failure mode that produces a wrong cohort, not an error.
  assertEquals(decoded, bookmark);
});

Deno.test("the fixture's filter passes the real BMv2Parser (convertBM2IFR)", () => {
  const bookmark = buildAgeGenderFixture();

  // Round-trip through the codec first, then validate exactly what the loader
  // would hand to the parser after decompressing the deep link.
  const decoded = decompress<typeof bookmark>(compress(bookmark));

  // Must not throw; returns a built IFR. This is the loader's bookmark.ts:434.
  const ifr = BMv2Parser.convertBM2IFR(decoded.filter);
  assertExists(ifr);
});
