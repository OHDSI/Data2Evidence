import * as types from '../../mutation-types'
import loading from '../loading'

describe('store - loading', () => {
  it('initializes dataset reload flag as false', () => {
    expect((loading as any).state.datasetReloadInProgress).toBe(false)
  })

  it('sets dataset reload flag through mutation', () => {
    const state = {
      initialLoad: true,
      datasetReloadInProgress: false,
    }

    ;(loading as any).mutations[types.SET_DATASET_RELOAD_IN_PROGRESS](state, {
      datasetReloadInProgress: true,
    })

    expect(state.datasetReloadInProgress).toBe(true)
  })

  it('exposes dataset reload flag via getter', () => {
    const state = {
      datasetReloadInProgress: true,
    }

    expect((loading as any).getters.getDatasetReloadInProgress(state)).toBe(true)
  })
})
