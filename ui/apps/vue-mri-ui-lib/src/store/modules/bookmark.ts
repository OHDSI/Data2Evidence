// tslint:disable:no-shadowed-variable
import axios from 'axios'
import BMv2Parser from '../../lib/bookmarks/BMv2Parser'
import Constants from '../../utils/Constants'
import * as types from '../mutation-types'
import isEqual from 'lodash/isEqual'
import { getPortalAPI } from '@/utils/PortalUtils'
import { formatBookmark, formatCohortDefinition } from '@/utils/BookmarkUtils'

const CancelToken = axios.CancelToken
let cancel
// initial state
const state = {
  bookmarks: [],
  cohortDefinitions: [],
  filterSummaryVisible: false,
  schemaName: '',
  activeBookmark: null,
  addNewCohort: false,
}

const bookmarkURL = '/analytics-svc/api/services/bookmark'

// getters
const getters = {
  getBookmarks: modulestate => modulestate.bookmarks,
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
            ? rootGetters.getMriFrontendConfig.getAttributeByPath(axisInfo.attributeId).getDefaultBinSize() ?? 'n/a'
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
  getBookmark: modulestate => bmkId => modulestate.bookmarks.find(b => b.bmkId === bmkId),
  getBookmarkByNameAndUsername: modulestate => (name, username) => {
    return modulestate.bookmarks.find(b => b.bookmarkname === name && b.user_id === username)
  },
  getCurrentBookmarkHasChanges: (modulestate, moduleGetters) => {
    if (modulestate.activeBookmark == null) {
      return false
    }
    const bookmark = JSON.parse(modulestate.activeBookmark?.bookmark)
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
    const bookmarks: FormattedBookmark[] = modulestate.bookmarks
    const cohortDefinitions: FormattedcohortDefinition[] = modulestate.cohortDefinitions

    let displayBookmarks = []

    // cohort definitions without bookmark
    // cohort definitions with bookmark
    cohortDefinitions.forEach(cohortDefinition => {
      // check bookmark exists, if yes, should use the bookmark name
      const bookmark = bookmarks.find(bookmark => bookmark?.cohortDefinitionId === cohortDefinition.id)
      if (!bookmark) {
        return displayBookmarks.push({
          displayName: cohortDefinition.cohortDefinitionName,
          bookmark: null,
          cohortDefinition: formatCohortDefinition(cohortDefinition),
        })
      }

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
    })

    // bookmarks without a cohort definition
    bookmarks.forEach(bookmark => {
      const cohortDefinition = cohortDefinitions.find(
        cohortDefinition => (cohortDefinition.id = bookmark?.cohortDefinitionId)
      )

      if (cohortDefinition) {
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
  },
}

const actions = {
  setAddNewCohort({ commit }, { addNewCohort }) {
    commit(types.SET_ADD_NEW_COHORT, { addNewCohort })
  },
  fireBookmarkQuery({ commit, dispatch, rootGetters }, { method = 'post', params, bookmarkId }) {
    if (cancel) {
      cancel()
    }
    const cancelToken = new CancelToken(c => {
      cancel = c
    })

    let url = ''
    if (params.cmd === 'loadAll') {
      url = `${bookmarkURL}?paConfigId=${rootGetters.getMriFrontendConfig.getPaConfigId()}&r=${Math.random()}&datasetId=${
        rootGetters.getSelectedDataset.id
      }`
    } else {
      url = `${bookmarkURL}/${bookmarkId || ''}`
      params.paConfigId = rootGetters.getMriFrontendConfig.getPaConfigId()
      params.cdmConfigId = rootGetters.getMriFrontendConfig.getDatamodelConfigId()
      params.cdmConfigVersion = rootGetters.getMriFrontendConfig.getVersion()
      params.datasetId = rootGetters.getSelectedDataset.id
    }

    return dispatch('ajaxAuth', { url, method, params, cancelToken })
      .then(({ data }) => {
        let toastMessage = ''
        if (params.cmd === 'loadAll') {
          commit(types.SET_BOOKMARKS, data)
          commit(types.SET_COHORT_DEFINITIONS, data)
          commit(types.SET_SCHEMANAME, {
            schemaName: data.schemaName,
          })
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
  },
  setFilterSummaryVisibility({ commit }, { filterSummaryVisibility }) {
    commit(types.SET_FILTERSUMMARY, { filterSummaryVisibility })
  },
  loadbookmarkToState({ commit, dispatch, getters, rootGetters }, { bmkId, chartType }) {
    const parsedBookmark = getters.getBookmarkById(bmkId)

    commit(types.SET_ACTIVE_BOOKMARK, getters.getBookmark(bmkId))
    // TODO: send API request to check Filter is compatible
    // if error "Show toast Message"
    const ifr = BMv2Parser.convertBM2IFR(parsedBookmark.filter)
    return new Promise((resolve, reject) => {
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
            dispatch('setActiveChart', chartType)
          }
          dispatch('setFireRequest')
          resolve(null)
        })
        .catch(e => {
          console.log(e)
          reject()
        })
    })
  },
}

// mutations
const mutations = {
  [types.SET_BOOKMARKS](modulestate, { bookmarks }) {
    modulestate.bookmarks = bookmarks
  },
  [types.SET_COHORT_DEFINITIONS](modulestate, { cohortDefinitions }) {
    modulestate.cohortDefinitions = cohortDefinitions
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
}

export default {
  state,
  getters,
  actions,
  mutations,
}
