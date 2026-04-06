import { createPinia, setActivePinia } from 'pinia'
import { createStore } from 'vuex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as types from '../../mutation-types'
import notificationsForwarding from '../notificationsForwarding'
import { useNotificationStore } from '../../../stores/notifications'

vi.mock('@/store', () => ({
  default: {
    getters: {
      getText: (key: string) => key,
    },
  },
}))

describe('store/modules/notificationsForwarding', () => {
  function createNotificationsVuexStore() {
    return createStore({
      modules: {
        notifications: notificationsForwarding,
      },
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('dispatch setToastMessage updates Pinia toast', async () => {
    const notificationStore = useNotificationStore()
    const vuexStore = createNotificationsVuexStore()

    await vuexStore.dispatch('setToastMessage', { text: 'toast text' })

    expect(notificationStore.toast.message).toBe('toast text')
  })

  it('dispatch setAlertMessage updates Pinia alert', async () => {
    const notificationStore = useNotificationStore()
    const vuexStore = createNotificationsVuexStore()

    await vuexStore.dispatch('setAlertMessage', {
      message: 'alert text',
      messageType: 'warning',
      title: 'Alert Title',
    })

    expect(notificationStore.alert.show).toBe(true)
    expect(notificationStore.alert.message).toBe('alert text')
    expect(notificationStore.alert.messageType).toBe('warning')
    expect(notificationStore.alert.title).toBe('Alert Title')
  })

  it('Vuex getters return Pinia notification objects', () => {
    const notificationStore = useNotificationStore()
    notificationStore.setToastMessage({ text: 'toast getter' })
    notificationStore.setFatalMessage({ message: 'fatal getter' })
    notificationStore.setAlertMessage({ message: 'alert getter' })

    const vuexStore = createNotificationsVuexStore()

    expect(vuexStore.getters.getToastNotification).toBe(notificationStore.toast)
    expect(vuexStore.getters.getFatalNotification).toBe(notificationStore.fatal)
    expect(vuexStore.getters.getAlertNotification).toBe(notificationStore.alert)
  })

  it('dispatch clearNotifications clears fatal and alert and preserves toast', async () => {
    const notificationStore = useNotificationStore()
    notificationStore.toast.message = 'keep me'
    notificationStore.fatal.show = true
    notificationStore.fatal.message = 'fatal'
    notificationStore.alert.show = true
    notificationStore.alert.message = 'alert'
    notificationStore.alert.messageType = 'warning'
    notificationStore.alert.title = 'title'

    const vuexStore = createNotificationsVuexStore()

    await vuexStore.dispatch('clearNotifications')

    expect(notificationStore.fatal).toEqual({
      show: false,
      message: '',
    })
    expect(notificationStore.alert).toEqual({
      show: false,
      message: '',
      messageType: 'error',
      title: '',
    })
    expect(notificationStore.toast.message).toBe('keep me')
  })

  it('commit MESSAGE_ALERT_SHOW_TOGGLE closes alert notification', () => {
    const notificationStore = useNotificationStore()
    notificationStore.setAlertMessage({ message: 'alert text' })
    expect(notificationStore.alert.show).toBe(true)

    const vuexStore = createNotificationsVuexStore()
    vuexStore.commit(types.MESSAGE_ALERT_SHOW_TOGGLE)

    expect(notificationStore.alert.show).toBe(false)
  })

  it('commit MESSAGE_FATAL_SHOW_TOGGLE closes fatal notification', () => {
    const notificationStore = useNotificationStore()
    notificationStore.setFatalMessage({ message: 'fatal text' })
    expect(notificationStore.fatal.show).toBe(true)

    const vuexStore = createNotificationsVuexStore()
    vuexStore.commit(types.MESSAGE_FATAL_SHOW_TOGGLE)

    expect(notificationStore.fatal.show).toBe(false)
  })
})
