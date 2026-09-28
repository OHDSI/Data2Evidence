import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as types from '../../../store/mutation-types'

const setToastMessage = vi.fn()
vi.mock('../../../stores/notifications', () => ({
  useNotificationStore: () => ({ setToastMessage }),
}))

import saveCohortModal from '../SaveCohortModal.vue'

/**
 * saveBookmark is called against a plain context object rather than a mounted
 * component: the behaviour under test is when the cohort stops reporting unsaved
 * changes and what happens when the write did not succeed, not rendered markup.
 */

const USERNAME = 'tester'
const COHORT_NAME = 'Wizard Cohort'
const FILTERS = { filter: { cards: [] }, axisSelection: ['n/a'] }

const createContext = ({ writeSucceeds = true, isNewCohort = true, activeBookmark = null as any } = {}) => {
  // A write that failed resolves undefined; insert answers with an object and
  // update with the string 'success'.
  const insertResult = writeSucceeds ? { status: 'success', bmkId: 'bmk-new' } : undefined
  const updateResult = writeSucceeds ? 'success' : undefined

  const refreshed = { bmkId: 'from-the-list', bookmarkname: COHORT_NAME }
  const commits: string[] = []

  const fireBookmarkQuery = vi.fn(({ params }) => {
    if (params.cmd === 'insert') return Promise.resolve(insertResult)
    return Promise.resolve(updateResult)
  })

  const context: any = {
    isNewCohort,
    cohortName: isNewCohort ? COHORT_NAME : '',
    savingStep: 'idle',
    savedBookmarkId: null,
    portalContext: { username: USERNAME },
    getText: (key: string) => key,
    getBookmarks: [],
    getBookmarksData: FILTERS,
    getActiveBookmark: activeBookmark,
    getSelectedDataset: { id: 'ds-1', paConfigId: 'pa-1', cdmConfigId: 'cdm-1', cdmConfigVersion: 1 },
    refreshAndFindBookmark: vi.fn(() => {
      commits.push('refreshAndFindBookmark')
      return Promise.resolve(refreshed)
    }),
    fireBookmarkQuery,
  }

  context[types.SET_ACTIVE_BOOKMARK] = vi.fn()
  context[types.SET_ACTIVE_BOOKMARK_BASELINE] = vi.fn(() => {
    commits.push(types.SET_ACTIVE_BOOKMARK_BASELINE)
  })

  return { context, commits, refreshed }
}

const saveBookmark = (context: any) => saveCohortModal.methods.saveBookmark.call(context)

describe('SaveCohortModal saveBookmark', () => {
  beforeEach(() => {
    setToastMessage.mockClear()
  })

  it('takes the saved bookmark id from the refreshed cohort list', async () => {
    const { context } = createContext()

    await expect(saveBookmark(context)).resolves.toBe('from-the-list')
    expect(context.savedBookmarkId).toBe('from-the-list')
  })

  it('baselines the written payload before the cohort list refresh runs', async () => {
    const { context, commits } = createContext()

    await saveBookmark(context)

    expect(context[types.SET_ACTIVE_BOOKMARK_BASELINE]).toHaveBeenCalledWith(FILTERS)
    expect(commits).toEqual([types.SET_ACTIVE_BOOKMARK_BASELINE, 'refreshAndFindBookmark'])
  })

  it('baselines the written payload when updating a saved cohort', async () => {
    const existing = { bmkId: 'bmk-9', bookmarkname: COHORT_NAME, bookmark: '{}', user_id: USERNAME }
    const { context, commits } = createContext({ isNewCohort: false, activeBookmark: existing })

    await saveBookmark(context)

    expect(context.fireBookmarkQuery).toHaveBeenCalledWith(
      expect.objectContaining({ bookmarkId: 'bmk-9', params: expect.objectContaining({ cmd: 'update' }) })
    )
    expect(context[types.SET_ACTIVE_BOOKMARK_BASELINE]).toHaveBeenCalledWith(FILTERS)
    expect(commits).toEqual([types.SET_ACTIVE_BOOKMARK_BASELINE, 'refreshAndFindBookmark'])
  })

  it('raises when the write did not succeed, instead of materializing nothing', async () => {
    const { context } = createContext({ writeSucceeds: false })

    await expect(saveBookmark(context)).rejects.toThrow('MRI_PA_SAVE_BMK_ERROR')
    expect(context.savedBookmarkId).toBeNull()
    expect(context[types.SET_ACTIVE_BOOKMARK_BASELINE]).not.toHaveBeenCalled()
    expect(context.refreshAndFindBookmark).not.toHaveBeenCalled()
  })

  it('names the command that failed, matching the alert fireBookmarkQuery already showed', async () => {
    const existing = { bmkId: 'bmk-9', bookmarkname: COHORT_NAME, bookmark: '{}', user_id: USERNAME }
    const { context } = createContext({ writeSucceeds: false, isNewCohort: false, activeBookmark: existing })

    await expect(saveBookmark(context)).rejects.toThrow('MRI_PA_UPDATE_BMK_ERROR')
  })
})
