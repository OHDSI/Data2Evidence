import DateUtils from '../DateUtils'

describe('displayExplorationDate', () => {
  it('formats an ISO timestamp as Month DD, YYYY', () => {
    expect(DateUtils.displayExplorationDate('2026-05-14T10:20:30.000Z')).toBe('May 14, 2026')
  })

  it('formats an ISO timestamp without milliseconds', () => {
    expect(DateUtils.displayExplorationDate('2026-08-12T09:00:00')).toBe('Aug 12, 2026')
  })

  it('does not pad a single-digit day', () => {
    expect(DateUtils.displayExplorationDate('2026-09-03T12:00:00')).toBe('Sep 3, 2026')
  })

  it('returns an empty string for a value that is not an ISO timestamp', () => {
    expect(DateUtils.displayExplorationDate('')).toBe('')
    expect(DateUtils.displayExplorationDate(undefined)).toBe('')
    expect(DateUtils.displayExplorationDate('14 May 2026')).toBe('')
  })
})
