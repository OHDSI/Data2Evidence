import { createPinia, setActivePinia } from 'pinia'
import { createStore } from 'vuex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
})
