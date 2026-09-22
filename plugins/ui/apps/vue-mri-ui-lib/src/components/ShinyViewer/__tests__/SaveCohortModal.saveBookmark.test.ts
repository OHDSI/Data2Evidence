import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as types from '../../../store/mutation-types'

const setToastMessage = vi.fn()
vi.mock('../../../stores/notifications', () => ({
  useNotificationStore: () => ({ setToastMessage }),
}))

import saveCohortModal from '../SaveCohortModal.vue'
import bookmarkModule from '../../../store/modules/bookmark'

/**
 * saveBookmark is called against a plain context object rather than a mounted
 * component: the behaviour under test is which value the saved bookmark id comes
 * from, not rendered markup.
 *
 * The cohort list is driven through the real UPSERT_BOOKMARK mutation and read
 * back through the real getBookmarkById getter, because materializeCohort sources
 * its filter cards from that getter and it throws when the cohort is missing.
 */

const USERNAME = 'tester'
const COHORT_NAME = 'Wizard Cohort'
const FILTERS = { filter: { cards: [] }, axisSelection: ['n/a'] }

const createContext = ({ writeSucceeds = true, isNewCohort = true, activeBookmark = null as any } = {}) => {
  // A write that failed resolves undefined; insert answers with an object and
  // update with the string 'success'.
  const insertResult = writeSucceeds ? { status: 'success', bmkId: 'bmk-new' } : undefined
  const updateResult = writeSucceeds ? 'success' : undefined

  const fireBookmarkQuery = vi.fn(({ params }) => {
    if (params.cmd === 'loadAll') return new Promise(() => {}) // never resolves
    if (params.cmd === 'insert') return Promise.resolve(insertResult)
    return Promise.resolve(updateResult)
  })

  const bookmarkState = { bookmarks: activeBookmark ? [activeBookmark] : ([] as any[]) }

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
    getBookmarkByNameAndUsername: vi.fn(() => ({ bmkId: 'from-the-list' })),
    refreshAndFindBookmark: vi.fn(() => Promise.resolve({ bmkId: 'from-the-list' })),
    fireBookmarkQuery,
  }

  context[types.UPSERT_BOOKMARK] = vi.fn((savedBookmark: any) =>
    bookmarkModule.mutations[types.UPSERT_BOOKMARK](bookmarkState, savedBookmark)
  )
  context[types.SET_ACTIVE_BOOKMARK] = vi.fn()
  context[types.SET_ACTIVE_BOOKMARK_BASELINE] = vi.fn()

  return { context, bookmarkState }
}

const saveBookmark = (context: any) => saveCohortModal.methods.saveBookmark.call(context)

describe('SaveCohortModal saveBookmark', () => {
  beforeEach(() => {
    setToastMessage.mockClear()
  })

  it('takes the saved bookmark id from the save response', async () => {
    const { context } = createContext()

    await expect(saveBookmark(context)).resolves.toBe('bmk-new')
    expect(context.savedBookmarkId).toBe('bmk-new')
  })

  it('does not wait for the cohort list refresh to learn the id', async () => {
    // The refresh promise never resolves, so a save that awaited it would hang.
    const { context } = createContext()

    await saveBookmark(context)

    expect(context.refreshAndFindBookmark).not.toHaveBeenCalled()
    expect(context.getBookmarkByNameAndUsername).not.toHaveBeenCalled()
    expect(context.fireBookmarkQuery).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ cmd: 'loadAll' }) })
    )
  })

  it('adopts the saved cohort and baselines the written payload', async () => {
    const { context } = createContext()

    await saveBookmark(context)

    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalledWith(expect.objectContaining({ bmkId: 'bmk-new' }))
    expect(context[types.SET_ACTIVE_BOOKMARK_BASELINE]).toHaveBeenCalledWith(FILTERS)
  })

  it('keeps the existing identity when updating a saved cohort', async () => {
    const existing = {
      bmkId: 'bmk-9',
      bookmarkname: COHORT_NAME,
      bookmark: '{}',
      viewname: null,
      modified: '2026-09-01T00:00:00.000Z',
      version: 2,
      user_id: USERNAME,
      shared: false,
      cohortDefinitionId: 42,
    }
    const { context } = createContext({ isNewCohort: false, activeBookmark: existing })

    await expect(saveBookmark(context)).resolves.toBe('bmk-9')
    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalledWith(
      expect.objectContaining({ bmkId: 'bmk-9', cohortDefinitionId: 42, version: 3 })
    )
  })

  it('puts the saved cohort in the list before materialization reads it', async () => {
    // The cohort list refresh never resolves, so the list only holds what the
    // save put there - the slow-network case materializeCohort used to crash on.
    const { context, bookmarkState } = createContext()

    const savedBookmarkId = await saveBookmark(context)

    expect(bookmarkModule.getters.getBookmarkById(bookmarkState)(savedBookmarkId)).toEqual(FILTERS)
  })

  it('replaces the stale list entry when updating a saved cohort', async () => {
    const existing = {
      bmkId: 'bmk-9',
      bookmarkname: COHORT_NAME,
      bookmark: JSON.stringify({ filter: { cards: ['stale'] } }),
      user_id: USERNAME,
      version: 2,
    }
    const { context, bookmarkState } = createContext({ isNewCohort: false, activeBookmark: existing })

    const savedBookmarkId = await saveBookmark(context)

    expect(bookmarkState.bookmarks).toHaveLength(1)
    expect(bookmarkModule.getters.getBookmarkById(bookmarkState)(savedBookmarkId)).toEqual(FILTERS)
  })

  it('raises when the write did not succeed, instead of materializing nothing', async () => {
    const { context } = createContext({ writeSucceeds: false })

    await expect(saveBookmark(context)).rejects.toThrow('MRI_PA_SAVE_BMK_ERROR')
    expect(context.savedBookmarkId).toBeNull()
    expect(context[types.SET_ACTIVE_BOOKMARK]).not.toHaveBeenCalled()
  })
})
