import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateDownloadFileName } from '../generateDownloadFileName'

// Fixed date: 05-03-2025 (DD-MM-YYYY)
const FIXED_DATE = new Date(2025, 2, 5) // month is 0-indexed

describe('generateDownloadFileName', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_DATE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('date formatting', () => {
    it('appends the current date in DD-MM-YYYY format', () => {
      const result = generateDownloadFileName('cohort', 'patientlist', 'zip')
      expect(result).toContain('05-03-2025')
    })

    it('pads single-digit day and month with leading zeros', () => {
      vi.setSystemTime(new Date(2025, 0, 1)) // 01-01-2025
      const result = generateDownloadFileName('cohort', 'patientlist', 'zip')
      expect(result).toContain('01-01-2025')
    })

    it('handles double-digit day and month correctly', () => {
      vi.setSystemTime(new Date(2025, 11, 31)) // 31-12-2025
      const result = generateDownloadFileName('cohort', 'seg', 'csv')
      expect(result).toContain('31-12-2025')
    })
  })

  describe('happy path', () => {
    it('produces the expected filename for clean inputs', () => {
      const result = generateDownloadFileName('MyCohort', 'patientlist', 'zip')
      expect(result).toBe('MyCohort_patientlist_05-03-2025.zip')
    })

    it('uses the provided extension without modification', () => {
      const result = generateDownloadFileName('cohort', 'chart', 'png')
      expect(result).toMatch(/\.png$/)
    })
  })

  describe('cohortName sanitisation', () => {
    it('falls back to "cohort" when cohortName is an empty string', () => {
      const result = generateDownloadFileName('', 'seg', 'csv')
      expect(result).toMatch(/^cohort_/)
    })

    it('replaces spaces with underscores', () => {
      const result = generateDownloadFileName('My Cohort Name', 'seg', 'csv')
      expect(result).toMatch(/^My_Cohort_Name_/)
    })

    it('replaces special characters with underscores', () => {
      const result = generateDownloadFileName('cohort!@#name', 'seg', 'csv')
      expect(result).toMatch(/^cohort_name_/)
    })

    it('collapses consecutive underscores into one', () => {
      const result = generateDownloadFileName('a  b', 'seg', 'csv')
      expect(result).toMatch(/^a_b_/)
    })

    it('strips leading and trailing underscores from cohortName', () => {
      const result = generateDownloadFileName('__hello__', 'seg', 'csv')
      expect(result).toMatch(/^hello_/)
    })

    it('preserves hyphens in cohortName', () => {
      const result = generateDownloadFileName('my-cohort', 'seg', 'csv')
      expect(result).toMatch(/^my-cohort_/)
    })

    it('preserves alphanumeric characters unchanged', () => {
      const result = generateDownloadFileName('Cohort123', 'seg', 'csv')
      expect(result).toMatch(/^Cohort123_/)
    })
  })

  describe('segment sanitisation', () => {
    it('includes a clean segment between cohortName and date', () => {
      const result = generateDownloadFileName('c', 'patientlist', 'zip')
      expect(result).toBe('c_patientlist_05-03-2025.zip')
    })

    it('omits the segment part (and its trailing underscore) when segment is empty', () => {
      const result = generateDownloadFileName('MyCohort', '', 'zip')
      expect(result).toBe('MyCohort_05-03-2025.zip')
    })

    it('omits the segment part when segment sanitises to empty', () => {
      const result = generateDownloadFileName('MyCohort', '!!!', 'zip')
      expect(result).toBe('MyCohort_05-03-2025.zip')
    })

    it('sanitises special characters in segment', () => {
      const result = generateDownloadFileName('c', 'bar chart', 'png')
      expect(result).toBe('c_bar_chart_05-03-2025.png')
    })

    it('preserves hyphens in segment', () => {
      const result = generateDownloadFileName('c', 'my-chart', 'svg')
      expect(result).toMatch(/_my-chart_/)
    })
  })

  describe('overall structure', () => {
    it('matches the pattern {cohort}_{segment}_{DD-MM-YYYY}.{ext}', () => {
      const result = generateDownloadFileName('Alpha', 'boxplot', 'pdf')
      expect(result).toMatch(/^[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+_\d{2}-\d{2}-\d{4}\.[a-z]+$/)
    })

    it('matches the pattern {cohort}_{DD-MM-YYYY}.{ext} when segment is empty', () => {
      const result = generateDownloadFileName('Alpha', '', 'pdf')
      expect(result).toMatch(/^[a-zA-Z0-9_-]+_\d{2}-\d{2}-\d{4}\.[a-z]+$/)
    })
  })
})
