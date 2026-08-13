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
import { PENDING_PATIENT_COUNT } from '../../../utils/NumberUtils'

// setFireRequest only flips a flag that a mounted chart component watches; the count
// and chart are rewritten seconds later, when that component's analytics query
// resolves. These cover the invalidation that makes the gap visible — without it a
// read landing mid-flight gets the PREVIOUS cohort's result and cannot tell.
const context = ({ held = false, bookmarksData = { cards: ['c1'] } }: any = {}) => ({
  commit: vi.fn(),
  dispatch: vi.fn(),
  state: { fireRequestHeld: held },
  rootGetters: { getBookmarksData: bookmarksData },
})

describe('store - chart setFireRequest result invalidation', () => {
  it('blanks the previous cohort result before firing the new query', () => {
    const ctx = context()

    chartModule.actions.setFireRequest(ctx)

    expect(ctx.dispatch).toHaveBeenCalledWith('clearResponse')
    expect(ctx.dispatch).toHaveBeenCalledWith('setCurrentPatientCount', {
      currentPatientCount: PENDING_PATIENT_COUNT,
    })
    expect(ctx.commit).toHaveBeenCalledWith(types.CHART_SET_FIRE_REQUEST)
  })

  // A held fire request fires nothing, so blanking here would strand the sentinel:
  // applyCohortPatch holds across every op in a patch and releases at the end.
  it('does not blank while the fire request is held', () => {
    const ctx = context({ held: true })

    chartModule.actions.setFireRequest(ctx)

    expect(ctx.dispatch).not.toHaveBeenCalled()
    expect(ctx.commit).not.toHaveBeenCalled()
  })

  // The chart components skip the request when there is no bookmark to query
  // (StackBarChart.getFireRequest), so nothing would ever write the real count back
  // and the UI would sit on '…' forever.
  it.each([
    ['an empty bookmark', {}],
    ['no bookmark at all', undefined],
  ])('still fires but does not blank with %s', (_label, bookmarksData) => {
    // Built inline rather than via context(): passing an explicitly-undefined
    // property would re-trigger that helper's default bookmark.
    const ctx = {
      commit: vi.fn(),
      dispatch: vi.fn(),
      state: { fireRequestHeld: false },
      rootGetters: { getBookmarksData: bookmarksData },
    }

    chartModule.actions.setFireRequest(ctx)

    expect(ctx.dispatch).not.toHaveBeenCalled()
    expect(ctx.commit).toHaveBeenCalledWith(types.CHART_SET_FIRE_REQUEST)
  })
})
