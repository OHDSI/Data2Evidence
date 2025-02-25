import * as types from '../mutation-types'

// initial state
const state = {
  toast: {
    message: '',
  },
  fatal: {
    show: false,
    message: '',
  },
  alert: {
    show: false,
    message: '',
    messageType: 'error',
    title: '',
  },
}

// getters
const getters = {
  getToastNotification: modulestate => modulestate.toast,
  getFatalNotification: modulestate => modulestate.fatal,
  getAlertNotification: modulestate => modulestate.alert,
}

// actions
const actions = {
  setToastMessage({ commit }, { text }) {
    commit(types.MESSAGE_SET, text)
  },
  setFatalMessage({ commit, dispatch }, { message }) {
    commit(types.MESSAGE_FATAL_SET, message)
    commit(types.MESSAGE_FATAL_SHOW_TOGGLE)
  },
  setAlertMessage({ commit, dispatch, rootGetters }, { message, messageType, title }) {
    if (messageType) {
      commit(types.MESSAGE_ALERT_TYPE_SET, messageType)
    } else {
      commit(types.MESSAGE_ALERT_TYPE_SET, 'error')
    }
    if (title) {
      commit(types.MESSAGE_ALERT_TITLE_SET, title)
    } else {
      commit(types.MESSAGE_ALERT_TITLE_SET, rootGetters.getText('MRI_PA_NOTIFICATION_ERROR'))
    }
    commit(types.MESSAGE_ALERT_SET, message)
    commit(types.MESSAGE_ALERT_SHOW_TOGGLE)
  },
}

// mutations
const mutations = {
  [types.MESSAGE_SET](modulestate, message) {
    modulestate.toast.message = message
  },
  [types.MESSAGE_DELETE](modulestate) {
    modulestate.toast.message = ''
  },
  [types.MESSAGE_FATAL_SET](modulestate, message) {
    modulestate.fatal.message = message
  },
  [types.MESSAGE_FATAL_SHOW_TOGGLE](modulestate) {
    modulestate.fatal.show = !modulestate.fatal.show
  },
  [types.MESSAGE_ALERT_SET](modulestate, message) {
    modulestate.alert.message = message
  },
  [types.MESSAGE_ALERT_SHOW_TOGGLE](modulestate) {
    modulestate.alert.show = !modulestate.alert.show
  },
  [types.MESSAGE_ALERT_TYPE_SET](modulestate, messageType) {
    modulestate.alert.messageType = messageType
  },
  [types.MESSAGE_ALERT_TITLE_SET](modulestate, title) {
    modulestate.alert.title = title
  },
}

export default {
  state,
  getters,
  actions,
  mutations,
}
