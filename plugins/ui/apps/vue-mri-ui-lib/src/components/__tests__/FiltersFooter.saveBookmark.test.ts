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
 */

const USERNAME = 'tester'
const COHORT_NAME = 'My New Cohort'

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
  const bookmarksData = { filter: { cards: [] }, axisSelection: ['n/a'] }
  const commits: string[] = []
  const savedBookmark = { bookmarkname: COHORT_NAME, bmkId: 'bmk-1', user_id: USERNAME }

  const fireBookmarkQuery = vi.fn(({ params }) =>
    params.cmd === 'loadAll' ? loadAllResult : Promise.resolve({})
  )

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
    getBookmarksData: bookmarksData,
    getActiveBookmark: { bookmarkname: COHORT_NAME, isNew: true },
    getBookmarkByNameAndUsername: () => savedBookmark,
    fireBookmarkQuery,
    closeSaveBookmark: vi.fn(),
    commits,
    bookmarksData,
  }

  context[types.SET_ACTIVE_BOOKMARK] = vi.fn(() => {
    commits.push(types.SET_ACTIVE_BOOKMARK)
  })
  context[types.SET_ACTIVE_BOOKMARK_BASELINE] = vi.fn(() => {
    commits.push(types.SET_ACTIVE_BOOKMARK_BASELINE)
  })

  return context
}

const saveBookmark = (context: any) => filtersFooter.methods.saveBookmark.call(context)

describe('FiltersFooter saveBookmark', () => {
  it('clears the dirty state before the cohort list refresh resolves', async () => {
    const loadAll = createDeferred<unknown>()
    const context = createContext(loadAll.promise)

    const saving = saveBookmark(context)

    // Let the insert request settle while the cohort list refresh is still in flight.
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(context.fireBookmarkQuery).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ cmd: 'insert' }) })
    )
    expect(context[types.SET_ACTIVE_BOOKMARK_BASELINE]).toHaveBeenCalledWith(context.bookmarksData)

    loadAll.resolve({})
    await saving
  })

  it('still adopts the saved bookmark once the refresh resolves', async () => {
    const context = createContext(Promise.resolve({}))

    await saveBookmark(context)

    expect(context[types.SET_ACTIVE_BOOKMARK]).toHaveBeenCalledWith(
      expect.objectContaining({ bmkId: 'bmk-1' })
    )
    // The baseline is re-captured after SET_ACTIVE_BOOKMARK, which clears it.
    expect(context.commits[context.commits.length - 1]).toBe(types.SET_ACTIVE_BOOKMARK_BASELINE)
  })
})
