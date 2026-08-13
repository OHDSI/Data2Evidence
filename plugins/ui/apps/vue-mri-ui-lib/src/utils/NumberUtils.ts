/**
 * Written to `currentPatientCount` while the chart query that recomputes it is in
 * flight. That query takes 7-24s on some datasets, and until it lands nothing else
 * invalidates the previous cohort's count — so a reader arriving mid-flight would
 * otherwise get the OLD cohort's number with no way to tell it apart from a real
 * result. Distinct from '--', which means the query FAILED.
 */
export const PENDING_PATIENT_COUNT = 'loading'

/**
 * Formats a number with comma separators using US locale (en-US)
 * @param value - The number to format (can be string for error states like '--')
 * @returns Formatted string with comma separators, or the original string if not a number
 * @example
 * formatNumber(1234) // "1,234"
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(null) // "0"
 * formatNumber('--') // "--"
 * formatNumber(PENDING_PATIENT_COUNT) // "…"
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0'
  }
  // Language-neutral, and narrower than the raw sentinel: the count renders as
  // "… / 2,694" while the query runs rather than leaking the word "loading".
  if (value === PENDING_PATIENT_COUNT) {
    return '…'
  }
  if (typeof value === 'string') {
    // Try to parse as number, if it fails return the string as-is (for error states like '--')
    const parsed = Number(value)
    if (isNaN(parsed)) {
      return value
    }
    return parsed.toLocaleString('en-US')
  }
  if (isNaN(value)) {
    return '0'
  }
  return value.toLocaleString('en-US')
}
