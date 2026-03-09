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
  [types.SET_ACTIVE_BOOKMARK](modulestate, bookmark) {
    // Clear wizard config when any bookmark change occurs
    // The bookmark module handles the actual bookmark switch detection
    if (bookmark?.bmkId === 'deep-link') {
      return
    }
    modulestate.wizardConfig = null
  },
  // Wizard config is cleared when dataset changes
  [types.SET_SELECTED_DATASET](modulestate) {
    modulestate.wizardConfig = null
  },
  // Wizard config is cleared when dataset release ID changes
  [types.SET_SELECTED_DATASET_RELEASE_ID](modulestate) {
    modulestate.wizardConfig = null
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
