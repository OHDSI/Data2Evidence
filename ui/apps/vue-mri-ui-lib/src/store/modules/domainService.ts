import axios, { Canceler } from 'axios'
import Fuse from 'fuse.js'
import QueryString from '../../utils/QueryString'
import * as types from '../mutation-types'
import { postProcessResults } from '../../../src/components/helpers/postProcessDomainValuesData'
import { getPortalAPI } from '../../utils/PortalUtils'

const CancelToken = axios.CancelToken
const cancelers: { [key: string]: Canceler } = {}
const latestRequestTimes: { [key: string]: number } = {}

declare interface IDomainValueItem {
  isLoaded: boolean
  isLoading: boolean
  datasetId?: string
  loadedStatus?: 'HAS_RESULTS' | 'NO_RESULTS' | 'TOO_MANY_RESULTS'
  values: Array<{
    display_value?: string
    score: number
    text: string
    value: string
  }>
}

// initial state
const state: {
  domainValues: {
    [index: string]: IDomainValueItem[]
  }
} = {
  domainValues: {},
}

// getters
const getters = {
  getDomainValues: modulestate => attributePath =>
    modulestate.domainValues[attributePath] || {
      isLoading: false,
      isLoaded: false,
      values: [],
    },
}

// actions
const actions = {
  loadValuesForAttributePath(
    // tslint:disable-next-line:no-shadowed-variable
    { state, commit, rootGetters, dispatch },
    {
      attributePathUid,
      searchQuery,
      attributeType,
    }: { attributePathUid: string; searchQuery: string; attributeType?: string }
  ) {
    const mriConfig = rootGetters.getMriConfig
    const datasetId = rootGetters.getSelectedDataset?.id || getPortalAPI()?.studyId

    // Skip if already loaded for this dataset (only for full list fetches, not searches)
    const existing = state.domainValues[attributePathUid]
    if (!searchQuery && existing?.isLoaded && !existing?.isLoading && existing?.datasetId === datasetId && datasetId) {
      return Promise.resolve(existing.values)
    }

    const requestTime = Date.now()
    latestRequestTimes[attributePathUid] = requestTime
    // Cancel previous unfinished api call
    if (cancelers[attributePathUid]) {
      cancelers[attributePathUid]()
    }
    const cancelToken = new CancelToken(c => {
      cancelers[attributePathUid] = c
    })
    commit(types.DOMAIN_SET_VALUES, {
      attributePath: attributePathUid,
      data: { values: [], isLoading: true, isLoaded: true },
    })

    return dispatch('ajaxAuth', {
      method: 'get',
      cancelToken,
      url: QueryString({
        url: '/analytics-svc/api/services/values',
        queryString: {
          attributePath: attributePathUid.split('__')[0],
          configId: mriConfig.meta.configId,
          configVersion: mriConfig.meta.configVersion,
          datasetId,
          searchQuery,
          attributeType,
        },
        compress: [],
      }),
    }).then(response => {
      if (latestRequestTimes[attributePathUid] !== requestTime) {
        return
      }
      const values = response.status === 204 ? [] : postProcessResults(response.data)
      const loadedStatus =
        response.status === 204 ? 'TOO_MANY_RESULTS' : values.length === 0 ? 'NO_RESULTS' : 'HAS_RESULTS'

      const data = {
        values,
        isLoading: false,
        isLoaded: true,
        loadedStatus,
        datasetId,
      }
      if (data?.values?.[0]?.value) {
        const fuse = new Fuse(data.values, { includeScore: true, keys: ['value', { name: 'text', weight: 10 }] })
        const searchResults = fuse.search(searchQuery)
        const emptySearch = !searchQuery || searchQuery.trim() === ''
        data.values = emptySearch ? data.values : searchResults.map(result => result.item)
      }
      commit(types.DOMAIN_SET_VALUES, { attributePath: attributePathUid, data })
      return data.values
    })
  },
}

// mutations
const mutations = {
  [types.DOMAIN_SET_VALUES](modulestate, { attributePath, data }: { attributePath: string; data: IDomainValueItem }) {
    modulestate.domainValues = {
      ...modulestate.domainValues,
      [attributePath]: data,
    }
  },
  [types.DOMAIN_INVALIDATE_ATTRIBUTE](modulestate, attributePath: string) {
    const { [attributePath]: _, ...rest } = modulestate.domainValues
    modulestate.domainValues = rest
  },
  [types.RESET_DATASET_CACHE](modulestate) {
    modulestate.domainValues = {}
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
