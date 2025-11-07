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
  clearCohortDefinitionResponse({ commit }) {
    commit(types.COHORT_DEFINITION_RESPONSE_SET, { response: {} })
  },
  cancelCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }) {
    if (cancel) {
      cancel('cancel')
    }
  },
  fireD2EToAtlasCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }) {
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
  fireCreateAtlasCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }, { content }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })

    const params = JSON.stringify(content)

    return dispatch('ajaxAuth', {
      url: '/d2e-webapi/cohortdefinition',
      params,
      cancelToken,
      datasetId: rootGetters.getSelectedDataset.id,
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (response.data.noDataReason) {
          response.data.noDataReason = getters.getText(response.data.noDataReason)
        }
        commit(types.COHORT_DEFINITION_RESPONSE_SET, { response: { data: response.data } })
        dispatch('setToastMessage', {
          text: rootGetters.getText('MRI_PA_CREATE_ATLAS_COHORT_DEFINITION_SUCCESS'),
        })
        return response.data
      })
      .catch(error => {
        commit(types.COHORT_DEFINITION_RESPONSE_SET, {
          response: {
            data: 'An error occured',
          },
        })
        dispatch('setAlertMessage', {
          message: rootGetters.getText('MRI_PA_CREATE_ATLAS_COHORT_DEFINITION_ERROR'),
        })
        throw error
      })
  },
  fireRenameMaterializedCohortQuery({ commit, dispatch, getters, rootGetters }, { cohortDefinitionId, newName }) {
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
  fireDeleteMaterializedCohortQuery({ commit, dispatch, getters, rootGetters }, cohortDefinitionId) {
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
  fireDeleteAtlasCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }, atlasCohortDefinitionId) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })

    const datasetId = rootGetters.getSelectedDataset.id

    const url = `/d2e-webapi/cohortdefinition/${atlasCohortDefinitionId}`

    return dispatch('ajaxAuth', {
      url,
      method: 'DELETE',
      cancelToken,
      datasetId,
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
  fireUpdateAtlasCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }, { content }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })

    const params = JSON.stringify(content)
    return dispatch('ajaxAuth', {
      url: `/d2e-webapi/cohortdefinition/${content.id}`,
      method: 'PUT',
      params,
      cancelToken,
      datasetId: rootGetters.getSelectedDataset.id,
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (response.data.noDataReason) {
          response.data.noDataReason = getters.getText(response.data.noDataReason)
        }
        commit(types.COHORT_DEFINITION_RESPONSE_SET, { response: { data: response.data } })
        dispatch('setToastMessage', {
          text: rootGetters.getText('MRI_PA_UPDATE_ATLAS_COHORT_DEFINITION_SUCCESS'),
        })
        return response.data
      })
      .catch(error => {
        commit(types.COHORT_DEFINITION_RESPONSE_SET, {
          response: {
            data: 'An error occurred',
          },
        })
        dispatch('setAlertMessage', {
          message: rootGetters.getText('MRI_PA_UPDATE_ATLAS_COHORT_DEFINITION_ERROR'),
        })
        throw error
      })
  },
  fireGetAtlasCohortDefinitionQuery({ commit, dispatch, getters, rootGetters }, cohortDefinitionId) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })

    return dispatch('ajaxAuth', {
      url: `/d2e-webapi/cohortdefinition/${cohortDefinitionId}`,
      method: 'GET',
      cancelToken,
      datasetId: rootGetters.getSelectedDataset.id,
    })
      .then(response => {
        commit(types.COHORT_DEFINITION_RESPONSE_SET, { response: { data: response.data } })
        return response.data
      })
      .catch(error => {
        commit(types.COHORT_DEFINITION_RESPONSE_SET, {
          response: {
            data: 'An error occurred while fetching cohort definition',
          },
        })
        throw error
      })
  },
  fireCreateAtlasMaterializedCohortQuery({ state, commit, dispatch, rootGetters }, { url }) {
    if (cancel) {
      cancel('cancel')
    }
    const cancelToken = new axios.CancelToken(c => {
      cancel = c
    })
    return dispatch('ajaxAuth', {
      url,
      cancelToken,
      datasetId: rootGetters.getSelectedDataset.id,
      method: 'get',
    })
      .then(response => {
        dispatch('setToastMessage', {
          text: rootGetters.getText('MRI_PA_COLL_SUCCESS_ADD_PATIENT'),
        })
      })
      .catch(error => {
        throw rootGetters.getText('MRI_PA_COLL_FAILURE_ADD_PATIENT')
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
