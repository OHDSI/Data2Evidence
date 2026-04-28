import * as types from '../mutation-types'

// initial state
const state = {
  backendIFR: {},

  // id's of new cards to highlight
  newCards: {},
}

// getters
const getters = {
  getFilterCardMenu: (modulestate, moduleGetters, rootState, rootGetters) => {
    const aMenuItems = []
    if (rootGetters.getMriFrontendConfig) {
      rootGetters.getMriFrontendConfig.getFilterCards().forEach(oFilterCardConfig => {
        if (!oFilterCardConfig.isBasicData()) {
          aMenuItems.push({
            key: oFilterCardConfig.getConfigPath(),
            text: oFilterCardConfig.getName(),
          })
        }
      })
    }
    return aMenuItems
  },
  // this is IFR without the underscores.
  getIFR1: modulestate => modulestate.backendIFR,
  getNewCardStates: modulestate => modulestate.newCards,
}

// actions
const actions = {
  addNewFilterCard({ commit, dispatch }, { configPath, isExclusion = false }) {
    return dispatch('addFilterCard', {
      boolFilterContainerId: null,
      configPath,
      isExclusion,
    }).then(filtercardId => {
      commit(types.FILTERCARD_ADD_NEW_STATE, filtercardId)
      return filtercardId
    })
  },
  setCurrentBackendIFR({ commit }, backendIFR) {
    commit(types.BACKENDIFR_SET_CURRENT, backendIFR)
  },
  resetFilters({ commit }) {
    commit(types.BACKENDIFR_SET_CURRENT, {})
    commit(types.FILTERCARD_RESET_NEW_STATE)
  },
}

// mutations
const mutations = {
  [types.BACKENDIFR_SET_CURRENT](modulestate, backendIFR) {
    modulestate.backendIFR = backendIFR
  },
  [types.FILTERCARD_ADD_NEW_STATE](modulestate, filtercardId) {
    modulestate.newCards = { ...modulestate.newCards, [filtercardId]: true }
  },
  [types.FILTERCARD_REMOVE_NEW_STATE](modulestate, filtercardId) {
    modulestate.newCards = { ...modulestate.newCards, [filtercardId]: false }
  },
  [types.FILTERCARD_RESET_NEW_STATE](modulestate) {
    modulestate.newCards = {}
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
