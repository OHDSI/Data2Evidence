export function formatDateToYMD(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(val: string | Date | undefined): string | Date {
  if (!val) return ''
  if (typeof val === 'string') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? '' : d
  }
  return val
}
