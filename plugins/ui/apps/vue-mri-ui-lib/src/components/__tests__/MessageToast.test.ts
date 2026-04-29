import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import MessageToast from '../MessageToast.vue'
import { useNotificationStore } from '../../stores/notifications'

describe('MessageToast.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('auto-dismisses toast 2 seconds after message update', async () => {
    const wrapper = mount(MessageToast as any)
    const notificationStore = useNotificationStore()

    notificationStore.setToastMessage({ text: 'hello' })
    await wrapper.vm.$nextTick()

    vi.advanceTimersByTime(1999)
    expect(notificationStore.toast.message).toBe('hello')

    vi.advanceTimersByTime(1)
    expect(notificationStore.toast.message).toBe('')
  })

  it('restarts timer when toast message changes', async () => {
    const wrapper = mount(MessageToast as any)
    const notificationStore = useNotificationStore()

    notificationStore.setToastMessage({ text: 'first' })
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(1000)

    notificationStore.setToastMessage({ text: 'second' })
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(1500)
    expect(notificationStore.toast.message).toBe('second')

    vi.advanceTimersByTime(500)
    expect(notificationStore.toast.message).toBe('')
  })

  it('clears active timer on unmount', async () => {
    const wrapper = mount(MessageToast as any)
    const notificationStore = useNotificationStore()

    notificationStore.setToastMessage({ text: 'persist-after-unmount' })
    await wrapper.vm.$nextTick()
    wrapper.unmount()

    vi.advanceTimersByTime(2000)
    expect(notificationStore.toast.message).toBe('persist-after-unmount')
  })
})
