// Scale fake progress duration with real work complexity: T(n, P) = O(n^2 + n*P)
export const SPINNER_MIN_MS = 2000
export const SPINNER_MAX_MS = 90000
export const SPINNER_K_MS = 1500

export function computeExpectedDurationMs(ruleCount: number, patientCount: number | null | undefined): number {
  const n = Math.max(ruleCount, 0)
  const P = Math.max(patientCount ?? 1, 1)
  const cost = n * n + n * P
  const score = Math.log(cost + 1)
  const raw = SPINNER_MIN_MS + SPINNER_K_MS * score
  return Math.min(SPINNER_MAX_MS, Math.max(SPINNER_MIN_MS, raw))
}
