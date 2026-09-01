import * as assert from "@std/assert";
import {
    evictCohortCacheEntry,
    readBookmarkIdFromSyntax,
    readCohortDefinitionSyntax,
    refreshCohortCacheEntry,
    updateCohortCacheEntryMetadata,
} from "./cohortCacheMaintenance.ts";
import { buildCohortCacheKey } from "./cohortCacheKey.ts";

const DATASET = "dataset-1";
const PA_CONFIG = "pa-config-1";
const BOOKMARK = "bmk-1";
const KEY = buildCohortCacheKey({
    datasetId: DATASET,
    paConfigId: PA_CONFIG,
    bookmarkId: BOOKMARK,
});

const bookmarkSyntax = JSON.stringify({
    datasetId: DATASET,
    bookmarkId: BOOKMARK,
});

const fakeDao = (stored: Record<string, unknown> = {}) => {
    const calls: string[] = [];
    const deleted: string[] = [];
    const upserted: { key: string; value: unknown }[] = [];
    return {
        calls,
        deleted,
        upserted,
        // deno-lint-ignore require-await
        lookup: async (keys: string[]) => {
            calls.push("lookup");
            const found = new Map<string, unknown>();
            for (const k of keys) {
                if (Object.prototype.hasOwnProperty.call(stored, k)) {
                    found.set(k, stored[k]);
                }
            }
            return found as Map<string, never>;
        },
        // deno-lint-ignore require-await
        deleteKey: async (key: string) => {
            calls.push("deleteKey");
            deleted.push(key);
            return 1;
        },
        // deno-lint-ignore require-await
        upsert: async (entries: { key: string; value: unknown }[]) => {
            calls.push("upsert");
            upserted.push(...entries);
            return entries.length;
        },
    };
};

const cohortRow = (overrides: Record<string, unknown> = {}) => ({
    id: 42,
    name: "cohort 42",
    description: "",
    creationTimestamp: "2026-08-01",
    syntax: bookmarkSyntax,
    patientCount: 137,
    ...overrides,
});

// --- readBookmarkIdFromSyntax -------------------------------------------------

Deno.test("readBookmarkIdFromSyntax pulls the bookmark id out of valid syntax", () => {
    assert.assertEquals(readBookmarkIdFromSyntax(bookmarkSyntax), BOOKMARK);
});

Deno.test("readBookmarkIdFromSyntax returns null for an atlas-backed cohort", () => {
    const atlas = JSON.stringify({
        datasetId: DATASET,
        atlasCohortDefinitionId: 9,
    });
    assert.assertEquals(readBookmarkIdFromSyntax(atlas), null);
});

Deno.test("readBookmarkIdFromSyntax returns null for unparseable or empty syntax", () => {
    assert.assertEquals(readBookmarkIdFromSyntax("not json"), null);
    assert.assertEquals(readBookmarkIdFromSyntax(""), null);
    assert.assertEquals(readBookmarkIdFromSyntax(undefined), null);
    assert.assertEquals(readBookmarkIdFromSyntax(JSON.stringify({})), null);
});

// --- evictCohortCacheEntry ----------------------------------------------------

Deno.test("evict deletes the exact key for a bookmark-backed cohort", async () => {
    const dao = fakeDao();
    const evicted = await evictCohortCacheEntry(
        { syntax: bookmarkSyntax, datasetId: DATASET, paConfigId: PA_CONFIG },
        dao,
    );
    assert.assertEquals(evicted, true);
    assert.assertEquals(dao.deleted, [KEY]);
});

Deno.test("evict does nothing when the bookmark id cannot be recovered", async () => {
    const dao = fakeDao();
    const evicted = await evictCohortCacheEntry(
        { syntax: "not json", datasetId: DATASET, paConfigId: PA_CONFIG },
        dao,
    );
    // No dataset-wide fallback: an unaddressable entry is left to the TTL.
    assert.assertEquals(evicted, false);
    assert.assertEquals(dao.calls, []);
});

Deno.test("evict does nothing without a resolved paConfigId", async () => {
    const dao = fakeDao();
    const evicted = await evictCohortCacheEntry(
        { syntax: bookmarkSyntax, datasetId: DATASET, paConfigId: undefined },
        dao,
    );
    assert.assertEquals(evicted, false);
    assert.assertEquals(dao.calls, []);
});

Deno.test("evict swallows a DAO failure so the cohort write is unaffected", async () => {
    const dao = {
        lookup: () => Promise.resolve(new Map()),
        deleteKey: () => Promise.reject(new Error("postgres down")),
        upsert: () => Promise.resolve(0),
    };
    const evicted = await evictCohortCacheEntry(
        { syntax: bookmarkSyntax, datasetId: DATASET, paConfigId: PA_CONFIG },
        dao,
    );
    assert.assertEquals(evicted, false);
});

// --- refreshCohortCacheEntry --------------------------------------------------

Deno.test("refresh re-reads the cohort and upserts the entry", async () => {
    const dao = fakeDao();
    let queried: unknown;
    const cohortEndpoint = {
        getCohortDefinition: () => Promise.resolve({ data: [] }),
        queryCohorts: (params: Record<string, unknown>) => {
            queried = params;
            return Promise.resolve([cohortRow()]);
        },
    };

    const refreshed = await refreshCohortCacheEntry(
        {
            cohortEndpoint,
            cohortDefinitionId: 42,
            bookmarkId: BOOKMARK,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
        },
        dao,
    );

    assert.assertEquals(refreshed, true);
    // Queried by definition id, so patientCount is COUNT(DISTINCT SUBJECT_ID)
    // rather than an insert row count or a client-supplied number.
    assert.assertEquals(queried, { ID: 42 });
    assert.assertEquals(dao.upserted.length, 1);
    assert.assertEquals(dao.upserted[0].key, KEY);
    assert.assertEquals(dao.upserted[0].value, {
        materializedCohort: {
            id: 42,
            name: "cohort 42",
            description: "",
            creationTimestamp: "2026-08-01",
            syntax: bookmarkSyntax,
            patientCount: 137,
        },
    });
});

Deno.test("refresh never writes patientIds into the cache", async () => {
    const dao = fakeDao();
    const cohortEndpoint = {
        getCohortDefinition: () => Promise.resolve({ data: [] }),
        queryCohorts: () =>
            Promise.resolve([
                cohortRow({ patientIds: ["a", "b", "c"] }),
            ]),
    };

    await refreshCohortCacheEntry(
        {
            cohortEndpoint,
            cohortDefinitionId: 42,
            bookmarkId: BOOKMARK,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
        },
        dao,
    );

    const value = dao.upserted[0].value as {
        materializedCohort: Record<string, unknown>;
    };
    assert.assertEquals("patientIds" in value.materializedCohort, false);
});

Deno.test("refresh drops a stale entry when the cohort cannot be re-read", async () => {
    const dao = fakeDao();
    const cohortEndpoint = {
        getCohortDefinition: () => Promise.resolve({ data: [] }),
        queryCohorts: () => Promise.resolve([]),
    };

    const refreshed = await refreshCohortCacheEntry(
        {
            cohortEndpoint,
            cohortDefinitionId: 42,
            bookmarkId: BOOKMARK,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
        },
        dao,
    );

    // Caching a guess would be worse than a miss.
    assert.assertEquals(refreshed, false);
    assert.assertEquals(dao.deleted, [KEY]);
    assert.assertEquals(dao.upserted, []);
});

Deno.test("refresh swallows a query failure", async () => {
    const dao = fakeDao();
    const cohortEndpoint = {
        getCohortDefinition: () => Promise.resolve({ data: [] }),
        queryCohorts: () => Promise.reject(new Error("hana unavailable")),
    };

    const refreshed = await refreshCohortCacheEntry(
        {
            cohortEndpoint,
            cohortDefinitionId: 42,
            bookmarkId: BOOKMARK,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
        },
        dao,
    );
    assert.assertEquals(refreshed, false);
});

// --- readCohortDefinitionSyntax ----------------------------------------------

Deno.test("readCohortDefinitionSyntax accepts either column casing", async () => {
    const lower = {
        getCohortDefinition: () =>
            Promise.resolve({ data: [{ cohort_definition_syntax: bookmarkSyntax }] }),
        queryCohorts: () => Promise.resolve([]),
    };
    const upper = {
        getCohortDefinition: () =>
            Promise.resolve({ data: [{ COHORT_DEFINITION_SYNTAX: bookmarkSyntax }] }),
        queryCohorts: () => Promise.resolve([]),
    };
    assert.assertEquals(await readCohortDefinitionSyntax(lower, 42), bookmarkSyntax);
    assert.assertEquals(await readCohortDefinitionSyntax(upper, 42), bookmarkSyntax);
});

Deno.test("readCohortDefinitionSyntax returns null on a failed read", async () => {
    const endpoint = {
        getCohortDefinition: () => Promise.reject(new Error("gone")),
        queryCohorts: () => Promise.resolve([]),
    };
    assert.assertEquals(await readCohortDefinitionSyntax(endpoint, 42), null);
});

// --- ordering: evict must happen before the delete ---------------------------

Deno.test("the bookmark id is still recoverable while the definition exists", async () => {
    const dao = fakeDao();
    let definitionDeleted = false;
    const cohortEndpoint = {
        getCohortDefinition: () =>
            Promise.resolve({
                data: definitionDeleted
                    ? []
                    : [{ cohort_definition_syntax: bookmarkSyntax }],
            }),
        queryCohorts: () => Promise.resolve([]),
    };

    // deleteCohort's order: read, evict, then delete.
    const syntax = await readCohortDefinitionSyntax(cohortEndpoint, 42);
    await evictCohortCacheEntry(
        { syntax, datasetId: DATASET, paConfigId: PA_CONFIG },
        dao,
    );
    definitionDeleted = true;

    assert.assertEquals(dao.deleted, [KEY]);
});

Deno.test("evicting after the delete would be a silent no-op", async () => {
    const dao = fakeDao();
    let definitionDeleted = false;
    const cohortEndpoint = {
        getCohortDefinition: () =>
            Promise.resolve({
                data: definitionDeleted
                    ? []
                    : [{ cohort_definition_syntax: bookmarkSyntax }],
            }),
        queryCohorts: () => Promise.resolve([]),
    };

    // The wrong order: delete first, then try to recover the bookmark id.
    definitionDeleted = true;
    const syntax = await readCohortDefinitionSyntax(cohortEndpoint, 42);
    await evictCohortCacheEntry(
        { syntax, datasetId: DATASET, paConfigId: PA_CONFIG },
        dao,
    );

    // This is why deleteCohort evicts up front: no error, just a stale entry
    // left behind until the TTL expires it.
    assert.assertEquals(syntax, null);
    assert.assertEquals(dao.calls, []);
});

// --- updateCohortCacheEntryMetadata ------------------------------------------

Deno.test("metadata update rewrites name and description, preserving the count", async () => {
    const dao = fakeDao({
        [KEY]: {
            materializedCohort: {
                id: 42,
                name: "old name",
                description: "old description",
                creationTimestamp: "2026-08-01",
                syntax: bookmarkSyntax,
                patientCount: 137,
            },
        },
    });

    const updated = await updateCohortCacheEntryMetadata(
        {
            syntax: bookmarkSyntax,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
            name: "new name",
            description: "new description",
        },
        dao,
    );

    assert.assertEquals(updated, true);
    assert.assertEquals(dao.upserted[0].value, {
        materializedCohort: {
            id: 42,
            name: "new name",
            description: "new description",
            creationTimestamp: "2026-08-01",
            syntax: bookmarkSyntax,
            // A rename cannot change the count, so it is carried over rather
            // than recomputed — this is why the analytics DB is not touched.
            patientCount: 137,
        },
    });
});

Deno.test("metadata update never touches the analytics database", async () => {
    const dao = fakeDao({
        [KEY]: { materializedCohort: { id: 42, name: "old", patientCount: 9 } },
    });
    await updateCohortCacheEntryMetadata(
        {
            syntax: bookmarkSyntax,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
            name: "new",
        },
        dao,
    );
    // Only the cache's own connection is used: a lookup and an upsert, nothing
    // that could race cleanupMiddleware closing analyticsConnection.
    assert.assertEquals(dao.calls, ["lookup", "upsert"]);
});

Deno.test("metadata update is a no-op when nothing is cached", async () => {
    const dao = fakeDao();
    const updated = await updateCohortCacheEntryMetadata(
        {
            syntax: bookmarkSyntax,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
            name: "new name",
        },
        dao,
    );
    assert.assertEquals(updated, false);
    assert.assertEquals(dao.upserted, []);
});

Deno.test("metadata update leaves a negative entry alone", async () => {
    const dao = fakeDao({ [KEY]: { materializedCohort: null } });
    const updated = await updateCohortCacheEntryMetadata(
        {
            syntax: bookmarkSyntax,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
            name: "new name",
        },
        dao,
    );
    // A rename cannot turn "no cohort" into "a cohort".
    assert.assertEquals(updated, false);
    assert.assertEquals(dao.upserted, []);
});

Deno.test("metadata update swallows a DAO failure", async () => {
    const dao = {
        lookup: () => Promise.reject(new Error("postgres down")),
        deleteKey: () => Promise.resolve(0),
        upsert: () => Promise.resolve(0),
    };
    const updated = await updateCohortCacheEntryMetadata(
        {
            syntax: bookmarkSyntax,
            datasetId: DATASET,
            paConfigId: PA_CONFIG,
            name: "new name",
        },
        dao,
    );
    assert.assertEquals(updated, false);
});
