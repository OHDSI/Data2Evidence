import moment from 'moment'

const STORED_FORMATS = ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD', moment.ISO_8601]

export function toPickerDate(value: unknown, format: string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const parsed = moment(value, [format, ...STORED_FORMATS], true)
  return parsed.isValid() ? parsed.toDate() : null
}

export function toDateUpdate(value: Date | null): { date: Date | ''; isEmpty: boolean } {
  return value ? { date: value, isEmpty: false } : { date: '', isEmpty: true }
}
