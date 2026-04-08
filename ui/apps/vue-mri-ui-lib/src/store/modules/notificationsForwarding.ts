import { useNotificationStore } from '../../stores/notifications'

// BRIDGE(auth): remove this module when auth.ts migrates to Pinia
// auth uses dispatch('clearNotifications')
export default {
  actions: {
    clearNotifications() {
      useNotificationStore().clearNotifications()
    },
  },
}
