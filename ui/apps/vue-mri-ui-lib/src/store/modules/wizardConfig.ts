import * as types from '../mutation-types'

// initial state
const state = {
  wizardConfig: null,
}

// getters
const getters = {
  getWizardConfig: modulestate => {
    return modulestate.wizardConfig
  },
}

// actions
const actions = {
  setWizardConfig({ commit }, wizardConfig) {
    commit(types.SET_WIZARD_CONFIG, wizardConfig)
  },
  clearWizardConfig({ commit }) {
    commit(types.CLEAR_WIZARD_CONFIG)
  },
}

// mutations
const mutations = {
  [types.SET_WIZARD_CONFIG](modulestate, wizardConfig) {
    modulestate.wizardConfig = wizardConfig
  },
  [types.CLEAR_WIZARD_CONFIG](modulestate) {
    modulestate.wizardConfig = null
  },
  // Wizard config is cleared when bookmark changes
  // This is handled by subscribing to bookmark mutations
  [types.SET_ACTIVE_BOOKMARK](modulestate) {
    // Clear wizard config when any bookmark change occurs
    // The bookmark module handles the actual bookmark switch detection
    modulestate.wizardConfig = null
  },
  [types.RESET_ALL_BOOKMARKS](modulestate) {
    modulestate.wizardConfig = null
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
