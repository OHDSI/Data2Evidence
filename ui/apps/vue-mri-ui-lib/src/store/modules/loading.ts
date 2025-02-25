import * as types from '../mutation-types'

const state = {
  initialLoad: true,
}

// getters
const getters = {
  getInitialLoad: modulestate => modulestate.initialLoad,
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
}

export default {
  state,
  getters,
  actions,
  mutations,
}
