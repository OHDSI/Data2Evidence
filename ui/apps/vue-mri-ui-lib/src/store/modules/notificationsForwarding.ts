import { useNotificationStore } from '../../stores/notifications'
import * as types from '../mutation-types'

// BRIDGE(auth): keep Vuex dispatch('clearNotifications') working until auth.ts migrates to Pinia
export default {
  getters: {
    getToastNotification() {
      return useNotificationStore().getToastNotification
    },
    getFatalNotification() {
      return useNotificationStore().getFatalNotification
    },
    getAlertNotification() {
      return useNotificationStore().getAlertNotification
    },
  },
  actions: {
    setToastMessage(_context, payload: { text: string }) {
      useNotificationStore().setToastMessage(payload)
    },
    setFatalMessage(_context, payload: { message: string }) {
      useNotificationStore().setFatalMessage(payload)
    },
    setAlertMessage(
      _context,
      payload: { message: string; messageType?: string; title?: string }
    ) {
      useNotificationStore().setAlertMessage(payload)
    },
    clearNotifications() {
      useNotificationStore().clearNotifications()
    },
  },
  mutations: {
    [types.MESSAGE_FATAL_SHOW_TOGGLE]() {
      const notificationStore = useNotificationStore()
      notificationStore.fatal.show = !notificationStore.fatal.show
    },
    [types.MESSAGE_ALERT_SHOW_TOGGLE]() {
      const notificationStore = useNotificationStore()
      notificationStore.alert.show = !notificationStore.alert.show
    },
  },
}
