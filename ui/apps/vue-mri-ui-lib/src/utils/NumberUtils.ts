/**
 * Formats a number with comma separators using US locale (en-US)
 * @param value - The number to format (can be string for error states like '--')
 * @returns Formatted string with comma separators, or the original string if not a number
 * @example
 * formatNumber(1234) // "1,234"
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(null) // "0"
 * formatNumber('--') // "--"
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0'
  }
  if (typeof value === 'string') {
    return value
  }
  if (isNaN(value)) {
    return '0'
  }
  return value.toLocaleString('en-US')
}
