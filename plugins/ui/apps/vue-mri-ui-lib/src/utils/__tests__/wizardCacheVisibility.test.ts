import { describe, expect, it } from 'vitest'
import { processBookmarksData } from '../BookmarkUtils'

describe('processBookmarksData Wizard cache regression', () => {
  it('keeps reserved Wizard cache artifacts visible until a hiding policy is explicitly approved', () => {
    const wizardBookmark = bookmark({
      bmkId: 'wizard-bookmark',
      bookmarkname: 'wizards-1783670400000',
      cohortDefinitionId: 42,
    })
    const linkedCohort = materializedCohort({
      id: 42,
      cohortDefinitionName: 'wizards-1783670400000',
      syntax: JSON.stringify({ datasetId: 'dataset-1', bookmarkId: 'wizard-bookmark' }),
    })

    const result = processBookmarksData([wizardBookmark, linkedCohort], 'pa-config')

    expect(result.bookmarks).toEqual([wizardBookmark])
    expect(result.materializedCohorts).toEqual([linkedCohort])
  })

  it('keeps ordinary embedded-Wizard bookmarks and cohorts unchanged', () => {
    const namedBookmark = bookmark({
      bmkId: 'named-bookmark',
      bookmarkname: 'My embedded Wizard cohort',
      cohortDefinitionId: 7,
    })
    const linkedCohort = materializedCohort({ id: 7, cohortDefinitionName: 'My embedded Wizard cohort' })

    const result = processBookmarksData([namedBookmark, linkedCohort], 'pa-config')

    expect(result.bookmarks).toEqual([namedBookmark])
    expect(result.materializedCohorts).toEqual([linkedCohort])
  })
})

function bookmark(overrides: Record<string, unknown> = {}) {
  return {
    bmkId: 'bookmark-1',
    bookmarkname: 'My cohort',
    bookmark: JSON.stringify({ filter: { cards: { content: [] } } }),
    viewname: null,
    modified: '2026-07-10T10:00:00.000Z',
    version: 1,
    user_id: 'researcher',
    shared: false,
    paConfigId: 'pa-config',
    ...overrides,
  }
}

function materializedCohort(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    patientCount: 10,
    cohortDefinitionName: 'My cohort',
    createdOn: '2026-07-10T10:00:00.000Z',
    description: 'Generated cohort',
    ...overrides,
  }
}
