import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationStore } from '../notifications'

const { getTextMock } = vi.hoisted(() => ({
  getTextMock: vi.fn((key: string) => key),
}))

vi.mock('vuex', () => ({
  createStore: vi.fn(),
}))

vi.mock('@/store', () => ({
  default: {
    getters: {
      getText: getTextMock,
    },
  },
}))

describe('stores/notifications', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getTextMock.mockClear()
  })

  it('setToastMessage sets toast.message', () => {
    const store = useNotificationStore()

    store.setToastMessage({ text: 'hello' })

    expect(store.toast.message).toBe('hello')
  })

  it('setFatalMessage sets fatal.message and toggles fatal.show on first call', () => {
    const store = useNotificationStore()

    store.setFatalMessage({ message: 'oops' })

    expect(store.fatal.message).toBe('oops')
    expect(store.fatal.show).toBe(true)
  })

  it('setFatalMessage toggles fatal.show back to false on second call', () => {
    const store = useNotificationStore()

    store.setFatalMessage({ message: 'first' })
    store.setFatalMessage({ message: 'second' })

    expect(store.fatal.message).toBe('second')
    expect(store.fatal.show).toBe(false)
  })

  it('setAlertMessage defaults title from Vuex bridge when title is omitted', () => {
    const store = useNotificationStore()

    store.setAlertMessage({ message: 'err' })

    expect(getTextMock).toHaveBeenCalledWith('MRI_PA_NOTIFICATION_ERROR')
    expect(store.alert.show).toBe(true)
    expect(store.alert.message).toBe('err')
    expect(store.alert.messageType).toBe('error')
    expect(store.alert.title).toBe('MRI_PA_NOTIFICATION_ERROR')
  })

  it('setAlertMessage sets provided fields and skips Vuex bridge when title is provided', () => {
    const store = useNotificationStore()

    store.setAlertMessage({
      message: 'err',
      messageType: 'warning',
      title: 'Custom',
    })

    expect(getTextMock).not.toHaveBeenCalled()
    expect(store.alert.message).toBe('err')
    expect(store.alert.messageType).toBe('warning')
    expect(store.alert.title).toBe('Custom')
    expect(store.alert.show).toBe(true)
  })

  it('setAlertMessage toggles alert.show back to false on second call', () => {
    const store = useNotificationStore()

    store.setAlertMessage({ message: 'first' })
    store.setAlertMessage({ message: 'second' })

    expect(store.alert.message).toBe('second')
    expect(store.alert.show).toBe(false)
  })

  it('setAlertMessage falls back when title and messageType are empty strings', () => {
    const store = useNotificationStore()

    store.setAlertMessage({
      message: 'err',
      title: '',
      messageType: '',
    })

    expect(getTextMock).toHaveBeenCalledWith('MRI_PA_NOTIFICATION_ERROR')
    expect(store.alert.message).toBe('err')
    expect(store.alert.messageType).toBe('error')
    expect(store.alert.title).toBe('MRI_PA_NOTIFICATION_ERROR')
  })

  it('clearNotifications resets fatal and alert to initial values', () => {
    const store = useNotificationStore()

    store.setFatalMessage({ message: 'fatal message' })
    store.setAlertMessage({ message: 'alert message', messageType: 'success', title: 'Done' })

    store.clearNotifications()

    expect(store.fatal).toEqual({
      show: false,
      message: '',
    })
    expect(store.alert).toEqual({
      show: false,
      message: '',
      messageType: 'error',
      title: '',
    })
  })

  it('clearNotifications does not modify toast.message', () => {
    const store = useNotificationStore()

    store.setToastMessage({ text: 'test' })
    store.setFatalMessage({ message: 'fatal message' })
    store.setAlertMessage({ message: 'alert message' })

    store.clearNotifications()

    expect(store.toast.message).toBe('test')
  })

  it('closeFatalNotification sets fatal.show to false regardless of prior state', () => {
    const store = useNotificationStore()

    store.setFatalMessage({ message: 'fatal message' })
    expect(store.fatal.show).toBe(true)

    store.closeFatalNotification()
    expect(store.fatal.show).toBe(false)

    store.closeFatalNotification()
    expect(store.fatal.show).toBe(false)
  })

  it('closeAlertNotification sets alert.show to false regardless of prior state', () => {
    const store = useNotificationStore()

    store.setAlertMessage({ message: 'alert message' })
    expect(store.alert.show).toBe(true)

    store.closeAlertNotification()
    expect(store.alert.show).toBe(false)

    store.closeAlertNotification()
    expect(store.alert.show).toBe(false)
  })
})
