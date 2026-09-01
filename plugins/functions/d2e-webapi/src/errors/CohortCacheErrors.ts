/**
 * Thrown when the cohort cache lookup returns a body that does not match
 * `CohortCacheLookupResponseSchema`.
 *
 * Distinguished from a transport failure on purpose. A transport failure means
 * the cache is unreachable, so there is no point writing to it — the read
 * degrades to `UNAVAILABLE` and nothing is written back. A shape failure means
 * the cache is reachable but holds something unusable, which recomputing and
 * rewriting will overwrite. That path degrades to `MISS` instead, so a bad row
 * repairs itself on the next load rather than disabling the cache for the
 * dataset indefinitely — there is no TTL to clear it otherwise.
 */
export class CohortCacheShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CohortCacheShapeError";
  }
}
