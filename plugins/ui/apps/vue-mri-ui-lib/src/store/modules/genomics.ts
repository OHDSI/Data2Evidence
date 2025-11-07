import * as types from '../mutation-types'
// initial state
const state = {
  geneSummaryXAxis: false,
  geneAlterationXAxis: false,
  geneAlterationCategory: false,
  selectedGenomicsTab: 'variant_browser',
}

// getters
const getters = {
  getGeneSummaryXAxis: modulestate => modulestate.geneSummaryXAxis,
  getGeneAlterationXAxis: modulestate => modulestate.geneAlterationXAxis,
  getGeneAlterationCategory: modulestate => modulestate.geneAlterationCategory,
  getSelectedGenomicsTab: modulestate => modulestate.selectedGenomicsTab,
  getGenomicsAxisVisible: modulestate =>
    modulestate.selectedGenomicsTab === 'variant_browser' ||
    (modulestate.selectedGenomicsTab === 'gene_summary' && modulestate.geneSummaryXAxis) ||
    (modulestate.selectedGenomicsTab === 'gene_alteration' && modulestate.geneAlterationXAxis),
}

const actions = {
  queryGenomicsSettings({ commit, dispatch }) {
    const url = '/hc/hph/config/user/global_enduser.xsjs'
    const params = {
      action: 'loadGenomicsSettings',
    }
    dispatch('ajaxAuth', { url, params }).then(response => {
      commit(types.SET_GENOMICS_SETTINGS, { response: response.data })
      if (response.data && response.data.filterSummaryVisible) {
        dispatch('setFilterSummaryVisibility', {
          filterSummaryVisibility: response.data.filterSummaryVisible,
        })
      }
    })
  },
  setSelectedGenomicsTab({ commit, dispatch }, { selectedTab }) {
    commit(types.SET_GENOMICS_TAB, { selectedTab })
  },
}

// mutations
const mutations = {
  [types.SET_GENOMICS_SETTINGS](modulestate, { response }) {
    modulestate.geneSummaryXAxis = response.geneSummaryXAxis === true
    modulestate.geneAlterationXAxis = response.geneAlterationXAxis === true
    modulestate.geneAlterationCategory = response.geneAlterationCategory === true
  },
  [types.SET_GENOMICS_TAB](modulestate, { selectedTab }) {
    modulestate.selectedGenomicsTab = selectedTab
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
