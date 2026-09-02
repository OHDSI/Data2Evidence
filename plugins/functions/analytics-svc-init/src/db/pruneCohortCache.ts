import { Knex } from "knex";

/**
 * Rows older than this are deleted at startup.
 *
 * Well above the read TTL by design: anything this old is already served as
 * stale and revalidated on read, so deleting it only reclaims rows nobody is
 * reading. Cutting too close to the TTL would instead turn a fast stale hit
 * into a blocking recompute for someone returning after a break.
 */
export const COHORT_CACHE_MAX_AGE_DAYS = 30;

/**
 * Reclaims abandoned cohort cache rows — bookmarks, datasets or PA configs
 * that no longer get read, and which no invalidation hook will ever revisit.
 *
 * Runs after the migrations, on every start. Never throws: the cache is a
 * latency optimisation, so a failed sweep must not stop analytics-svc from
 * coming up.
 */
export async function pruneCohortCache(k: Knex, schema: string): Promise<void> {
  try {
    const deleted = await k
      .withSchema(schema)
      .from("cohort_cache")
      .whereRaw("written_at < now() - make_interval(days => ?)", [
        COHORT_CACHE_MAX_AGE_DAYS,
      ])
      .del();

    console.log(
      `analytics-svc-init cohort_cache prune: removed ${deleted} entries older than ${COHORT_CACHE_MAX_AGE_DAYS} days`,
    );
  } catch (error) {
    console.error(
      "analytics-svc-init cohort_cache prune failed, continuing startup:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
