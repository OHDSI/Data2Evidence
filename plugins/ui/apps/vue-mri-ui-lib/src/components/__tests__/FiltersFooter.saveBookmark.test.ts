import { describe, expect, it, vi } from 'vitest'
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

const createContext = (loadAllResult: Promise<unknown>) => {
  let liveBookmarksData: unknown = SAVED_FILTERS
  let activeBookmarkBaseline: unknown = null
  const commits: string[] = []
  const savedBookmark = { bookmarkname: COHORT_NAME, bmkId: 'bmk-1', user_id: USERNAME }

  const fireBookmarkQuery = vi.fn(({ params }) => (params.cmd === 'loadAll' ? loadAllResult : Promise.resolve({})))

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
    getActiveBookmark: { bookmarkname: COHORT_NAME, isNew: true },
    getBookmarkByNameAndUsername: () => savedBookmark,
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
})
