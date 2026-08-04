/**
 * URL helpers for safely rendering user/data-supplied links in the UI.
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:']

/**
 * Returns true only when the value is a well-formed absolute URL using an
 * http/https scheme. Rejects empty/whitespace, non-string, malformed values,
 * and dangerous schemes such as `javascript:` and `data:`.
 *
 * Used to decide whether a patient-list link cell renders a clickable anchor
 * or a non-clickable fallback.
 */
export function isValidHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    return false
  }

  try {
    const url = new URL(trimmed)
    return ALLOWED_PROTOCOLS.includes(url.protocol)
  } catch {
    return false
  }
}
