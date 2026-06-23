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

import chartModule from '../chart'
import * as types from '../../mutation-types'

describe('store - chart colorAxis auto-default tracking', () => {
  describe('actions', () => {
    it('setColorAxisIndex marks the colorAxis as not auto-defaulted', () => {
      const commit = vi.fn()
      chartModule.actions.setColorAxisIndex({ commit }, 1)
      expect(commit).toHaveBeenCalledWith(types.SET_COLOR_AXIS_INDEX, 1)
      expect(commit).toHaveBeenCalledWith(types.SET_COLOR_AXIS_AUTO_DEFAULTED, false)
    })

    it('setDefaultColorAxisIndex marks the colorAxis as auto-defaulted', () => {
      const commit = vi.fn()
      chartModule.actions.setDefaultColorAxisIndex({ commit }, 0)
      expect(commit).toHaveBeenCalledWith(types.SET_COLOR_AXIS_INDEX, 0)
      expect(commit).toHaveBeenCalledWith(types.SET_COLOR_AXIS_AUTO_DEFAULTED, true)
    })
  })

  describe('mutations & getter', () => {
    it('SET_COLOR_AXIS_AUTO_DEFAULTED updates state and getter', () => {
      const state = { colorAxisIndex: null, isColorAxisAutoDefaulted: false }
      chartModule.mutations[types.SET_COLOR_AXIS_AUTO_DEFAULTED](state, true)
      expect(state.isColorAxisAutoDefaulted).toBe(true)
      expect(chartModule.getters.getIsColorAxisAutoDefaulted(state)).toBe(true)
    })
  })
})
