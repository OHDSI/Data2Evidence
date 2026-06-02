import { vi, describe, expect, it } from 'vitest'

vi.mock('axios')
vi.mock('../../stores/notifications', () => ({
  useNotificationStore: () => ({
    setToastMessage: vi.fn(),
    setAlertMessage: vi.fn(),
  }),
}))
vi.mock('@/store', () => ({
  default: {
    getters: {},
    dispatch: vi.fn(),
    commit: vi.fn(),
  },
}))

import bookmarkModule from '../bookmark'
import * as types from '../../mutation-types'

describe('store - bookmark', () => {
  describe('mutations', () => {
    let state: {
      bookmarks: any[]
      materializedCohorts: any[]
      atlasCohortDefinitions: any[]
      filterSummaryVisible: boolean
      schemaName: string
      activeBookmark: any
      addNewCohort: boolean
      loading: boolean
      canDatasetMaterializeCohorts: boolean
      canMaterializeCohortDatasetId: string
    }

    beforeEach(() => {
      state = {
        bookmarks: [],
        materializedCohorts: [],
        atlasCohortDefinitions: [],
        filterSummaryVisible: false,
        schemaName: '',
        activeBookmark: null,
        addNewCohort: false,
        loading: false,
        canDatasetMaterializeCohorts: false,
        canMaterializeCohortDatasetId: '',
      }
    })

    it('SET_ACTIVE_BOOKMARK sets new bookmark', () => {
      const bookmark = { bmkId: '123', bookmarkname: 'Test' }
      bookmarkModule.mutations[types.SET_ACTIVE_BOOKMARK](state, bookmark)
      expect(state.activeBookmark).toEqual(bookmark)
    })

    it('SET_ACTIVE_BOOKMARK preserves properties when updating bookmarkname', () => {
      state.activeBookmark = {
        bmkId: '123',
        bookmarkname: 'Old Name',
        cohortDefinitionId: '456',
        bookmark: '{"filter":{}}',
      }

      bookmarkModule.mutations[types.SET_ACTIVE_BOOKMARK](state, {
        ...state.activeBookmark,
        bookmarkname: 'New Name',
      })

      expect(state.activeBookmark.bmkId).toBe('123')
      expect(state.activeBookmark.bookmarkname).toBe('New Name')
      expect(state.activeBookmark.cohortDefinitionId).toBe('456')
      expect(state.activeBookmark.bookmark).toBe('{"filter":{}}')
    })

    it('SET_ACTIVE_BOOKMARK clears active bookmark when null', () => {
      state.activeBookmark = { bmkId: '123', bookmarkname: 'Test' }
      bookmarkModule.mutations[types.SET_ACTIVE_BOOKMARK](state, null)
      expect(state.activeBookmark).toBeNull()
    })
  })
})
