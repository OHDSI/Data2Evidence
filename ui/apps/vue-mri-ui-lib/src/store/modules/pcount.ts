import * as types from '@/store/mutation-types'

// initial state
const state = {
  displayTotalGuardedPatientCount: false,
  patientTotalRequested: false,
}

// getters
const getters = {
  getDisplayTotalGuardedPatientCount: (modulestate, rootGetters) => {
    // Always return guarded total patient count for patient list
    if (rootGetters.getActiveChart === 'list' || rootGetters.getActiveChart === 'custom') {
      return true
    } else if (rootGetters.getActiveChart === 'vb') {
      // VB should be able to display guarded and unguarded count. A flag has to
      // to  be explicitly set
      return modulestate.displayTotalGuardedPatientCount
    }

    // for all other charts, display unguarded count
    return false
  },
}

// actions
const actions = {
  setPatientTotalRequested({ commit }, patientTotalRequested) {
    commit(types.PCOUNT_SET_PATIENT_TOTAL_REQUESTED, patientTotalRequested)
  },
  requestTotalPatientCount({ commit, state, rootGetters, dispatch }) {
    commit(types.PCOUNT_SET_PATIENT_TOTAL_REQUESTED, true)
    const configMetadata = rootGetters.getMriFrontendConfig.getConfigMetadata()
    const bm = {
      filter: {
        configMetadata: {
          id: configMetadata.configId,
          version: configMetadata.configVersion,
        },
        cards: {
          type: 'BooleanContainer',
          op: 'AND',
          content: [
            {
              type: 'BooleanContainer',
              op: 'OR',
              content: [],
            },
          ],
        },
      },
      axisSelection: [],
      metadata: {
        version: 3,
      },
      datasetId: rootGetters.getSelectedDataset.id,
    }

    dispatch('firePatientCountQuery', {
      type: 'total',
      params: bm,
    })
  },
  refreshPatientCount({ commit, state, rootGetters, dispatch }) {
    if (!rootGetters.getPatientListTotalRequested) {
      dispatch('setPatientListTotalRequested', true)
      const configMetadata = rootGetters.getMriFrontendConfig.getConfigMetadata()
      const request = {
        cards: {
          type: 'BooleanContainer',
          op: 'AND',
          content: [
            {
              type: 'BooleanContainer',
              op: 'OR',
              content: [],
            },
          ],
        },
        guarded: true,
        limit: 20,
        offset: 0,
        axes: [],
        configData: {
          configId: configMetadata.configId,
          configVersion: configMetadata.configVersion,
        },
        datasetId: rootGetters.getSelectedDataset.id,
      }
      dispatch('firePatientListCountQuery', {
        type: 'total',
        params: request,
      })
    }
    if (state.patientTotalRequested) {
      dispatch('requestTotalPatientCount')
    }
  },
}

// mutations
const mutations = {
  [types.PCOUNT_SET_DISPLAYTOTALGUARDEDPATIENTCOUNT](modulestate, { isDisplay }) {
    modulestate.displayTotalGuardedPatientCount = isDisplay
  },
  [types.PCOUNT_SET_PATIENT_TOTAL_REQUESTED](modulestate, patientTotalRequested) {
    modulestate.patientTotalRequested = patientTotalRequested
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
