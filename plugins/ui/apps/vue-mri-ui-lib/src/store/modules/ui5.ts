// tslint:disable:ordered-imports
// tslint:disable:no-shadowed-variable
// tslint:disable:function-name
import * as types from '../mutation-types'

// initial state
const state = {
  loaded: false,
}

// getters
const getters = {
  getUI5Loaded: modulestate => modulestate.loaded,
}

// actions
const actions = {}

// mutations
const mutations = {
  [types.UI5_SET_LOADED](modulestate, loaded) {
    modulestate.loaded = loaded
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
