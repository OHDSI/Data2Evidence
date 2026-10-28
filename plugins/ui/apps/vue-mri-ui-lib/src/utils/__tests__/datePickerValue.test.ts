import { describe, it, expect } from 'vitest'
import { toDateUpdate, toPickerDate } from '../datePickerValue'

const localParts = (date: Date | null) =>
  date && [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]

describe('toPickerDate', () => {
  it('keeps a valid Date', () => {
    const date = new Date(2026, 9, 12)
    expect(toPickerDate(date, 'YYYY-MM-DD')).toBe(date)
  })

  it('reads a string in the configured format', () => {
    expect(localParts(toPickerDate('12.10.2026', 'DD.MM.YYYY'))).toEqual([2026, 10, 12, 0, 0])
    expect(localParts(toPickerDate('12.10.2026 14:30:00', 'DD.MM.YYYY HH:mm:ss'))).toEqual([2026, 10, 12, 14, 30])
  })

  it('reads a stored ISO string whatever the configured format', () => {
    expect(localParts(toPickerDate('2026-10-12', 'DD.MM.YYYY'))).toEqual([2026, 10, 12, 0, 0])
    expect(localParts(toPickerDate('2026-10-12 14:30:00', 'DD.MM.YYYY HH:mm:ss'))).toEqual([2026, 10, 12, 14, 30])
    expect(toPickerDate('2026-10-12T00:00:00.000Z', 'YYYY-MM-DD')?.getTime()).toBe(
      Date.parse('2026-10-12T00:00:00.000Z')
    )
  })

  it('gives no date for empty, invalid or unknown values', () => {
    expect(toPickerDate('', 'YYYY-MM-DD')).toBeNull()
    expect(toPickerDate(null, 'YYYY-MM-DD')).toBeNull()
    expect(toPickerDate(undefined, 'YYYY-MM-DD')).toBeNull()
    expect(toPickerDate(new Date(NaN), 'YYYY-MM-DD')).toBeNull()
    expect(toPickerDate('not a date', 'YYYY-MM-DD')).toBeNull()
    expect(toPickerDate(42, 'YYYY-MM-DD')).toBeNull()
  })
})

describe('toDateUpdate', () => {
  it('reports a picked date', () => {
    const date = new Date(2026, 9, 12)
    expect(toDateUpdate(date)).toEqual({ date, isEmpty: false })
  })

  it('reports a cleared date as empty', () => {
    expect(toDateUpdate(null)).toEqual({ date: '', isEmpty: true })
  })
})
