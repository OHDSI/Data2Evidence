import { env } from "../env.ts";

/**
 * How long a `analytics.cohort_cache` row is served before it is considered
 * stale.
 *
 * Expiry is deliberately *not* a delete and not a miss. An expired row is
 * still returned to the caller, flagged `stale`, so the Cohorts overview can
 * render immediately and revalidate in the background — a hard expiry would
 * hand one unlucky user per cycle the exact slow page load this cache exists
 * to remove.
 *
 * `COHORT_CACHE_TTL_HOURS` is required and validated as a positive number by
 * the env schema, so nothing here has to cope with it being absent or unusable.
 */

const MS_PER_HOUR = 60 * 60 * 1000;

/** The configured TTL for this process. */
export const getCohortCacheTtlMs = (): number =>
    env.COHORT_CACHE_TTL_HOURS * MS_PER_HOUR;

/**
 * True when `writtenAt` is at least one TTL old. A row with no usable
 * timestamp is reported stale: revalidating costs one query, whereas serving
 * an entry whose age is unknown has no bound.
 */
export const isCohortCacheEntryStale = (writtenAt: unknown): boolean => {
    const writtenAtMs =
        writtenAt instanceof Date ? writtenAt.getTime() : Number.NaN;
    if (!Number.isFinite(writtenAtMs)) {
        return true;
    }
    return Date.now() - writtenAtMs >= getCohortCacheTtlMs();
};
