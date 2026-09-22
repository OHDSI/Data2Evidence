import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as types from '../../store/mutation-types'

const setToastMessage = vi.fn()
vi.mock('../../stores/notifications', () => ({
  useNotificationStore: () => ({ setToastMessage }),
}))

import filtersFooter from '../FiltersFooter.vue'

/**
 * These tests call saveBookmark directly against a plain context object.
 * The component itself cannot be mounted (see FiltersFooter.test.ts), and the
 * behaviour under test is store timing, not rendered markup.
 *
 * getBookmarksData is a computed getter in the real store, so it reflects live
 * filter state on every read. The fixture models that with a getter over a
 * swappable value, which lets a test edit the filters mid-save.
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
  // bookmark-svc answers insert with { status, bmkId } and update with the string
  // 'success'. A write that failed resolves undefined: fireBookmarkQuery reports
  // the error itself and only rethrows for 'delete'.
  const insertResult = writeSucceeds ? { status: 'success', bmkId: 'bmk-1' } : undefined
  const updateResult = writeSucceeds ? 'success' : undefined
  let liveBookmarksData: unknown = SAVED_FILTERS
  let activeBookmarkBaseline: unknown = null
  const commits: string[] = []
  const listBookmark = { bookmarkname: COHORT_NAME, bmkId: 'from-the-list', user_id: USERNAME }

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
    getBookmarkByNameAndUsername: vi.fn(() => listBookmark),
    fireBookmarkQuery,
    closeSaveBookmark: vi.fn(),
  }

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
    listBookmark,
    storedBaseline: () => activeBookmarkBaseline,
  }
}

const saveBookmark = (context: any) => filtersFooter.methods.saveBookmark.call(context)

const writtenPayload = (context: any, cmd = 'insert') => {
  const write = context.fireBookmarkQuery.mock.calls.find(([arg]) => arg.params.cmd === cmd)
  expect(write).toBeDefined()
  return JSON.parse(write[0].params.bookmark)
}

describe('FiltersFooter saveBookmark', () => {
  // setToastMessage lives in the module-level mock, so it carries calls between tests.
  beforeEach(() => {
    setToastMessage.mockClear()
  })

  it('baselines the written payload before the cohort list refresh resolves', async () => {
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

    // The swap nulls the baseline, so it has to be captured again afterwards.
    expect(commits[commits.length - 1]).toBe(types.SET_ACTIVE_BOOKMARK_BASELINE)
    expect(storedBaseline()).toEqual(writtenPayload(context))
    // Baseline differs from live state, so the unwritten filter card still reports dirty.
    expect(storedBaseline()).not.toEqual(context.getBookmarksData)
  })

  it('adopts the saved cohort from the refreshed list', async () => {
    const { context, listBookmark } = createContext(Promise.resolve({}))

    await saveBookmark(context)

    expect(context.getBookmarkByNameAndUsername).toHaveBeenCalledWith(COHORT_NAME, USERNAME)
    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalledWith(listBookmark)
  })

  it('baselines the written payload when updating a saved cohort', async () => {
    const existing = {
      bmkId: 'bmk-9',
      bookmarkname: COHORT_NAME,
      bookmark: '{}',
      user_id: USERNAME,
      shared: false,
    }
    const loadAll = createDeferred<unknown>()
    const { context, storedBaseline } = createContext(loadAll.promise, { activeBookmark: existing })
    context.cohortName = ''

    const saving = saveBookmark(context)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(context.fireBookmarkQuery).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ cmd: 'update' }) })
    )
    expect(storedBaseline()).toEqual(writtenPayload(context, 'update'))

    loadAll.resolve({})
    await saving
  })

  describe('when the write did not succeed', () => {
    // fireBookmarkQuery reports the failure itself and resolves undefined for
    // insert and update, so a resolved promise is not proof the cohort was saved.
    const failed = { writeSucceeds: false }

    it('leaves the cohort dirty', async () => {
      const { context, storedBaseline } = createContext(Promise.resolve({}), failed)

      await saveBookmark(context)

      expect(context[types.SET_ACTIVE_BOOKMARK_BASELINE]).not.toHaveBeenCalled()
      expect(storedBaseline()).toBeNull()
    })

    it('does not adopt a saved bookmark or claim success', async () => {
      const { context } = createContext(Promise.resolve({}), failed)

      await saveBookmark(context)

      expect(context[types.SET_ACTIVE_BOOKMARK]).not.toHaveBeenCalled()
      expect(setToastMessage).not.toHaveBeenCalled()
    })
  })
})
