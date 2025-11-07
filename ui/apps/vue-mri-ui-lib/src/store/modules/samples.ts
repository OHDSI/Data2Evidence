import axios from 'axios'
import * as types from '../mutation-types'
import { Sample } from '@/query-filter/types/SamplesTypes'

let cancel

interface SamplesState {
  samples: Sample[]
  error: Error | null
  isLoadingSamples: boolean
  isLoadingSampleById: boolean
  isCreatingSample: boolean
  deletingSampleId: number | null
  activeSample: Sample | null
}

const state: SamplesState = {
  samples: [],
  error: null,
  isLoadingSamples: false,
  isLoadingSampleById: false,
  isCreatingSample: false,
  deletingSampleId: null,
  activeSample: null,
}

const getters = {
  getSamples: (state: SamplesState) => state.samples,
  getActiveSample: (state: SamplesState) => state.activeSample,
  error: (state: SamplesState) => state.error,
  isLoadingSamples: (state: SamplesState) => state.isLoadingSamples,
  isLoadingSampleById: (state: SamplesState) => state.isLoadingSampleById,
  isCreatingSample: (state: SamplesState) => state.isCreatingSample,
  getDeletingSampleId: (state: SamplesState) => state.deletingSampleId,
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
    commit(types.SAMPLES_SET_IS_LOADING_SAMPLES, true)
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
      commit(types.SAMPLES_SET_IS_LOADING_SAMPLES, false)
    }
  },

  async fetchSampleById({ commit, dispatch }, { cohortDefinitionId, sourceKey, sampleId }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    commit(types.SAMPLES_SET_IS_LOADING_SAMPLE_BY_ID, true)
    try {
      const { data } = await dispatch('ajaxAuth', {
        url: `/d2e-webapi/cohortsample/${cohortDefinitionId}/${sourceKey}/${sampleId}`,
        method: 'GET',
        cancelToken,
      })
      commit(types.SAMPLES_SET_ACTIVE_SAMPLE, data)
    } catch (error) {
      if (!axios.isCancel(error)) {
        commit(types.SAMPLES_SET_ERROR, error)
      }
    } finally {
      commit(types.SAMPLES_SET_IS_LOADING_SAMPLE_BY_ID, false)
    }
  },

  async createSample({ commit, dispatch }, { cohortDefinitionId, payload, sourceKey }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    commit(types.SAMPLES_SET_IS_CREATING_SAMPLE, true)
    try {
      const response = await dispatch('ajaxAuth', {
        url: `/d2e-webapi/cohortsample/${cohortDefinitionId}/${sourceKey}`,
        method: 'POST',
        params: payload,
        cancelToken,
      })
      commit(types.SAMPLES_ADD_SAMPLE, response.data)
    } catch (error) {
      if (!axios.isCancel(error)) {
        commit(types.SAMPLES_SET_ERROR, error)
      }
      throw error
    } finally {
      commit(types.SAMPLES_SET_IS_CREATING_SAMPLE, false)
    }
  },

  async deleteSample({ commit, dispatch, getters }, { cohortDefinitionId, sampleId, sourceKey }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    commit(types.SAMPLES_SET_DELETING_SAMPLE_ID, sampleId)
    try {
      await dispatch('ajaxAuth', {
        url: `/d2e-webapi/cohortsample/${cohortDefinitionId}/${sourceKey}/${sampleId}`,
        method: 'DELETE',
        cancelToken,
      })
      commit(types.SAMPLES_REMOVE_SAMPLE, sampleId)
      if (getters.getActiveSample && getters.getActiveSample.id === sampleId) {
        commit(types.SAMPLES_SET_ACTIVE_SAMPLE, null)
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        commit(types.SAMPLES_SET_ERROR, error)
      }
    } finally {
      commit(types.SAMPLES_SET_DELETING_SAMPLE_ID, null)
    }
  },
  resetSamplesState({ commit }) {
    commit(types.SAMPLES_RESET_STATE)
  },
}

const mutations = {
  [types.SAMPLES_SET_SAMPLES](state, samples) {
    state.samples = samples
  },
  [types.SAMPLES_SET_ACTIVE_SAMPLE](state, sample) {
    state.activeSample = sample
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
  [types.SAMPLES_SET_IS_LOADING_SAMPLES](state, isLoading) {
    state.isLoadingSamples = isLoading
  },
  [types.SAMPLES_SET_IS_LOADING_SAMPLE_BY_ID](state, isLoading) {
    state.isLoadingSampleById = isLoading
  },
  [types.SAMPLES_SET_IS_CREATING_SAMPLE](state, isCreating) {
    state.isCreatingSample = isCreating
  },
  [types.SAMPLES_SET_DELETING_SAMPLE_ID](state, sampleId) {
    state.deletingSampleId = sampleId
  },
  [types.SAMPLES_RESET_STATE](state) {
    state.samples = []
    state.error = null
    state.isLoadingSamples = false
    state.isLoadingSampleById = false
    state.isCreatingSample = false
    state.deletingSampleId = null
    state.activeSample = null
  },
}

export default {
  state,
  getters,
  actions,
  mutations,


}