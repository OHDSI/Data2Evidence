import { describe, it } from "jsr:@std/testing@1/bdd";
import { assertEquals } from "jsr:@std/assert@1";
import { resolveCacheWriteTarget } from "./cacheWriteTarget.ts";

// Issue #2877 follow-through. Once a `source` row's cache_id became its databaseCode, the
// cache-file write target could no longer be read off the source row: it would name the
// cache file after the source connection's trex alias, and the cache dataset (which holds
// its own per-dataset catalog) would point at a catalog nobody wrote.

const SOURCE_PG = { cacheId: "pg_db", databaseCode: "pg_db" };
const CACHE_DS = { cacheId: "_a1b2c3d4_snap", databaseCode: "pg_db" };

describe("resolveCacheWriteTarget", () => {
  it("writes to the cache dataset's own catalog, not the source's databaseCode", () => {
    assertEquals(resolveCacheWriteTarget(SOURCE_PG, CACHE_DS), "_a1b2c3d4_snap");
  });

  it("regression: never returns the source databaseCode when a cache dataset exists", () => {
    const target = resolveCacheWriteTarget(SOURCE_PG, CACHE_DS);
    assertEquals(target === SOURCE_PG.databaseCode, false);
  });

  it("falls back to the source cache_id when there is no cache dataset", () => {
    assertEquals(resolveCacheWriteTarget(SOURCE_PG, undefined), "pg_db");
  });

  it("falls back to the source cache_id for a legacy cache dataset with null cache_id", () => {
    assertEquals(
      resolveCacheWriteTarget(SOURCE_PG, { cacheId: null, databaseCode: "pg_db" }),
      "pg_db",
    );
  });

  it("falls back to the source databaseCode when the source has no cache_id", () => {
    assertEquals(
      resolveCacheWriteTarget({ cacheId: null, databaseCode: "pg_db" }, null),
      "pg_db",
    );
  });

  it("keeps HANA writing to its databaseCode", () => {
    assertEquals(
      resolveCacheWriteTarget(
        { cacheId: "HANA_DB", databaseCode: "HANA_DB" },
        { cacheId: "HANA_DB", databaseCode: "HANA_DB" },
      ),
      "HANA_DB",
    );
  });

  it("returns undefined when nothing is resolvable", () => {
    assertEquals(resolveCacheWriteTarget({}, null), undefined);
  });
});
