// tslint:disable:no-shadowed-variable
import axios from 'axios'
import BMv2Parser from '../../lib/bookmarks/BMv2Parser'
import Constants from '../../utils/Constants'
import * as types from '../mutation-types'
import isEqual from 'lodash/isEqual'
import {
  formatBookmark,
  formatCohortDefinition,
  formatAtlasCohortDefinition,
  processBookmarksData,
} from '@/utils/BookmarkUtils'

const CancelToken = axios.CancelToken
let cancel
// initial state
const state = {
  bookmarks: [],
  materializedCohorts: [],
  atlasCohortDefinitions: [],
  filterSummaryVisible: false,
  schemaName: '',
  activeBookmark: null,
  addNewCohort: false,
  loading: false,
  canDatasetMaterializeCohorts: false,
  canMaterializeCohortDatasetId: '',   // tracks which dataset the cached result belongs to
}

const bookmarkURL = '/analytics-svc/api/services/bookmark'
const webApiCohortDefinitionURL = '/d2e-webapi/cohortdefinition'

// getters
const getters = {
  getBookmarksLoading: modulestate => modulestate.loading,
  getBookmarks: modulestate => modulestate.bookmarks,
  getCanDatasetMaterializeCohorts: modulestate => modulestate.canDatasetMaterializeCohorts,
  getFilterSummaryVisibility: modulestate => modulestate.filterSummaryVisible,
  getSchemaName: modulestate => modulestate.schemaName,
  getAddNewCohort: modulestate => modulestate.addNewCohort,
  getBookmarksData: (modulestate, moduleGetters, rootState, rootGetters) => {
    let filter = JSON.parse(JSON.stringify(rootGetters.getBookmarkFromIFR))

    if (Object.keys(filter).length === 0) {
      return {}
    }
    const chartType = rootGetters.getActiveChart

    if (chartType === 'list') {
      const resultDefinition = rootGetters.getPLModel.resultDefinition
      if (resultDefinition) {
        filter = {
          ...filter,
          ...resultDefinition,
        }
      }
    }

    if (chartType === 'stacked') {
      const sortProperty = rootGetters.getChartProperty(Constants.MRIChartProperties.Sort)
      if (sortProperty && sortProperty.props && sortProperty.props.value) {
        filter.sort = sortProperty.props.value
      }
    }

    if (chartType === 'km') {
      const kmStartEvent = rootGetters.getChartProperty(Constants.MRIChartProperties.KMStartEvent)
      if (kmStartEvent && kmStartEvent.props && kmStartEvent.props.value) {
        filter.selected_event = {
          key: kmStartEvent.props.value.kmEventIdentifier,
        }
        filter.selected_start_event_occ = {
          key: kmStartEvent.props.value.kmStartEventOccurence,
        }
      }

      const kmEndEvent = rootGetters.getChartProperty(Constants.MRIChartProperties.KMEndEvent)
      if (kmEndEvent && kmEndEvent.props && kmEndEvent.props.value) {
        filter.selected_end_event = {
          key: kmEndEvent.props.value.kmEndEventIdentifier,
        }
        filter.selected_end_event_occ = {
          key: kmEndEvent.props.value.kmEndEventOccurence,
        }
      }

      const displayInfo = rootGetters.getKMDisplayInfo

      filter.errorlines = displayInfo.errorlines
      filter.censoring = displayInfo.censoring
    }

    const allAxes = rootGetters.getAllAxes
    const axisSelection = []
    const axisId = ['x1', 'x2', 'x3', 'x4', 'y1']
    for (let i = 0; i < allAxes.length; i += 1) {
      const axisInfo = {
        attributeId: 'n/a',
        binsize: 'n/a',
        categoryId: axisId[i],
      }
      if (allAxes[i].props.filterCardId && allAxes[i].props.key) {
        axisInfo.attributeId = allAxes[i].props.attributeId

        axisInfo.binsize =
          allAxes[i].props.binsize === ''
            ? (rootGetters.getMriFrontendConfig.getAttributeByPath(axisInfo.attributeId).getDefaultBinSize() ?? 'n/a')
            : allAxes[i].props.binsize
      }
      axisSelection.push(axisInfo)
    }

    const metadata = { version: 3 }

    return {
      filter,
      chartType,
      axisSelection,
      metadata,
      datasetId: rootGetters.getSelectedDataset.id,
    }
  },
  getBookmarkById: modulestate => bmkId =>
    JSON.parse(modulestate.bookmarks.find(b => b.bmkId === bmkId).bookmark || '{}'),
  getActiveBookmark: modulestate => modulestate.activeBookmark,
  getActiveCohortMaterializedId: modulestate => {
    // Get materializedCohortId from active bookmark's cohortDefinitionId
    if (!modulestate.activeBookmark?.cohortDefinitionId) {
      return null
    }
    const materializedCohort = modulestate.materializedCohorts.find(
      mc => mc.id === modulestate.activeBookmark.cohortDefinitionId
    )
    return materializedCohort?.id || null
  },
  getMaterializedCohorts: modulestate => modulestate.materializedCohorts,
  getBookmark: modulestate => bmkId => modulestate.bookmarks.find(b => b.bmkId === bmkId),
  getBookmarkByNameAndUsername: modulestate => (name, username) => {
    return modulestate.bookmarks.find(b => b.bookmarkname === name && b.user_id === username)
  },
  getCurrentBookmarkHasChanges: (modulestate, moduleGetters) => {
    if (modulestate.activeBookmark == null) {
      return false
    }
    // For new bookmarks or bookmarks without saved data, there are no changes to compare
    if (!modulestate.activeBookmark.bookmark) {
      return false
    }
    const bookmark = JSON.parse(modulestate.activeBookmark.bookmark)
    const newBookmarksFilter = moduleGetters.getBookmarksData.filter
    const currentBookmarksFilter = bookmark?.filter
    const newBookmarksAxisSelection = moduleGetters.getBookmarksData.axisSelection
    const currentBookmarksAxisSelection = bookmark?.axisSelection
    return (
      !isEqual(newBookmarksFilter, currentBookmarksFilter) ||
      !isEqual(newBookmarksAxisSelection, currentBookmarksAxisSelection)
    )
  },
  getDisplayBookmarks: modulestate => (showSharedBookmarks, username) => {
    try {
      const bookmarks: FormattedBookmark[] = modulestate.bookmarks
      const materializedCohorts: FormattedMaterializedCohort[] = modulestate.materializedCohorts
      const atlasCohortDefinitions: FormattedAtlasCohortDefinition[] = modulestate.atlasCohortDefinitions

      let displayBookmarks = []

      // cohort definitions without bookmark
      // cohort definitions with bookmark
      materializedCohorts.forEach(cohortDefinition => {
        // displayBookmarkDateFormat expects ISO String
        cohortDefinition.createdOn = new Date(cohortDefinition.createdOn).toISOString()
        // check bookmark exists, if yes, should use the bookmark name
        const bookmark = bookmarks.find(
          bookmark =>
            bookmark?.cohortDefinitionId === cohortDefinition.id &&
            bookmark.bookmarkname === cohortDefinition?.cohortDefinitionName
        )
        const atlasCohortDefinition = atlasCohortDefinitions.find(cd => cd.cohortDefinitionId === cohortDefinition.id)
        if (!bookmark && !atlasCohortDefinition) {
          return displayBookmarks.push({
            displayName: cohortDefinition.cohortDefinitionName,
            bookmark: null,
            cohortDefinition: formatCohortDefinition(cohortDefinition),
          })
        }

        if (bookmark) {
          if (showSharedBookmarks && (username === bookmark.user_id || bookmark.shared)) {
            return displayBookmarks.push({
              displayName: bookmark.bookmarkname,
              bookmark: { ...formatBookmark(bookmark), disableUpdate: username !== bookmark.user_id },
              cohortDefinition: formatCohortDefinition(cohortDefinition),
            })
          } else if (!showSharedBookmarks && username === bookmark.user_id) {
            return displayBookmarks.push({
              displayName: bookmark.bookmarkname,
              bookmark: { ...formatBookmark(bookmark), disableUpdate: username !== bookmark.user_id },
              cohortDefinition: formatCohortDefinition(cohortDefinition),
            })
          }
        }
        if (atlasCohortDefinition) {
          displayBookmarks.push({
            displayName: atlasCohortDefinition.name,
            cohortDefinition: formatCohortDefinition(cohortDefinition),
            atlasCohortDefinition: formatAtlasCohortDefinition(atlasCohortDefinition),
          })
        }
      })

      // Atlas Cohort Definitions without a materialized cohort
      atlasCohortDefinitions
        .filter(cd => !materializedCohorts.find(mc => mc.id === cd.cohortDefinitionId))
        .forEach(cd => {
          displayBookmarks.push({
            displayName: cd.name,
            cohortDefinition: null,
            atlasCohortDefinition: formatAtlasCohortDefinition(cd),
          })
        })

      // bookmarks without a materialized cohort
      bookmarks.forEach(bookmark => {
        const materializedCohort = materializedCohorts.find(
          cohort => bookmark.bookmarkname === cohort?.cohortDefinitionName && cohort.id === bookmark?.cohortDefinitionId
        )

        if (materializedCohort) {
          return
        }

        if (showSharedBookmarks && (username === bookmark.user_id || bookmark.shared)) {
          return displayBookmarks.push({
            displayName: bookmark.bookmarkname,
            bookmark: { ...formatBookmark(bookmark), disableUpdate: username !== bookmark.user_id },
            cohortDefinition: null,
          })
        } else if (!showSharedBookmarks && username === bookmark.user_id) {
          return displayBookmarks.push({
            displayName: bookmark.bookmarkname,
            bookmark: { ...formatBookmark(bookmark), disableUpdate: username !== bookmark.user_id },
            cohortDefinition: null,
          })
        }
      })

      return displayBookmarks
    } catch (e) {
      console.error(e)
    }
  },
}

const actions = {
  setAddNewCohort({ commit }, { addNewCohort }) {
    commit(types.SET_ADD_NEW_COHORT, { addNewCohort })
  },
  fireBookmarkQuery({ commit, dispatch, rootGetters }, { method = 'post', params, bookmarkId }) {
    commit(types.SET_BOOKMARKS_LOADING, { loading: true })
    if (cancel) {
      cancel()
    }
    const cancelToken = new CancelToken(c => {
      cancel = c
    })
    let url = ''
    if (params.cmd === 'loadAll') {
      url = `${webApiCohortDefinitionURL}?source=pa`
    } else {
      url = `${bookmarkURL}/${bookmarkId || ''}`
      params.paConfigId = rootGetters.getMriFrontendConfig.getPaConfigId()
      params.cdmConfigId = rootGetters.getMriFrontendConfig.getDatamodelConfigId()
      params.cdmConfigVersion = rootGetters.getMriFrontendConfig.getVersion()
      params.datasetId = rootGetters.getSelectedDataset.id
    }

    const dispatchOptions: {
      url: string
      method: string
      params: any
      cancelToken: typeof cancelToken
      datasetId?: string
    } = { url, method, params, cancelToken }
    if (params.cmd === 'loadAll') {
      dispatchOptions.datasetId = rootGetters.getSelectedDataset.id
    }
    return dispatch('ajaxAuth', dispatchOptions)
      .then(({ data }) => {
        let toastMessage = ''
        if (params.cmd === 'loadAll') {
          commit(types.RESET_ALL_BOOKMARKS)
          const { bookmarks, materializedCohorts, atlasCohortDefinitions } = processBookmarksData(
            data,
            rootGetters.getMriFrontendConfig.getPaConfigId()
          )
          const isAtlasEnabled = rootGetters.getMriFrontendConfig._internalConfig.panelOptions.atlasCohortDefinition
          commit(types.SET_BOOKMARKS, bookmarks)
          commit(types.SET_MATERIALIZED_COHORTS, materializedCohorts)
          if (isAtlasEnabled) {
            commit(types.SET_ATLAS_COHORT_DEFINITIONS, atlasCohortDefinitions)
          }
        }
        if (params.cmd === 'delete') {
          toastMessage = rootGetters.getText('MRI_PA_DELETE_BMK_SUCCESS')
        } else if (params.cmd === 'update') {
          toastMessage = rootGetters.getText('MRI_PA_UPDATE_BMK_SUCCESS')
        } else if (params.cmd === 'rename') {
          toastMessage = rootGetters.getText('MRI_PA_RENAME_BMK_SUCCESS')
        } else if (params.cmd === 'insert') {
          toastMessage = rootGetters.getText('MRI_PA_SAVE_BMK_SUCCESS')
        }
        if (toastMessage) {
          dispatch('setToastMessage', {
            text: toastMessage,
          })
          // Refresh bookmark list after any CRUD mutation
          dispatch('fireBookmarkQuery', { params: { cmd: 'loadAll' }, method: 'get' })
        }
        return data
      })
      .catch(error => {
        let errorMessage = ''
        if (params.cmd === 'delete') {
          errorMessage = rootGetters.getText('MRI_PA_DELETE_BMK_ERROR')
        } else if (params.cmd === 'update') {
          errorMessage = rootGetters.getText('MRI_PA_UPDATE_BMK_ERROR')
        } else if (params.cmd === 'rename') {
          errorMessage = rootGetters.getText('MRI_PA_RENAME_BMK_ERROR')
        } else if (params.cmd === 'insert') {
          errorMessage = rootGetters.getText('MRI_PA_SAVE_BMK_ERROR')
        }
        if (errorMessage) {
          dispatch('setAlertMessage', {
            message: errorMessage,
          })
        } else {
          throw error
        }
      })
      .finally(() => {
        commit(types.SET_BOOKMARKS_LOADING, { loading: false })
      })
  },
  setFilterSummaryVisibility({ commit }, { filterSummaryVisibility }) {
    commit(types.SET_FILTERSUMMARY, { filterSummaryVisibility })
  },
  /**
   * Load bookmark data directly to state (used by deep links)
   * Unlike loadbookmarkToState, this takes the parsed bookmark object directly
   */
  loadBookmarkDataToState({ commit, dispatch, getters, rootGetters }, { bookmark, chartType }) {
    // Set a virtual active bookmark so the UI shows the cohort tab
    commit(types.SET_ACTIVE_BOOKMARK, {
      bookmarkname: 'Linked Cohort',
      bmkId: 'deep-link',
      isNew: true,
    })

    // Check if the chart type is changing - if so, the new chart will call setFireRequest on mount
    const currentActiveChart = rootGetters.getActiveChart
    const chartIsChanging = chartType && chartType !== currentActiveChart
    console.debug(
      '[Bookmark] loadBookmarkDataToState - currentChart:',
      currentActiveChart,
      'newChart:',
      chartType,
      'changing:',
      chartIsChanging
    )
    return dispatch('_loadParsedBookmarkToState', {
      parsedBookmark: bookmark,
      chartType,
      skipFireRequest: chartIsChanging,
    })
  },
  loadbookmarkToState({ commit, dispatch, getters, rootGetters }, { bmkId, chartType }) {
    const parsedBookmark = getters.getBookmarkById(bmkId)
    const currentActiveChart = rootGetters.getActiveChart
    const chartIsChanging = chartType && chartType !== currentActiveChart
    const isRightPaneMounted = rootGetters.isRightPaneMounted
    console.debug(
      '[Bookmark] loadbookmarkToState - currentChart:',
      currentActiveChart,
      'newChart:',
      chartType,
      'changing:',
      chartIsChanging,
      'rightPaneMounted:',
      isRightPaneMounted
    )
    commit(types.SET_ACTIVE_BOOKMARK, getters.getBookmark(bmkId))
    return dispatch('_loadParsedBookmarkToState', {
      parsedBookmark,
      chartType,
      skipFireRequest: chartIsChanging || !isRightPaneMounted,
    })
  },
  /**
   * Internal action to load a parsed bookmark to state
   * @param skipFireRequest - if true, don't call setFireRequest (chart will do it on mount)
   */
  _loadParsedBookmarkToState(
    { commit, dispatch, getters, rootGetters },
    { parsedBookmark, chartType, skipFireRequest = false }
  ) {
    // TODO: send API request to check Filter is compatible
    // if error "Show toast Message"
    console.debug('[Bookmark] Loading parsed bookmark to state:', parsedBookmark)
    let ifr
    try {
      ifr = BMv2Parser.convertBM2IFR(parsedBookmark.filter)
      console.debug('[Bookmark] BMv2Parser.convertBM2IFR result:', ifr)
    } catch (error) {
      console.error('[Bookmark] BMv2Parser.convertBM2IFR failed:', error)
      return Promise.reject(error)
    }
    return new Promise((resolve, reject) => {
      // When the right pane is already mounted, hold fire requests during the load to
      // suppress the intermediate setFireRequest call from the getBookmarkFromIFR watcher
      // (which reacts to setIFRState). We release the hold and fire once explicitly.
      //
      // When the right pane is NOT yet mounted (skipFireRequest = true), we must NOT hold:
      // StackBarChart.created() will fire setFireRequest on mount, and holding would block it
      // since the DOM update queued by SET_ACTIVE_BOOKMARK runs before .then() resolves.
      if (!skipFireRequest) {
        dispatch('holdFireRequest')
      }
      dispatch('setIFRState', { ifr })
        .then(() => {
          if (parsedBookmark.axisSelection) {
            for (let i = 0; i < 5; i += 1) {
              if (parsedBookmark.axisSelection[i].attributeId !== 'n/a') {
                const path = parsedBookmark.axisSelection[i].attributeId.split('.')
                const key = path.pop()
                path.pop()
                const filterCardId = path.join('.')
                dispatch('setNewAxisValue', {
                  id: i,
                  props: {
                    ...parsedBookmark.axisSelection[i],
                    key,
                    filterCardId,
                  },
                })
              } else {
                dispatch('clearAxisValue', i)
              }
            }
            // Chart Properties
            if (parsedBookmark.filter.sort) {
              dispatch('setChartPropertyValue', {
                id: Constants.MRIChartProperties.Sort,
                props: { value: parsedBookmark.filter.sort },
              })
            }
            if (parsedBookmark.filter.selected_event || parsedBookmark.filter.selected_start_event_occ) {
              const value = {
                kmEventIdentifier: parsedBookmark.filter.selected_event.key,
                kmStartEventOccurence: parsedBookmark.filter.selected_start_event_occ.key,
              }
              dispatch('setChartPropertyValue', {
                id: Constants.MRIChartProperties.KMStartEvent,
                props: { value },
              })
            }
            if (parsedBookmark.filter.selected_end_event || parsedBookmark.filter.selected_end_event_occ) {
              const value = {
                kmEndEventIdentifier: parsedBookmark.filter.selected_end_event.key,
                kmEndEventOccurence: parsedBookmark.filter.selected_end_event_occ.key,
              }
              dispatch('setChartPropertyValue', {
                id: Constants.MRIChartProperties.KMEndEvent,
                props: { value },
              })
            }
            dispatch('setKMFirstLoad', {
              firstLoad: {
                errorlines: parsedBookmark.filter.errorlines === true,
                censoring: parsedBookmark.filter.censoring === true,
              },
            })
            dispatch('setKMDisplayInfo', {
              displayInfo: {
                errorlines: parsedBookmark.filter.errorlines === true,
                censoring: parsedBookmark.filter.censoring === true,
              },
            })
          }
          if (parsedBookmark.filter.selected_attributes) {
            dispatch('initPLModelBookmark', {
              selected_attributes: parsedBookmark.filter.selected_attributes,
              sorting_directions: parsedBookmark.filter.sorting_directions,
              sorted_attributes: parsedBookmark.filter.sorted_attributes,
            })
          }
          if (chartType) {
            console.debug('[Bookmark] Setting active chart:', chartType)
            dispatch('setActiveChart', chartType)
          }
          if (!skipFireRequest) {
            // Release hold and fire — intermediate calls from getBookmarkFromIFR watcher
            // were suppressed while held; this is the single explicit fire.
            console.debug('[Bookmark] Firing request (setFireRequest)')
            dispatch('releaseFireRequest')
            dispatch('setFireRequest')
          } else {
            // Right pane not yet mounted — StackBarChart.created() will fire setFireRequest
            // on mount. No hold was placed so it goes through unblocked.
            console.debug('[Bookmark] Skipping setFireRequest (chart will call it on mount)')
          }
          resolve(null)
        })
        .catch(e => {
          console.log(e)
          if (!skipFireRequest) {
            dispatch('releaseFireRequest')
          }
          reject()
        })
    })
  },
  fireCheckIfDatasetCanMaterializeCohorts({ state, commit, dispatch, rootGetters }) {
    const currentDatasetId = rootGetters.getSelectedDataset.id
    // Skip if already loaded for this dataset
    if (state.canMaterializeCohortDatasetId === currentDatasetId && currentDatasetId) {
      return Promise.resolve()
    }
    return dispatch('ajaxAuth', {
      url: `/analytics-svc/api/services/cohort/can-materialize-cohort?datasetId=${currentDatasetId}`,
      method: 'GET',
    })
      .then(response => {
        commit(types.SET_CAN_DATASET_MATERIALIZE_COHORTS, {
          canDatasetMaterializeCohorts: response.data,
          datasetId: currentDatasetId,
        })
      })
      .catch(error => {
        console.error(error)
        dispatch('setAlertMessage', {
          message: rootGetters.getText('MRI_PA_CHECK_MATERIALIZE_COHORT_ERROR'),
        })
        // Upon error on api request, disable materialize cohort for dataset
        commit(types.SET_CAN_DATASET_MATERIALIZE_COHORTS, {
          canDatasetMaterializeCohorts: false,
          datasetId: '',
        })
      })
  },
}

// mutations
const mutations = {
  [types.SET_BOOKMARKS](modulestate, bookmarks) {
    modulestate.bookmarks = bookmarks
  },
  [types.SET_BOOKMARKS_LOADING](modulestate, { loading }) {
    modulestate.loading = loading
  },
  [types.SET_CAN_DATASET_MATERIALIZE_COHORTS](modulestate, { canDatasetMaterializeCohorts, datasetId }) {
    modulestate.canDatasetMaterializeCohorts = canDatasetMaterializeCohorts
    modulestate.canMaterializeCohortDatasetId = datasetId ?? ''
  },
  [types.SET_MATERIALIZED_COHORTS](modulestate, materializedCohorts) {
    modulestate.materializedCohorts = materializedCohorts ?? []
  },
  [types.SET_ATLAS_COHORT_DEFINITIONS](modulestate, atlasCohortDefinitions) {
    modulestate.atlasCohortDefinitions = atlasCohortDefinitions ?? []
  },
  [types.SET_FILTERSUMMARY](modulestate, { filterSummaryVisibility }) {
    modulestate.filterSummaryVisible = filterSummaryVisibility
  },
  [types.SET_SCHEMANAME](modulestate, { schemaName }) {
    modulestate.schemaName = schemaName
  },
  [types.SET_ACTIVE_BOOKMARK](modulestate, bookmark) {
    modulestate.activeBookmark = bookmark
  },
  [types.SET_ADD_NEW_COHORT](modulestate, { addNewCohort }) {
    modulestate.addNewCohort = addNewCohort
  },
  [types.RESET_ALL_BOOKMARKS](modulestate) {
    modulestate.bookmarks = []
    modulestate.materializedCohorts = []
    modulestate.atlasCohortDefinitions = []
  },
  [types.RESET_DATASET_CACHE](modulestate) {
    modulestate.canDatasetMaterializeCohorts = false
    modulestate.canMaterializeCohortDatasetId = ''
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
