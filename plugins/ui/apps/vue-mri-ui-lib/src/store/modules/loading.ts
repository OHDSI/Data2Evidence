import * as types from '../mutation-types'

const state = {
  initialLoad: true,
  datasetReloadInProgress: false,
}

// getters
const getters = {
  getInitialLoad: modulestate => modulestate.initialLoad,
  getDatasetReloadInProgress: modulestate => modulestate.datasetReloadInProgress,
}

const actions = {
  completeInitialLoad({ commit }) {
    commit(types.SET_INITIAL_LOAD, { initialLoad: false })
  },
}

// mutations
const mutations = {
  [types.SET_INITIAL_LOAD](modulestate, { initialLoad }) {
    modulestate.initialLoad = initialLoad
  },
  [types.SET_DATASET_RELOAD_IN_PROGRESS](modulestate, { datasetReloadInProgress }) {
    modulestate.datasetReloadInProgress = datasetReloadInProgress
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
