import * as types from '../mutation-types'

// initial state
const state = {
  wizardConfig: null,
}

// getters
const getters = {
  getWizardConfig: modulestate => {
    console.log('[WizardConfig Getter] getWizardConfig called, returning:', modulestate.wizardConfig)
    return modulestate.wizardConfig
  },
}

// actions
const actions = {
  setWizardConfig({ commit }, wizardConfig) {
    console.log('[WizardConfig Action] setWizardConfig called with:', wizardConfig)
    commit(types.SET_WIZARD_CONFIG, wizardConfig)
    console.log('[WizardConfig Action] SET_WIZARD_CONFIG mutation committed')
  },
  clearWizardConfig({ commit }) {
    console.log('[WizardConfig Action] clearWizardConfig called')
    commit(types.CLEAR_WIZARD_CONFIG)
  },
}

// mutations
const mutations = {
  [types.SET_WIZARD_CONFIG](modulestate, wizardConfig) {
    console.log('[WizardConfig Mutation] SET_WIZARD_CONFIG called with:', wizardConfig)
    console.log('[WizardConfig Mutation] Before:', modulestate.wizardConfig)
    modulestate.wizardConfig = wizardConfig
    console.log('[WizardConfig Mutation] After:', modulestate.wizardConfig)
  },
  [types.CLEAR_WIZARD_CONFIG](modulestate) {
    console.log('[WizardConfig Mutation] CLEAR_WIZARD_CONFIG called')
    modulestate.wizardConfig = null
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
