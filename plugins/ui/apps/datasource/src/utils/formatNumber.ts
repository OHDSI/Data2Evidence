// Ported from plugins/ui/apps/portal/src/utils/utils.ts::formatNumber.
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? Number(value) : value
  if (isNaN(num)) return String(value)
  return num.toLocaleString('en-US', { maximumFractionDigits: 10 })
}
