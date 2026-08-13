import { formatNumber, PENDING_PATIENT_COUNT } from '../NumberUtils'

describe('formatNumber', () => {
  it('formats zero as "0"', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('formats small numbers without commas', () => {
    expect(formatNumber(42)).toBe('42')
    expect(formatNumber(999)).toBe('999')
  })

  it('formats thousands with comma separator', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234)).toBe('1,234')
  })

  it('formats large numbers with multiple comma separators', () => {
    expect(formatNumber(854765)).toBe('854,765')
    expect(formatNumber(9003281)).toBe('9,003,281')
    expect(formatNumber(1234567890)).toBe('1,234,567,890')
  })

  it('handles null by returning "0"', () => {
    expect(formatNumber(null)).toBe('0')
  })

  it('handles undefined by returning "0"', () => {
    expect(formatNumber(undefined)).toBe('0')
  })

  it('handles NaN by returning "0"', () => {
    expect(formatNumber(NaN)).toBe('0')
  })

  it('formats negative numbers correctly', () => {
    expect(formatNumber(-1000)).toBe('-1,000')
    expect(formatNumber(-1234567)).toBe('-1,234,567')
  })

  it('returns non-numeric string values as-is (for error states)', () => {
    expect(formatNumber('--')).toBe('--')
    expect(formatNumber('N/A')).toBe('N/A')
  })

  it('formats numeric strings with comma separator', () => {
    expect(formatNumber('1000')).toBe('1,000')
    expect(formatNumber('1234567')).toBe('1,234,567')
  })

  // The count reads "… / 2,694" while a query is in flight — rendering the raw
  // sentinel would leak the untranslated word "loading" into the header.
  it('renders the in-flight sentinel as an ellipsis, not the raw value', () => {
    expect(formatNumber(PENDING_PATIENT_COUNT)).toBe('…')
    expect(formatNumber(PENDING_PATIENT_COUNT)).not.toBe(PENDING_PATIENT_COUNT)
  })
})
