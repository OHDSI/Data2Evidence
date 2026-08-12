/**
 * Freshness comparison for D2E issue 2410.
 *
 * A Logto access token carries the user's roles as a claim, computed when the
 * token was minted. `authz_changed_at` records the last time this user's
 * authorization was mutated. A token whose `iat` predates that moment is
 * carrying claims we already know to be out of date.
 *
 * Semantics, deliberately chosen:
 *  - `iat` is in SECONDS (RFC 7519); `authzChangedAt` has millisecond precision.
 *    We compare in seconds and round the change time UP, so a token minted in the
 *    same wall-clock second as the change is treated as STALE. A false "stale"
 *    costs one silent renewal; a false "fresh" is a security miss.
 *  - `skewMs` tolerates clock drift between Logto and this service by moving the
 *    change time slightly earlier. It bounds how long a just-pre-change token is
 *    still accepted, so keep it small.
 *  - A null/undefined `authzChangedAt` means no change has ever been recorded for
 *    this user, so every token is fresh. This is what makes the rollout silent.
 */
export const isTokenAuthzFresh = (
  iatSeconds: number | undefined,
  authzChangedAt: Date | null | undefined,
  skewMs: number
): boolean => {
  if (authzChangedAt == null) {
    return true
  }
  if (typeof iatSeconds !== 'number' || !Number.isFinite(iatSeconds)) {
    return false
  }
  // Backstop against a caller passing NaN/Infinity/negative: an unusable skew
  // must degrade to "no allowance", never poison the comparison. A NaN here
  // would make every comparison false and lock out every user at once.
  const allowanceMs = Number.isFinite(skewMs) && skewMs > 0 ? skewMs : 0
  const thresholdSeconds = Math.ceil((authzChangedAt.getTime() - allowanceMs) / 1000)
  return iatSeconds >= thresholdSeconds
}

export const DEFAULT_AUTHZ_FRESHNESS_SKEW_MS = 2000

/**
 * Parses the configured clock-skew allowance.
 *
 * Deliberately forgiving: an unset, empty, blank or non-numeric value falls back
 * to the default rather than reaching the comparison. `Number('')` is `0` and
 * `Number('abc')` is `NaN`, so the naive `Number(raw ?? '2000')` turns a typo or
 * an env var declared-but-empty by compose into a silent behaviour change — and
 * a `NaN` skew would mark every token stale, locking out every signed-in user
 * the moment the first authorization change is recorded.
 *
 * An explicit `0` is honoured: it means "no allowance", which is a real choice.
 * A negative value is rejected because it would move the threshold later and
 * reject tokens that are genuinely fresh.
 */
export const parseSkewMs = (
  raw: string | undefined | null,
  fallbackMs: number = DEFAULT_AUTHZ_FRESHNESS_SKEW_MS
): number => {
  if (raw == null || raw.trim() === '') {
    return fallbackMs
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallbackMs
  }
  return Math.floor(parsed)
}
