/**
 * Formats a number with comma separators using US locale (en-US)
 * @param value - The number to format
 * @returns Formatted string with comma separators, or "0" for invalid values
 * @example
 * formatNumber(1234) // "1,234"
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(null) // "0"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  return value.toLocaleString('en-US')
}
