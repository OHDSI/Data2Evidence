import { defineStore } from 'pinia'
import store from '@/store'

interface ToastNotification {
  message: string
}

interface FatalNotification {
  show: boolean
  message: string
}

interface AlertNotification {
  show: boolean
  message: string
  messageType: string
  title: string
}

interface NotificationState {
  toast: ToastNotification
  fatal: FatalNotification
  alert: AlertNotification
}

interface SetToastMessagePayload {
  text: string
}

interface SetFatalMessagePayload {
  message: string
}

interface SetAlertMessagePayload {
  message: string
  messageType?: string
  title?: string
}

const createInitialFatalState = (): FatalNotification => ({
  show: false,
  message: '',
})

const createInitialAlertState = (): AlertNotification => ({
  show: false,
  message: '',
  messageType: 'error',
  title: '',
})

const getDefaultAlertTitle = (): string => {
  // BRIDGE(i18n): replace useStore().getters.getText with useI18nStore() when i18n migrates to Pinia
  return store.getters.getText('MRI_PA_NOTIFICATION_ERROR')
}

export const useNotificationStore = defineStore('notifications', {
  state: (): NotificationState => ({
    toast: {
      message: '',
    },
    fatal: createInitialFatalState(),
    alert: createInitialAlertState(),
  }),
  getters: {
    getToastNotification: state => state.toast,
    getFatalNotification: state => state.fatal,
    getAlertNotification: state => state.alert,
  },
  actions: {
    setToastMessage({ text }: SetToastMessagePayload) {
      this.toast.message = text
    },
    setFatalMessage({ message }: SetFatalMessagePayload) {
      this.fatal.message = message
      this.fatal.show = !this.fatal.show
    },
    setAlertMessage({ message, messageType, title }: SetAlertMessagePayload) {
      this.alert.messageType = messageType ? messageType : 'error'
      this.alert.title = title ? title : getDefaultAlertTitle()
      this.alert.message = message
      this.alert.show = !this.alert.show
    },
    clearNotifications() {
      this.fatal = createInitialFatalState()
      this.alert = createInitialAlertState()
    },
    closeFatalNotification() {
      this.fatal.show = false
    },
    closeAlertNotification() {
      this.alert.show = false
    },
  },
})
