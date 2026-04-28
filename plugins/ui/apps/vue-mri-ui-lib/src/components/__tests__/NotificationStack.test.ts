import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createStore } from 'vuex'
import NotificationStack from '../NotificationStack.vue'
import { useNotificationStore } from '../../stores/notifications'

describe('NotificationStack.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createVuexStore = () =>
    createStore({
      getters: {
        getText: () => (key: string) => key,
      },
    })

  it('closes fatal notification via close action', async () => {
    const notificationStore = useNotificationStore()
    notificationStore.fatal.show = true
    notificationStore.fatal.message = 'fatal message'

    const wrapper = mount(NotificationStack as any, {
      global: {
        plugins: [createVuexStore()],
      },
    })

    wrapper.vm.okFatal()
    await wrapper.vm.$nextTick()
    expect(notificationStore.fatal.show).toBe(false)
  })

  it('closes alert notification via close action', async () => {
    const notificationStore = useNotificationStore()
    notificationStore.alert.show = true
    notificationStore.alert.message = 'alert message'
    notificationStore.alert.title = 'title'

    const wrapper = mount(NotificationStack as any, {
      global: {
        plugins: [createVuexStore()],
      },
    })

    wrapper.vm.okAlert()
    await wrapper.vm.$nextTick()
    expect(notificationStore.alert.show).toBe(false)
  })
})
