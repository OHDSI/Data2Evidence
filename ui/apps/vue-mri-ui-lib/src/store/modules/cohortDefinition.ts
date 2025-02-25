import axios from 'axios'
import * as types from '../mutation-types'
import StringToBinary from '@/utils/StringToBinary'
import QueryString from '@/utils/QueryString'

let cancel

const state = {
  response: {},
}

const getters = {
  getCohortDefinitionResponse: modulestate => () => modulestate.response,
}

const actions = {
  clearResponse({ commit }) {
    commit(types.COHORT_DEFINITION_RESPONSE_SET, { response: {} })
  },
  cancelCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }) {
    if (cancel) {
      cancel('cancel')
    }
  },
  fireCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })

    const params = {
      datasetId: rootGetters.getSelectedDataset.id,
      mriquery: StringToBinary(JSON.stringify(rootGetters.getPLRequest({ bmkId: this.bookmarkId }))),
    }
    return dispatch('ajaxAuth', {
      url: '/analytics-svc/api/services/generate-cohort-definition',
      params,
      cancelToken,
    })
      .then(response => {
        if (response.data.noDataReason) {
          response.data.noDataReason = getters.getText(response.data.noDataReason)
        }
        commit(types.COHORT_DEFINITION_RESPONSE_SET, { response: { data: response.data } })
        return response.data
      })
      .catch(error => {
        commit(types.COHORT_DEFINITION_RESPONSE_SET, {
          response: {
            data: 'An error occured',
          },
        })
        throw error
      })
  },
  fireRenameCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }, { cohortDefinitionId, newName }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })

    const params = {
      datasetId: rootGetters.getSelectedDataset.id,
      cohortDefinitionId: cohortDefinitionId,
      name: newName,
    }

    return dispatch('ajaxAuth', {
      url: '/analytics-svc/api/services/cohort-definition',
      method: 'put',
      params,
      cancelToken,
    })
      .then(({ data }) => {
        dispatch('setToastMessage', {
          text: rootGetters.getText('MRI_PA_RENAME_BMK_SUCCESS'),
        })
        return data
      })
      .catch(error => {
        dispatch('setAlertMessage', {
          message: rootGetters.getText('MRI_PA_RENAME_BMK_ERROR'),
        })
      })
  },
  fireDeleteCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }, cohortDefinitionId) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })

    const datasetId = rootGetters.getSelectedDataset.id

    let url = QueryString({
      url: '/analytics-svc/api/services/cohort',
      queryString: {
        datasetId,
        cohortId: cohortDefinitionId,
      },
      compress: [],
    })

    return dispatch('ajaxAuth', {
      url,
      method: 'DELETE',
      cancelToken,
    })
      .then(({ data }) => {
        dispatch('setToastMessage', {
          text: rootGetters.getText('MRI_PA_DELETE_BMK_SUCCESS'),
        })
      })
      .catch(error => {
        dispatch('setAlertMessage', {
          message: rootGetters.getText('MRI_PA_DELETE_BMK_ERROR'),
        })
      })
  },
}

const mutations = {
  [types.COHORT_DEFINITION_RESPONSE_SET](modulestate, { response }) {
    modulestate.response = { ...modulestate.response, ...response }
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
