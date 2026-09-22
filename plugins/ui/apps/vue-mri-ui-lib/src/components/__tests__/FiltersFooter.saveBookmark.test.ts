import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as types from '../../store/mutation-types'

const setToastMessage = vi.fn()
vi.mock('../../stores/notifications', () => ({
  useNotificationStore: () => ({ setToastMessage }),
}))

import filtersFooter from '../FiltersFooter.vue'
import bookmarkModule from '../../store/modules/bookmark'

/**
 * These tests call saveBookmark directly against a plain context object.
 * The component itself cannot be mounted (see FiltersFooter.test.ts), and the
 * behaviour under test is store timing, not rendered markup.
 *
 * getBookmarksData is a computed getter in the real store, so it reflects live
 * filter state on every read. The fixture models that with a getter over a
 * swappable value, which lets a test edit the filters mid-save.
 *
 * The cohort list is driven through the real UPSERT_BOOKMARK mutation and read
 * back through the real getBookmarkById getter, because that getter is what
 * materialization uses and it throws when the saved cohort is missing.
 *
 * The baseline mutations are modelled after store/modules/bookmark.ts: a
 * SET_ACTIVE_BOOKMARK swap nulls the baseline, and SET_ACTIVE_BOOKMARK_BASELINE
 * sets it. getCurrentBookmarkHasChanges reports dirty whenever the baseline and
 * the live data differ, so a baseline that is not the written payload silently
 * marks unsaved edits clean.
 */

const USERNAME = 'tester'
const COHORT_NAME = 'My New Cohort'

const SAVED_FILTERS = { filter: { cards: [] }, axisSelection: ['n/a'] }
const EDITED_FILTERS = { filter: { cards: ['edited-after-save'] }, axisSelection: ['pcount'] }

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

const createContext = (
  loadAllResult: Promise<unknown>,
  { writeSucceeds = true, activeBookmark = { bookmarkname: COHORT_NAME, isNew: true } as any } = {}
) => {
  // A write that failed resolves undefined: fireBookmarkQuery reports the error
  // itself and only rethrows for 'delete'.
  const insertResult = writeSucceeds ? { status: 'success', bmkId: 'bmk-1' } : undefined
  const updateResult = writeSucceeds ? 'success' : undefined
  let liveBookmarksData: unknown = SAVED_FILTERS
  let activeBookmarkBaseline: unknown = null
  const commits: string[] = []
  const bookmarkState = { bookmarks: [] as any[] }

  // bookmark-svc answers insert with { status, bmkId } and update with the string
  // 'success'; a write that failed resolves undefined.
  const fireBookmarkQuery = vi.fn(({ params }) => {
    if (params.cmd === 'loadAll') return loadAllResult
    if (params.cmd === 'insert') return Promise.resolve(insertResult)
    return Promise.resolve(updateResult)
  })

  const context: any = {
    canShare: false,
    shareBookmark: false,
    isSavingBookmark: false,
    getText: (key: string) => key,
    cohortName: COHORT_NAME,
    cohortNameValidationState: 'valid',
    hasChanges: true,
    hasExceededLength: false,
    isNotUserSharedBookmark: false,
    portalContext: { username: USERNAME },
    getBookmarks: [],
    get getBookmarksData() {
      return liveBookmarksData
    },
    getActiveBookmark: activeBookmark,
    getMriFrontendConfig: { getPaConfigId: () => 'pa-1' },
    fireBookmarkQuery,
    closeSaveBookmark: vi.fn(),
  }

  context[types.UPSERT_BOOKMARK] = vi.fn((savedBookmark: any) => {
    commits.push(types.UPSERT_BOOKMARK)
    bookmarkModule.mutations[types.UPSERT_BOOKMARK](bookmarkState, savedBookmark)
  })
  context[types.SET_ACTIVE_BOOKMARK] = vi.fn(() => {
    commits.push(types.SET_ACTIVE_BOOKMARK)
    activeBookmarkBaseline = null
  })
  context[types.SET_ACTIVE_BOOKMARK_BASELINE] = vi.fn((baseline: unknown) => {
    commits.push(types.SET_ACTIVE_BOOKMARK_BASELINE)
    activeBookmarkBaseline = baseline
  })

  const editFilters = (next: unknown) => {
    liveBookmarksData = next
  }

  return {
    context,
    commits,
    editFilters,
    bookmarkState,
    storedBaseline: () => activeBookmarkBaseline,
  }
}

const saveBookmark = (context: any) => filtersFooter.methods.saveBookmark.call(context)

const writtenPayload = (context: any) => {
  const insert = context.fireBookmarkQuery.mock.calls.find(([arg]) => arg.params.cmd === 'insert')
  expect(insert).toBeDefined()
  return JSON.parse(insert[0].params.bookmark)
}

describe('FiltersFooter saveBookmark', () => {
  // setToastMessage lives in the module-level mock, so it carries calls between tests.
  beforeEach(() => {
    setToastMessage.mockClear()
  })

  it('re-baselines the written payload before the cohort list refresh resolves', async () => {
    const loadAll = createDeferred<unknown>()
    const { context, editFilters, storedBaseline } = createContext(loadAll.promise)

    const saving = saveBookmark(context)

    // The user carries on editing while the write is in flight, so live state no
    // longer matches what was sent.
    editFilters(EDITED_FILTERS)

    // Let the insert request settle while the cohort list refresh is still in flight.
    await new Promise(resolve => setTimeout(resolve, 0))

    const payload = writtenPayload(context)
    expect(payload).not.toEqual(context.getBookmarksData)
    expect(storedBaseline()).toEqual(payload)

    loadAll.resolve({})
    await saving
  })

  it('keeps edits made during the refresh dirty by re-baselining the written payload', async () => {
    const loadAll = createDeferred<unknown>()
    const { context, commits, editFilters, storedBaseline } = createContext(loadAll.promise)

    const saving = saveBookmark(context)
    await new Promise(resolve => setTimeout(resolve, 0))

    // The user adds a filter card while the cohort list refresh is still in flight.
    editFilters(EDITED_FILTERS)
    loadAll.resolve({})
    await saving

    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalledWith(expect.objectContaining({ bmkId: 'bmk-1' }))
    // The swap nulls the baseline, so it has to be captured again afterwards.
    expect(commits[commits.length - 1]).toBe(types.SET_ACTIVE_BOOKMARK_BASELINE)
    expect(storedBaseline()).toEqual(writtenPayload(context))
    // Baseline differs from live state, so the unwritten filter card still reports dirty.
    expect(storedBaseline()).not.toEqual(context.getBookmarksData)
  })
  it('takes the saved bookmark id from the save response, not from the refreshed list', async () => {
    const loadAll = createDeferred<unknown>()
    const { context } = createContext(loadAll.promise)

    await saveBookmark(context)

    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalledWith(expect.objectContaining({ bmkId: 'bmk-1' }))
    // The cohort list is no longer the source of the id: it is still in flight here.
    expect(context.fireBookmarkQuery).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ cmd: 'loadAll' }) })
    )

    loadAll.resolve({})
  })

  it('puts the saved cohort in the list before anything can read it', async () => {
    // The refresh never resolves, so the list only holds what the save put there.
    const { context, commits, bookmarkState } = createContext(new Promise(() => {}))

    await saveBookmark(context)

    // Materialization reads the filter cards back out of the list through this
    // getter, which throws when the saved cohort is missing.
    expect(bookmarkModule.getters.getBookmarkById(bookmarkState)('bmk-1')).toEqual(SAVED_FILTERS)
    expect(commits.indexOf(types.UPSERT_BOOKMARK)).toBeLessThan(commits.indexOf(types.SET_ACTIVE_BOOKMARK))
  })

  it('replaces the stale list entry when updating a saved cohort', async () => {
    const existing = {
      bmkId: 'bmk-9',
      bookmarkname: COHORT_NAME,
      bookmark: JSON.stringify(EDITED_FILTERS),
      viewname: null,
      modified: '2026-09-01T00:00:00.000Z',
      version: 3,
      user_id: USERNAME,
      shared: false,
    }
    const { context, bookmarkState } = createContext(new Promise(() => {}), { activeBookmark: existing })
    bookmarkState.bookmarks = [existing]
    context.cohortName = ''

    await saveBookmark(context)

    expect(bookmarkState.bookmarks).toHaveLength(1)
    expect(bookmarkModule.getters.getBookmarkById(bookmarkState)('bmk-9')).toEqual(SAVED_FILTERS)
  })

  it('adopts the saved cohort without waiting for the cohort list refresh', async () => {
    // The refresh never resolves, which is the slow-network case from #3341.
    const { context, storedBaseline } = createContext(new Promise(() => {}))

    await saveBookmark(context)

    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalled()
    expect(storedBaseline()).toEqual(writtenPayload(context))
    // The list is still refreshed, just not awaited.
    expect(context.fireBookmarkQuery).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ cmd: 'loadAll' }) })
    )
  })

  it('carries the existing identity forward when updating a saved cohort', async () => {
    const existing = {
      bmkId: 'bmk-9',
      bookmarkname: COHORT_NAME,
      bookmark: '{}',
      viewname: null,
      modified: '2026-09-01T00:00:00.000Z',
      version: 3,
      user_id: USERNAME,
      shared: false,
      cohortDefinitionId: 42,
    }
    const { context } = createContext(new Promise(() => {}), { activeBookmark: existing })
    context.cohortName = ''

    await saveBookmark(context)

    expect(context.fireBookmarkQuery).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ cmd: 'update' }) })
    )
    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalledWith(
      expect.objectContaining({ bmkId: 'bmk-9', cohortDefinitionId: 42, version: 4 })
    )
  })

  describe('when the write did not succeed', () => {
    // fireBookmarkQuery reports the failure itself and resolves undefined for
    // insert and update, so a resolved promise is not proof the cohort was saved.
    const failed = { writeSucceeds: false }

    it('leaves the cohort dirty', async () => {
      const { context, storedBaseline } = createContext(new Promise(() => {}), failed)

      await saveBookmark(context)

      expect(context[types.SET_ACTIVE_BOOKMARK_BASELINE]).not.toHaveBeenCalled()
      expect(storedBaseline()).toBeNull()
    })

    it('does not adopt a saved bookmark or claim success', async () => {
      const { context } = createContext(new Promise(() => {}), failed)

      await saveBookmark(context)

      expect(context[types.SET_ACTIVE_BOOKMARK]).not.toHaveBeenCalled()
      expect(setToastMessage).not.toHaveBeenCalled()
    })
  })
})
