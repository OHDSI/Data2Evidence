import axios, { AxiosError } from 'axios'
const CancelToken = axios.CancelToken
import QueryString from '@/utils/QueryString'
let cancel

const job_plugins_url = '/jobplugins/'

const actions = {
  async fetchDataQualityFlowRun({ commit, dispatch, rootGetters }, { cohortDefinitionId }) {
    const datasetId = rootGetters.getSelectedDataset.id

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
        if (error.response.status == 404) {
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
}

export default {
  actions,
}
