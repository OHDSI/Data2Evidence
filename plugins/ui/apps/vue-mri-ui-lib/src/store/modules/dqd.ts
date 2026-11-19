import axios, { AxiosError } from 'axios'
const CancelToken = axios.CancelToken
import QueryString from '@/utils/QueryString'
let cancel

const job_plugins_url = '/jobplugins/'

const actions = {
  async fetchDataQualityFlowRun({ commit, dispatch, rootGetters }, { cohortDefinitionId, datasetId: requested }) {
    // The exploration card passes the dataset it resolved itself; without one
    // the store's selection is used.
    const datasetId = requested ?? rootGetters.getSelectedDataset.id

    let url = QueryString({
      url: `${job_plugins_url}dqd/data-quality/cohort/${cohortDefinitionId}/flow-run/latest`,
      queryString: {
        datasetId,
      },
      compress: [],
    })
    return dispatch('ajaxAuth', {
      url,
      method: 'GET',
    })
      .then(response => {
        return response.data
      })
      .catch((error: AxiosError) => {
        if (error?.response?.status == 404) {
          return null
        }
        throw 'Failed to fetch data:'
      })
  },
  async generateDataQualityFlowRun({ commit, dispatch, rootGetters }, GenerateDataQualityFlowRunParams) {
    if (cancel) {
      cancel()
    }
    const cancelToken = new CancelToken(c => {
      cancel = c
    })

    let url = `${job_plugins_url}dqd/data-quality/flow-run`
    return dispatch('ajaxAuth', { url, method: 'POST', params: GenerateDataQualityFlowRunParams, cancelToken })
      .then(response => {
        return response.data
      })
      .catch(error => {
        throw 'Failed to run Data Quality Check'
      })
  },
  /**
   * Starts a cohort's data quality run and resolves to `{ flowRunId }`.
   *
   * Unlike generateDataQualityFlowRun this shares no cancel token: that one
   * cancels any earlier POST still in flight, so two starts on two exploration
   * cards in quick succession would lose the first. jobplugins requires the
   * cohort id as a string.
   */
  async startDataQualityFlowRun({ dispatch }, { datasetId, cohortDefinitionId }) {
    const params = {
      datasetId,
      comment: '',
      cohortDefinitionId: String(cohortDefinitionId),
      releaseId: '',
      vocabSchemaName: '',
    }
    return dispatch('ajaxAuth', { url: `${job_plugins_url}dqd/data-quality/flow-run`, method: 'POST', params })
      .then(response => response.data)
      .catch((error: AxiosError<{ message?: unknown }>) => {
        const status = error?.response?.status ?? 0
        const detail = error?.response?.data?.message
        const failure = new Error('Failed to start data quality')
        throw status >= 400 && status < 500 && typeof detail === 'string' ? Object.assign(failure, { detail }) : failure
      })
  },
}

export default {
  actions,
}
