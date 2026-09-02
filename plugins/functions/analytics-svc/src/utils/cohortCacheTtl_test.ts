import * as assert from "@std/assert";
import { env } from "../env.ts";
import {
    getCohortCacheTtlMs,
    isCohortCacheEntryStale,
} from "./cohortCacheTtl.ts";

const HOUR_MS = 60 * 60 * 1000;

/**
 * `COHORT_CACHE_TTL_HOURS` is required and schema-validated, but `initEnv()`
 * only runs at service startup, so under test the value has to be set
 * directly. There is deliberately no fallback in the module to lean on.
 */
const withTtlHours = (hours: number, run: () => void): void => {
    const original = env.COHORT_CACHE_TTL_HOURS;
    env.COHORT_CACHE_TTL_HOURS = hours;
    try {
        run();
    } finally {
        env.COHORT_CACHE_TTL_HOURS = original;
    }
};

const agedHours = (hours: number): Date =>
    new Date(Date.now() - hours * HOUR_MS);

Deno.test("the configured TTL is read as hours", () => {
    withTtlHours(24, () => {
        assert.assertEquals(getCohortCacheTtlMs(), 24 * HOUR_MS);
    });
    withTtlHours(0.5, () => {
        assert.assertEquals(getCohortCacheTtlMs(), 30 * 60 * 1000);
    });
});

Deno.test("an entry younger than the TTL is fresh", () => {
    withTtlHours(24, () => {
        assert.assertEquals(isCohortCacheEntryStale(agedHours(23)), false);
    });
});

Deno.test("an entry older than the TTL is stale", () => {
    withTtlHours(24, () => {
        assert.assertEquals(isCohortCacheEntryStale(agedHours(25)), true);
    });
});

Deno.test("an entry exactly at the TTL is stale", () => {
    // The comparison is `>=`, and the clock only moves forward between building
    // this timestamp and reading it, so the boundary is not flaky.
    withTtlHours(24, () => {
        assert.assertEquals(isCohortCacheEntryStale(agedHours(24)), true);
    });
});

Deno.test("a shorter TTL expires an entry the default would still serve", () => {
    // Guards the unit: an entry 2 hours old is fresh under a 24h TTL and stale
    // under a 1h one.
    withTtlHours(24, () => {
        assert.assertEquals(isCohortCacheEntryStale(agedHours(2)), false);
    });
    withTtlHours(1, () => {
        assert.assertEquals(isCohortCacheEntryStale(agedHours(2)), true);
    });
});

Deno.test("an entry with no usable timestamp is stale", () => {
    // Revalidating costs one query; serving an entry of unknown age has no
    // bound on how wrong it can be.
    withTtlHours(24, () => {
        assert.assertEquals(isCohortCacheEntryStale(undefined), true);
        assert.assertEquals(isCohortCacheEntryStale(null), true);
        assert.assertEquals(
            isCohortCacheEntryStale("2026-09-01T00:00:00Z"),
            true,
        );
        assert.assertEquals(isCohortCacheEntryStale(new Date("nonsense")), true);
    });
});

Deno.test("a clock skewed into the future reads as fresh, not stale", () => {
    withTtlHours(24, () => {
        assert.assertEquals(isCohortCacheEntryStale(agedHours(-1)), false);
    });
});
