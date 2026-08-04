import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects } from "@std/assert";

import {
  CacheIdResolutionError,
  DatasetCacheRecord,
  EmptyMappingsError,
  resolveCacheId,
  saveSourceToConceptMappings,
} from "./services.ts";

/** Canonical generator, verbatim from portal/src/dataset/entity/dataset.entity.ts:9-12. */
function sanitizeIdForCacheId(id: string): string {
  const cleaned = id.replace(/-/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

const fetcherFor = (
  records: Record<string, DatasetCacheRecord>,
): ((datasetId: string) => Promise<DatasetCacheRecord>) =>
(datasetId: string) => Promise.resolve(records[datasetId]);

describe("resolveCacheId", () => {
  it("returns the databaseCode when no datasetId is supplied (infra path)", async () => {
    assertEquals(await resolveCacheId("PG_MAIN", undefined, undefined), "PG_MAIN");
  });

  it("prefers the persisted cacheId over anything derivable", async () => {
    const fetch = fetcherFor({
      d1: { cacheId: "_abc_def", databaseCode: "PG_MAIN" },
    });
    assertEquals(await resolveCacheId("PG_MAIN", "d1", fetch), "_abc_def");
  });

  it("falls back to the record's databaseCode only when cacheId is genuinely absent", async () => {
    const fetch = fetcherFor({ d1: { cacheId: null, databaseCode: "PG_OLD" } });
    assertEquals(await resolveCacheId("REQ_CODE", "d1", fetch), "PG_OLD");
  });

  it("falls back to the request databaseCode when the record carries neither", async () => {
    const fetch = fetcherFor({ d1: {} });
    assertEquals(await resolveCacheId("REQ_CODE", "d1", fetch), "REQ_CODE");
  });

  it("raises CacheIdResolutionError when the lookup fails (never guesses)", async () => {
    const boom = () => Promise.reject(new Error("portal 500"));
    await assertRejects(
      () => resolveCacheId("PG_MAIN", "d1", boom),
      CacheIdResolutionError,
    );
  });

  it("raises CacheIdResolutionError when the dataset is not found", async () => {
    const fetch = fetcherFor({});
    await assertRejects(
      () => resolveCacheId("PG_MAIN", "missing", fetch),
      CacheIdResolutionError,
    );
  });

  it("raises CacheIdResolutionError when a datasetId is given but no fetcher is configured", async () => {
    await assertRejects(
      () => resolveCacheId("PG_MAIN", "d1", undefined),
      CacheIdResolutionError,
    );
  });
});

/**
 * Regression matrix. Each case is a dataset population whose persisted cache_id
 * legitimately diverges from anything derivable at the call site. Deriving the
 * cacheId (rather than reading it) regressed every case except D2.
 */
describe("cacheId resolution across dataset populations", () => {
  const DS_NEW = "3f2a1c44-1111-4aaa-9bbb-000000000001";
  const DS_SRC = "3f2a1c44-4444-4aaa-9bbb-000000000004";
  const DS_SNAP = "3f2a1c44-5555-4aaa-9bbb-000000000005";
  const DS_A = "3f2a1c44-7777-4aaa-9bbb-000000000007";
  const DS_B = "3f2a1c44-8888-4aaa-9bbb-000000000008";

  const records: Record<string, DatasetCacheRecord> = {
    // D1 newly created non-HANA dataset: cache_id generated from its own uuid
    [DS_NEW]: { cacheId: sanitizeIdForCacheId(DS_NEW), databaseCode: "PG_MAIN" },
    // D2 HANA dataset: cache_id is the databaseCode
    hana1: { cacheId: "HANA_1", databaseCode: "HANA_1" },
    // D3 legacy row: migration 1778417559068 backfilled cache_id = database_code
    legacy: { cacheId: "PG_OLD", databaseCode: "PG_OLD" },
    // D3b legacy row the backfill left null -> guarded fallback
    legacyNull: { cacheId: null, databaseCode: "PG_OLDER" },
    // D4 snapshot inherits the SOURCE dataset's cacheId, not its own uuid
    [DS_SNAP]: { cacheId: sanitizeIdForCacheId(DS_SRC), databaseCode: "PG_SNAP" },
    // D5 operator-supplied custom cacheId
    custom: { cacheId: "my_custom_cache", databaseCode: "PG_CUST" },
    // D6 two datasets sharing one databaseCode, distinct schemas
    [DS_A]: { cacheId: sanitizeIdForCacheId(DS_A), databaseCode: "PG_SHARE" },
    [DS_B]: { cacheId: sanitizeIdForCacheId(DS_B), databaseCode: "PG_SHARE" },
  };
  const fetch = fetcherFor(records);

  it("D1 new non-HANA dataset resolves to its stored cacheId", async () => {
    assertEquals(
      await resolveCacheId("PG_MAIN", DS_NEW, fetch),
      sanitizeIdForCacheId(DS_NEW),
    );
  });

  it("D2 HANA dataset resolves to the databaseCode", async () => {
    assertEquals(await resolveCacheId("HANA_1", "hana1", fetch), "HANA_1");
  });

  it("D3 legacy migrated dataset resolves to the backfilled database_code", async () => {
    assertEquals(await resolveCacheId("PG_OLD", "legacy", fetch), "PG_OLD");
  });

  it("D3b legacy dataset with a null cache_id falls back to its databaseCode", async () => {
    assertEquals(
      await resolveCacheId("PG_OLDER", "legacyNull", fetch),
      "PG_OLDER",
    );
  });

  it("D4 cloned dataset resolves to the SOURCE dataset's cacheId, not its own", async () => {
    const resolved = await resolveCacheId("PG_SNAP", DS_SNAP, fetch);
    assertEquals(resolved, sanitizeIdForCacheId(DS_SRC));
    // Deriving from the snapshot's own uuid was the regression.
    assertEquals(resolved === sanitizeIdForCacheId(DS_SNAP), false);
  });

  it("D5 custom operator-set cacheId is preserved verbatim", async () => {
    assertEquals(
      await resolveCacheId("PG_CUST", "custom", fetch),
      "my_custom_cache",
    );
  });

  it("D6 two datasets on one databaseCode resolve to DISTINCT cacheIds", async () => {
    const a = await resolveCacheId("PG_SHARE", DS_A, fetch);
    const b = await resolveCacheId("PG_SHARE", DS_B, fetch);
    assertEquals(a, sanitizeIdForCacheId(DS_A));
    assertEquals(b, sanitizeIdForCacheId(DS_B));
    // The collision any databaseCode-derived scheme cannot avoid.
    assertEquals(a === b, false);
  });
});

describe("saveSourceToConceptMappings payload validation ordering", () => {
  // zlib+base64 of `[]`
  const EMPTY_PAYLOAD = "eJyLjgUAARUAuQ==";

  it("rejects an empty payload with EmptyMappingsError before resolving the cacheId", async () => {
    let resolverCalled = false;
    const resolver = () => {
      resolverCalled = true;
      return Promise.resolve("_never_used");
    };

    await assertRejects(
      () => saveSourceToConceptMappings(resolver, "cdm", "vocab", EMPTY_PAYLOAD),
      EmptyMappingsError,
    );
    // Proves the 400 holds even when portal / the database is unavailable.
    assertEquals(resolverCalled, false);
  });
});
