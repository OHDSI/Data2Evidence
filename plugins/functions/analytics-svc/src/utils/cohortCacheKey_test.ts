import assert from "node:assert/strict";
import {
    buildCohortCacheDatasetPrefix,
    buildCohortCacheKey,
    buildCohortCacheValue,
    isCohortCacheValue,
    parseCohortCacheKey,
} from "./cohortCacheKey.ts";

const parts = {
    datasetId: "d7fbb0d4-0c4f-4d33-9a4b-1f6bb2f0b111",
    paConfigId: "pa-config-7",
    bookmarkId: "bookmark-7",
};

Deno.test("buildCohortCacheKey emits version, datasetId, paConfigId, bookmarkId in order", () => {
    assert.equal(
        buildCohortCacheKey(parts),
        `${parts.datasetId}|${parts.paConfigId}|${parts.bookmarkId}`
    );
});

Deno.test("buildCohortCacheKey round-trips through parseCohortCacheKey", () => {
    assert.deepEqual(parseCohortCacheKey(buildCohortCacheKey(parts)), parts);
});

Deno.test("a bookmark id containing the delimiter cannot inject a segment", () => {
    const injecting = {
        ...parts,
        bookmarkId: "book|mark|7",
    };
    const key = buildCohortCacheKey(injecting);

    // Three segments, whatever the bookmark id contains.
    assert.equal(key.split("|").length, 3);
    assert.equal(
        key,
        `${parts.datasetId}|${parts.paConfigId}|book%7Cmark%7C7`
    );
    assert.deepEqual(parseCohortCacheKey(key), injecting);
});

Deno.test("a datasetId containing the delimiter cannot impersonate another dataset", () => {
    const keyA = buildCohortCacheKey({
        ...parts,
        datasetId: "dataset-a|pa-config-x",
        paConfigId: "pa-config-7",
    });
    const keyB = buildCohortCacheKey({
        ...parts,
        datasetId: "dataset-a",
        paConfigId: "pa-config-x|pa-config-7",
    });

    assert.notEqual(keyA, keyB);
    assert.equal(parseCohortCacheKey(keyA)?.datasetId, "dataset-a|pa-config-x");
    assert.equal(parseCohortCacheKey(keyB)?.datasetId, "dataset-a");
});

Deno.test("URL-escapable characters round-trip", () => {
    const escapable = {
        ...parts,
        bookmarkId: "a b/c?d&e=f#g%h+ié中\"j'k\\l",
    };
    const key = buildCohortCacheKey(escapable);

    assert.equal(key.split("|").length, 3);
    assert.deepEqual(parseCohortCacheKey(key), escapable);
});

Deno.test("an already-escaped bookmark id is not confused with its raw form", () => {
    const raw = buildCohortCacheKey({ ...parts, bookmarkId: "a b" });
    const escaped = buildCohortCacheKey({ ...parts, bookmarkId: "a%20b" });

    assert.notEqual(raw, escaped);
    assert.equal(parseCohortCacheKey(raw)?.bookmarkId, "a b");
    assert.equal(parseCohortCacheKey(escaped)?.bookmarkId, "a%20b");
});

Deno.test("buildCohortCacheKey rejects empty segments", () => {
    assert.throws(() => buildCohortCacheKey({ ...parts, datasetId: "" }));
    assert.throws(() => buildCohortCacheKey({ ...parts, paConfigId: "" }));
    assert.throws(() => buildCohortCacheKey({ ...parts, bookmarkId: "" }));
});

Deno.test("parseCohortCacheKey rejects keys of another shape or version", () => {
    assert.equal(parseCohortCacheKey("v0|a|b|c"), null);
    assert.equal(parseCohortCacheKey("a|b"), null);
    assert.equal(parseCohortCacheKey("a|b|c|d"), null);
    assert.equal(parseCohortCacheKey("a|b|%zz"), null);
    assert.equal(parseCohortCacheKey(""), null);
});

Deno.test("buildCohortCacheDatasetPrefix is the shared prefix of every key for the dataset", () => {
    const prefix = buildCohortCacheDatasetPrefix(parts.datasetId);

    assert.equal(prefix, `${parts.datasetId}|`);
    assert.ok(buildCohortCacheKey(parts).startsWith(prefix));
    assert.ok(
        buildCohortCacheKey({
            ...parts,
            paConfigId: "another-config",
            bookmarkId: "another-bookmark",
        }).startsWith(prefix)
    );
    assert.equal(
        buildCohortCacheKey({ ...parts, datasetId: "other-dataset" }).startsWith(
            prefix
        ),
        false
    );
});

Deno.test("buildCohortCacheDatasetPrefix escapes the delimiter", () => {
    assert.equal(
        buildCohortCacheDatasetPrefix("dataset|a"),
        `dataset%7Ca|`
    );
});

Deno.test("buildCohortCacheValue drops patientIds and keeps syntax and patientCount", () => {
    assert.deepEqual(
        buildCohortCacheValue({
            id: 1234,
            name: "Diabetes cohort",
            description: "",
            creationTimestamp: "2026-08-01",
            syntax: '{"datasetId":"d1","bookmarkId":"b1"}',
            patientCount: 4213,
            patientIds: ["p1", "p2"],
        }),
        {
            materializedCohort: {
                id: 1234,
                name: "Diabetes cohort",
                description: "",
                creationTimestamp: "2026-08-01",
                syntax: '{"datasetId":"d1","bookmarkId":"b1"}',
                patientCount: 4213,
            },
        }
    );
});

Deno.test("buildCohortCacheValue builds a negative entry from null or undefined", () => {
    assert.deepEqual(buildCohortCacheValue(null), {
        materializedCohort: null,
    });
    assert.deepEqual(buildCohortCacheValue(undefined), {
        materializedCohort: null,
    });
});

Deno.test("isCohortCacheValue accepts a negative entry and rejects junk", () => {
    // A negative entry is a hit, so the guard must let it through.
    assert.equal(isCohortCacheValue({ materializedCohort: null }), true);
    assert.equal(isCohortCacheValue({ materializedCohort: { name: "x" } }), true);
    assert.equal(isCohortCacheValue({}), false);
    assert.equal(isCohortCacheValue(null), false);
    assert.equal(isCohortCacheValue([]), false);
    assert.equal(isCohortCacheValue("materializedCohort"), false);
});
