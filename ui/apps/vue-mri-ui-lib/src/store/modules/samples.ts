import axios from 'axios'
import * as types from '../mutation-types'

let cancel

const state = {
  samples: [],
  error: null,
  isLoading: false,
  currentSample: null,
}

const getters = {
  getSamples: state => state.samples,
  getCurrentSample: state => state.currentSample,
  error: state => state.error,
  isLoadingSamples: state => state.isLoading,
}

const actions = {
  cancelSamplesRequests() {
    if (cancel) {
      cancel('cancel')
    }
  },
  async fetchSamples({ commit, dispatch }, { cohortDefinitionId, sourceKey }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    commit(types.SAMPLES_SET_IS_LOADING, true)
    try {
      const { data } = await dispatch('ajaxAuth', {
        url: `/d2e-webapi/cohortsample/${cohortDefinitionId}/${sourceKey}`,
        method: 'GET',
        cancelToken,
      })
      commit(types.SAMPLES_SET_SAMPLES, data.samples)
    } catch (error) {
      if (!axios.isCancel(error)) {
        commit(types.SAMPLES_SET_ERROR, error)
      }
    } finally {
      commit(types.SAMPLES_SET_IS_LOADING, false)
    }
  },

  async fetchSampleById({ commit, dispatch }, { cohortDefinitionId, sourceKey, sampleId }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    commit(types.SAMPLES_SET_IS_LOADING, true)
    try {
      const { data } = await dispatch('ajaxAuth', {
        url: `/d2e-webapi/cohortsample/${cohortDefinitionId}/${sourceKey}/${sampleId}`,
        method: 'GET',
        cancelToken,
      })
      commit(types.SAMPLES_SET_CURRENT_SAMPLES, data)
    } catch (error) {
      if (!axios.isCancel(error)) {
        commit(types.SAMPLES_SET_ERROR, error)
      }
    } finally {
      commit(types.SAMPLES_SET_IS_LOADING, false)
    }
  },

  async createSample({ commit, rootGetters, dispatch }, { cohortDefinitionId, name, size }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    commit(types.SAMPLES_SET_IS_LOADING, true)
    const source = rootGetters.getSelectedDataset.sourceKey
    try {
      const { data } = await dispatch('ajaxAuth', {
        url: `/d2e-webapi/cohortsample/${cohortDefinitionId}/${source}`,
        method: 'POST',
        data: {
          name,
          size,
        },
        cancelToken,
      })
      commit(types.SAMPLES_ADD_SAMPLE, data)
    } catch (error) {
      if (!axios.isCancel(error)) {
        commit(types.SAMPLES_SET_ERROR, error)
      }
    } finally {
      commit(types.SAMPLES_SET_IS_LOADING, false)
    }
  },

  async deleteSample({ commit, rootGetters, dispatch }, { cohortDefinitionId, sampleId }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    commit(types.SAMPLES_SET_IS_LOADING, true)
    const source = rootGetters.getSelectedDataset.sourceKey
    try {
      await dispatch('ajaxAuth', {
        url: `/d2e-webapi/cohortsample/${cohortDefinitionId}/${source}/${sampleId}`,
        method: 'DELETE',
        cancelToken,
      })
      commit(types.SAMPLES_REMOVE_SAMPLE, sampleId)
    } catch (error) {
      if (!axios.isCancel(error)) {
        commit(types.SAMPLES_SET_ERROR, error)
      }
    } finally {
      commit(types.SAMPLES_SET_IS_LOADING, false)
    }
  },
}

const mutations = {
  [types.SAMPLES_SET_SAMPLES](state, samples) {
    state.samples = samples
  },
  [types.SAMPLES_SET_CURRENT_SAMPLES](state, sample) {
    state.currentSample = sample
  },
  [types.SAMPLES_ADD_SAMPLE](state, sample) {
    state.samples.push(sample)
  },
  [types.SAMPLES_REMOVE_SAMPLE](state, sampleId) {
    state.samples = state.samples.filter(s => s.id !== sampleId)
  },
  [types.SAMPLES_SET_ERROR](state, error) {
    state.error = error
  },
  [types.SAMPLES_SET_IS_LOADING](state, isLoading) {
    state.isLoading = isLoading
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}

