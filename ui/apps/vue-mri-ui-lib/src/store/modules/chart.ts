// tslint:disable:no-shadowed-variable
import axios from 'axios'
import Constants from '../../utils/Constants'
import * as types from '../mutation-types'
import QueryString from '../../utils/QueryString'

const CancelToken = axios.CancelToken
const csvEndpoints = {
  stacked: '/analytics-svc/api/services/population/csv/barchart',
  boxplot: '/analytics-svc/api/services/population/csv/boxplot',
  km: '/analytics-svc/api/services/population/csv/kaplanmeier',
  list: '/analytics-svc/api/services/population/csv/patientlist',
}

const zipEndpoints = {
  list: '/analytics-svc/api/services/datastream/patient',
}

// initial state
const state = {
  layout: {
    activeChart: '',
    width: 0,
    height: 0,
  },
  chartSize: {
    width: 0,
    height: 0,
  },
  pdfReady: false,

  // the chart where to trigger csv download
  csvFireDownload: '',
  csvDownloadCompleted: false,

  zipFireDownload: '',
  zipDownloadCompleted: false,
  columnsToInclude: 'SELECTED',

  // fire chart request
  fireRequest: false,
}

// Cancel tokens
let cancel
let cancelZIP

// Split columns Based on entities
const splitEntitiesByColumns = (columns: Array<{ configPath: string; order: string; seq: number }>) => {
  const entityColumns = {}
  columns.forEach((el: { configPath: string }) => {
    const configPathTokens = el.configPath.split('.')
    let entityKey
    if (configPathTokens[1] === 'attributes') {
      // If patient attributes
      entityKey = configPathTokens[0]
    } else if (configPathTokens[1] === 'interactions') {
      // If Interaction's attributes
      entityKey = configPathTokens[2]
    } else {
      throw new Error(`Invalid config path ${el.configPath}`)
    }

    entityColumns[entityKey] ? entityColumns[entityKey].push(el) : (entityColumns[entityKey] = [el])
  })
  return entityColumns
}

// getters
const getters = {
  getCSVDownloadCompleted: modulestate => modulestate.csvDownloadCompleted,
  getZIPDownloadCompleted: modulestate => modulestate.zipDownloadCompleted,
  getSplitterWidth: modulestate => modulestate.layout.width,
  getChartSize: modulestate => modulestate.chartSize,
  getPdfChartReady: modulestate => modulestate.pdfReady,
  getActiveChart: modulestate => modulestate.layout.activeChart,
  getAllChartConfigs: (state, getters, rootState, rootGetters) => {
    if (rootGetters.getMriFrontendConfig) {
      return {
        ...rootGetters.getMriFrontendConfig._internalConfig.chartOptions,
      }
    }
    return {}
  },
  getChartConfigFor: (state, getters, rootState, rootGetters) => chartId =>
    rootGetters.getChartConfigService.getChartConfigFor(chartId),
  getCsvFireDownload: modulestate => modulestate.csvFireDownload,
  getZipFireDownload: modulestate => modulestate.zipFireDownload,
  getFireRequest: modulestate => modulestate.fireRequest,
}

// actions
const actions = {
  triggerSplitterSize({ state, commit }) {
    const { width, height } = state.layout
    commit(types.SPLITTER_RESIZE, { height, width: width + 1 })
  },
  setSplitterSize({ commit }, dimension) {
    commit(types.SPLITTER_RESIZE, dimension)
  },
  setChartSize({ commit }, dimension) {
    commit(types.CHART_RESIZE, dimension)
  },
  setPdfChartReady({ commit }, pdfReady) {
    commit(types.PDF_READY, pdfReady)
  },
  setActiveChart({ commit, dispatch }, chartName) {
    dispatch('clearResponse')
    commit(types.SWITCH_CHART, chartName)
  },
  cancelDownloadCSV({ dispatch }) {
    if (cancel) {
      dispatch('completeDownloadCSV')
      cancel('cancel')
    }
  },
  cancelDownloadZIP({ dispatch }) {
    if (cancelZIP) {
      dispatch('completeDownloadZIP')
      cancelZIP.abort()
    }
  },
  completeDownloadCSV({ commit }) {
    commit(types.CSV_DOWNLOAD_COMPLETED, { csvDownloadCompleted: true })
  },
  completeDownloadZIP({ commit }) {
    commit(types.ZIP_DOWNLOAD_COMPLETED, { downloadCompleted: true })
  },
  downloadCSV({ state, dispatch, rootGetters }, additionalParameter) {
    if (!additionalParameter) {
      return Promise.reject(`mriquery is required ${state.layout.activeChart}`)
    }

    if (!(state.layout.activeChart in csvEndpoints)) {
      return Promise.reject(`No endpoint specified for the current chart ${state.layout.activeChart}`)
    }

    if (cancel) {
      cancel()
    }
    const cancelToken = new CancelToken(c => {
      cancel = c
    })
    const url = csvEndpoints[state.layout.activeChart]

    const hasReleaseDate = !!rootGetters.getSelectedDatasetVersion?.releaseDate

    const urlWithQuerystring = QueryString({
      url,
      queryString: {
        mriquery: JSON.stringify(additionalParameter),
        dataFormat: 'csv',
        ...(hasReleaseDate && { releaseDate: rootGetters.getSelectedDatasetVersion.releaseDate }),
        datasetId: rootGetters.getSelectedDataset.id,
      },
      compress: ['mriquery'],
    })

    return dispatch('ajaxAuth', {
      method: 'get',
      cancelToken,
      url: urlWithQuerystring,
    }).catch(({ response }) => {
      let noDataReason = rootGetters.getText('MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE')

      if (response.data.errorType === 'MRILoggedError') {
        noDataReason = rootGetters.getText('MRI_DB_LOGGED_MESSAGE', response.data.logId)
      }

      dispatch('setAlertMessage', {
        message: noDataReason,
      })

      throw response
    })
  },
  downloadZIP({ state, dispatch, rootGetters }, additionalParameter) {
    const getAllColumns = () => {
      const updatedParameters = JSON.parse(JSON.stringify(additionalParameter))
      const interactionPaths = rootGetters.getColumnSelectionMenu.map(menu => menu.path).filter(path => path)
      const allInteractionAttributePaths = []
      interactionPaths.forEach((path: string) => {
        allInteractionAttributePaths.push(
          rootGetters.getColumnSelectionMenuByPath(path)?.subMenu.forEach(sm => {
            if (sm.data.oInternalConfigAttribute.type !== 'conceptSet') {
              allInteractionAttributePaths.push(sm.path)
            }
          })
        )
      })

      const allBasicAttributePaths = rootGetters.getMriFrontendConfig
        .getPatientListConfig()
        .getBasicDataCols()
        .attributes.map(attr => attr.sConfigPath)
      allInteractionAttributePaths.concat(allBasicAttributePaths)
      const allColumnPaths = allBasicAttributePaths.concat(allInteractionAttributePaths).filter(path => {
        if (!path) {
          return false
        }
        return true
      })
      updatedParameters.cohortDefinition.columns = allColumnPaths
        .map(path => {
          return {
            configPath: path,
            order: '',
            seq: 0,
          }
        })
        .filter(columnObj => columnObj.configPath)
      return updatedParameters
    }
    if (state.layout.activeChart in zipEndpoints) {
      // const fileStream = streamSaver.createWriteStream('archive.txt')

      if (cancelZIP) {
        cancelZIP.abort()
      }

      const cancelToken = (() => {
        cancelZIP = new AbortController()
        return cancelZIP
      })()

      let params
      let entityColumns

      if (state.layout.activeChart === 'list') {
        additionalParameter = state.columnsToInclude === 'SELECTED' ? additionalParameter : getAllColumns()
        params = rootGetters.getMriFrontendConfig.reverseTranslate({
          ...rootGetters.getRequest,
          ...additionalParameter,
        })
      } else {
        params = rootGetters.getBookmarksData
      }
      const url = zipEndpoints[state.layout.activeChart]
      try {
        entityColumns = splitEntitiesByColumns(params.cohortDefinition.columns)
      } catch (e) {
        dispatch('setAlertMessage', {
          message: e.message,
        })
        throw e
      }

      // Prepare Streaming request for each entity individually
      const requests = Object.keys(entityColumns).map(el => {
        const entityParams = JSON.parse(JSON.stringify(params))
        entityParams.cohortDefinition.columns = entityColumns[el]
        const hasReleaseDate = !!rootGetters.getSelectedDatasetVersion?.releaseDate

        return dispatch('ajaxFetchAuth', {
          options: {
            method: 'get',
            signal: cancelToken.signal,
          },
          url: QueryString({
            url,
            queryString: {
              mriquery: JSON.stringify(entityParams),
              dataFormat: 'csv',
              ...(hasReleaseDate && { releaseDate: rootGetters.getSelectedDatasetVersion.releaseDate }),
              datasetId: rootGetters.getSelectedDataset.id,
            },
            compress: ['mriquery'],
          }),
        })
          .then(response => {
            return { filename: `${el}.csv`, response }
          })
          .catch(err => {
            let noDataReason = rootGetters.getText('MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE')

            if (err.response.data.errorType === 'MRILoggedError') {
              noDataReason = rootGetters.getText('MRI_DB_LOGGED_MESSAGE', err.response.data.logId)
            }

            dispatch('setAlertMessage', {
              message: noDataReason,
            })
            throw err.response
          })
      })

      return Promise.all(requests) // Will fire parallel requests for each entity
    }

    return Promise.reject(`No endpoint specified for the current chart ${state.layout.activeChart}`)
  },
  setFireDownloadCSV({ commit }) {
    commit(types.CSV_DOWNLOAD_COMPLETED, { csvDownloadCompleted: false })
    commit(types.CHART_CSV_DOWNLOAD, Math.random())
  },
  setFireDownloadZIP({ commit }, { columnsToInclude }) {
    commit(types.ZIP_DOWNLOAD_COMPLETED, { downloadCompleted: false })
    commit(types.CHART_ZIP_DOWNLOAD, Math.random())
    commit(types.CHART_COLUMNS_TO_INCLUDE, columnsToInclude)
  },
  setInitialAxisSelection({ getters, dispatch, rootGetters }) {
    const initialAxis = rootGetters.getMriFrontendConfig.getInitialAxisSelection()
    for (let i = 0; i < Constants.MRIChartDimensions.Count; i += 1) {
      let filterCardId = ''
      let key = ''
      if (initialAxis && initialAxis[i] && initialAxis[i] !== 'hc.mri.pa.ui.lib.Selection.Invalid') {
        const axisValue = initialAxis[i].split('.')
        key = axisValue.pop()
        axisValue.pop()
        filterCardId = axisValue.join('.')

        dispatch('setAxisValue', {
          id: i,
          props: {
            key,
            filterCardId,
            attributeId: initialAxis[i],
          },
        })
      } else {
        dispatch('setAxisValue', {
          id: i,
          props: { key: '', filterCardId: '' },
        })
      }
    }
  },
  setupChartDefaults({ dispatch, getters }) {
    // this should only be called once the filtercards are setup (and pa config is loaded as well)
    dispatch('setActiveChart', getters.getAllChartConfigs.initialChart)
    dispatch('setInitialAxisSelection')
  },
  setFireRequest({ commit }) {
    commit(types.CHART_SET_FIRE_REQUEST)
  },
}

// mutations
const mutations = {
  [types.SPLITTER_RESIZE](modulestate, { width, height }) {
    modulestate.layout.width = width
    modulestate.layout.height = height
  },
  [types.CSV_DOWNLOAD_COMPLETED](modulestate, { csvDownloadCompleted }) {
    modulestate.csvDownloadCompleted = csvDownloadCompleted
  },
  [types.ZIP_DOWNLOAD_COMPLETED](modulestate, { downloadCompleted }) {
    modulestate.zipDownloadCompleted = downloadCompleted
  },
  [types.PDF_READY](modulestate, pdfReady) {
    modulestate.pdfReady = pdfReady
  },
  [types.CHART_RESIZE](modulestate, dimension) {
    const newSizeObj = {
      width: dimension.width,
      height: dimension.height,
    }
    modulestate.chartSize = newSizeObj
  },
  [types.SWITCH_CHART](modulestate, chartName) {
    modulestate.layout.activeChart = chartName
  },
  [types.CHART_CSV_DOWNLOAD](modulestate, fireDownload) {
    modulestate.csvFireDownload = fireDownload
  },
  [types.CHART_ZIP_DOWNLOAD](modulestate, fireDownload) {
    modulestate.zipFireDownload = fireDownload
  },
  [types.CHART_SET_FIRE_REQUEST](modulestate) {
    modulestate.fireRequest = !modulestate.fireRequest
  },
  [types.CHART_COLUMNS_TO_INCLUDE](modulestate, columnsToInclude) {
    modulestate.columnsToInclude = columnsToInclude
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
