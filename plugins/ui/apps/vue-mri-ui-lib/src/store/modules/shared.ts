// tslint:disable:ordered-imports
// tslint:disable:no-shadowed-variable
// tslint:disable:function-name
import axios from 'axios'
import * as types from '../mutation-types'
import BMv2Parser from '../../lib/bookmarks/BMv2Parser'
const CancelToken = axios.CancelToken
function backendFormatter(obj) {
  if (obj instanceof Object) {
    const newObj = {
      content: null,
    }
    if (obj.content) {
      newObj.content = obj.content.map(child => backendFormatter(child))
    }
    Object.keys(obj).forEach(key => {
      if (key !== 'content') {
        const newKey = `_${key}`
        newObj[newKey] = key === 'advanceTimeFilter' ? obj[key] : backendFormatter(obj[key])
      }
    })
    return newObj
  }
  return obj
}

let cancel
// initial state
const state = {
  sharedData: {},
  sharedBookmark: [],
  displaySharedChart: false,
  sharedBookmarkRequest: {},
  bookmarkIdRequest: '',
}

const getters = {
  getSharedData: modulestate => modulestate.sharedData,
  getSharedBookmark: modulestate => modulestate.sharedBookmark,
  getDisplaySharedChart: modulestate => modulestate.displaySharedChart,
  getSharedBookmarkRequest: modulestate => modulestate.sharedBookmarkRequest,
  getBookmarkIdRequest: modulestate => modulestate.bookmarkIdRequest,
}

const actions = {
  setSharedData({ commit }, { sharedData }) {
    commit(types.SET_SHARED_DATA, { sharedData })
  },
  setSharedBookmark({ commit }, { sharedBookmark }) {
    commit(types.SET_SHARED_BOOKMARK, { sharedBookmark })
  },
  setDisplaySharedChart({ commit }, { displaySharedChart }) {
    commit(types.SET_SHARED_CHARTDISPLAY, { displaySharedChart })
  },
  setBookmarkIdRequest({ commit }, { bookmarkIdRequest }) {
    commit(types.SET_SHARED_BOOKMARKIDREQUEST, { bookmarkIdRequest })
  },
  setSharedBookmarkRequest({ commit, dispatch }, { sharedBookmarkObject }) {
    const ifrComponent = BMv2Parser.convertBM2IFR(sharedBookmarkObject.filter)
    const cards = backendFormatter(ifrComponent.cards)
    const configData = {
      configId: '',
      configVersion: '',
    }
    const axes = []
    if (ifrComponent.configMetadata) {
      configData.configId = ifrComponent.configMetadata.id
      configData.configVersion = ifrComponent.configMetadata.version
    }
    for (let i = 0; i < sharedBookmarkObject.axisSelection.length; i += 1) {
      if (sharedBookmarkObject.axisSelection[i] && sharedBookmarkObject.axisSelection[i].attributeId !== 'n/a') {
        const attributeId = sharedBookmarkObject.axisSelection[i].attributeId
        const categoryId = sharedBookmarkObject.axisSelection[i].categoryId
        const attributeIdArray = attributeId.split('.')
        attributeIdArray.pop()
        attributeIdArray.pop()
        const instanceID = attributeIdArray.join('.')
        if (attributeIdArray.length > 1) {
          attributeIdArray.pop()
        }
        const configPath = attributeIdArray.join('.')

        const axisInfo = {
          configPath,
          instanceID,
          axis: categoryId[0],
          seq: parseInt(categoryId[1], 10),
          id: attributeId,
          binsize: 0,
        }
        if (sharedBookmarkObject.axisSelection[i].binsize && sharedBookmarkObject.axisSelection[i].binsize !== 'n/a') {
          axisInfo.binsize = sharedBookmarkObject.axisSelection[i].binsize
        }
        axes.push(axisInfo)
      }
    }
    const sharedBookmarkRequest = {
      cards,
      configData,
      axes,
    }
    commit(types.SET_SHARED_BOOKMARKREQUEST, { sharedBookmarkRequest })
    dispatch('setDisplaySharedChart', { displaySharedChart: true })
  },
  saveSharedBookmark({ dispatch }, { params }) {
    const url = '/analytics-svc/api/services/federatedQuery/bookmark'
    const method = 'post'
    if (cancel) {
      cancel()
    }
    const cancelToken = new CancelToken(c => {
      cancel = c
    })
    return dispatch('ajaxAuth', { method, params, url, cancelToken })
  },
  saveSharedBookmarkEntry({ dispatch }, { params }) {
    const url = '/analytics-svc/api/services/federatedQuery/bookmarkEntry'
    const method = 'post'
    if (cancel) {
      cancel()
    }
    const cancelToken = new CancelToken(c => {
      cancel = c
    })
    return dispatch('ajaxAuth', { method, params, url, cancelToken }).then(response => {
      const toastMessage = 'Shared bookmark entry saved successfuly'
      dispatch('setToastMessage', {
        text: toastMessage,
      })
      dispatch('loadSharedBookmarkList')
      return response
    })
  },
  loadSharedBookmarkList({ dispatch }) {
    const url = '/analytics-svc/api/services/federatedQuery/bookmark'
    const method = 'get'

    return dispatch('ajaxAuth', { method, url }).then(response => {
      if (response.data) {
        dispatch('setSharedBookmark', {
          sharedBookmark: JSON.parse(response.data),
        })
      }
      return response
    })
  },
  loadSharedBookmarkEntryByBookmarkId({ dispatch }, { bookmarkId }) {
    const url = `/analytics-svc/api/services/federatedQuery/bookmark/${bookmarkId}/bookmarkEntry`
    const method = 'get'
    if (cancel) {
      cancel()
    }
    const cancelToken = new CancelToken(c => {
      cancel = c
    })
    return dispatch('ajaxAuth', { method, url, cancelToken }).then(response => {
      if (response.data) {
        const responseDataResult = JSON.parse(response.data)
        if (responseDataResult && responseDataResult.length > 0) {
          // const sharedData = JSON.parse(responseDataResult[0].data);
          const sharedData = responseDataResult.map(data => ({
            userName: data.userName,
            data: JSON.parse(data.data),
          }))
          dispatch('setSharedData', {
            sharedData,
          })
        }
      }
      return response
    })
  },
  deleteSharedBookmark({ dispatch }, { bookmarkId }) {
    const url = `/analytics-svc/api/services/federatedQuery/bookmark/${bookmarkId}`
    const method = 'delete'
    return dispatch('ajaxAuth', { method, url }).then(response => {
      const toastMessage = 'Bookmark deleted successfuly'
      dispatch('setToastMessage', {
        text: toastMessage,
      })
      dispatch('loadSharedBookmarkList')
      return response
    })
  },
}

const mutations = {
  [types.SET_SHARED_DATA](modulestate, { sharedData }) {
    modulestate.sharedData = sharedData
  },
  [types.SET_SHARED_BOOKMARK](modulestate, { sharedBookmark }) {
    modulestate.sharedBookmark = sharedBookmark
  },
  [types.SET_SHARED_CHARTDISPLAY](modulestate, { displaySharedChart }) {
    modulestate.displaySharedChart = displaySharedChart
  },
  [types.SET_SHARED_BOOKMARKIDREQUEST](modulestate, { bookmarkIdRequest }) {
    modulestate.bookmarkIdRequest = bookmarkIdRequest
  },
  [types.SET_SHARED_BOOKMARKREQUEST](modulestate, { sharedBookmarkRequest }) {
    modulestate.sharedBookmarkRequest = sharedBookmarkRequest
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
