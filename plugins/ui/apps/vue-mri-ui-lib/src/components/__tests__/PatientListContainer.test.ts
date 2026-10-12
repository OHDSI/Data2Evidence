import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createStore } from 'vuex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PatientListContainer from '../PatientListContainer.vue'

const createDeferred = () => {
  let resolve: (value: any) => void = () => {}
  let reject: (error: any) => void = () => {}
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const actions = {
  fireQuery: vi.fn(),
  setCurrentPatientCount: vi.fn(),
  setFireRequest: vi.fn(),
  completeDownloadCSV: vi.fn(),
  completeDownloadZIP: vi.fn(),
  setZIPDownloadError: vi.fn(),
  initPLModel: vi.fn(),
  setPLRequest: vi.fn(),
  changePage: vi.fn(),
  populateColumnMenu: vi.fn(),
  addSelectedAttribute: vi.fn(),
  setInteractionSelected: vi.fn(),
  removeSelectedAttribute: vi.fn(),
  sortAttribute: vi.fn(),
  downloadCSV: vi.fn(),
  downloadZIP: vi.fn(),
}

const getters = {
  getText: () => (key: string) => key,
  getFireRequest: () => false,
  isFireRequestHeld: () => false,
  getPLRequest: () => () => ({}),
  getPLRequestZIP: () => ({}),
  getPLModel: () => ({ currentPage: 1, pageSize: 20 }),
  getColumnSelectionMenu: () => [],
  getSelectedAttributes: () => ({ col1: {} }),
  getSelectedDataset: () => ({ id: '1' }),
  translate: () => data => data,
  getActiveBookmark: () => null,
  getZipFireDownload: () => false,
}

describe('PatientListContainer busy-state lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits busy true then false on successful request', async () => {
    const { promise, resolve } = createDeferred()
    const fireQuery = vi.fn().mockReturnValue(promise)
    const store = createStore({
      state: { fireRequest: false },
      actions: { ...actions, fireQuery },
      getters: { ...getters, getFireRequest: (state: any) => state.fireRequest },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('busyEv')).toEqual([[true]])
    expect((wrapper.vm as any).isLoading).toBe(true)

    resolve({ data: [], totalPatientCount: 0 })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.emitted('busyEv')).toEqual([[true], [false]])
    expect(wrapper.emitted('requestError')).toContainEqual([false])
    expect((wrapper.vm as any).isLoading).toBe(false)
  })

  it('settles loading and exposes a request error after failure', async () => {
    const { promise, reject } = createDeferred()
    const fireQuery = vi.fn().mockReturnValue(promise)
    const store = createStore({
      state: { fireRequest: false },
      actions: { ...actions, fireQuery },
      getters: { ...getters, getFireRequest: (state: any) => state.fireRequest },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as any).isLoading).toBe(true)

    reject({ response: { status: 500, data: { errorMessage: 'failed' } } })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.emitted('requestError')).toContainEqual([true])
    expect((wrapper.vm as any).isLoading).toBe(false)
  })

  it('sets a load error, not an error message, when the request fails', async () => {
    const { promise, reject } = createDeferred()
    const fireQuery = vi.fn().mockReturnValue(promise)
    const store = createStore({
      state: { fireRequest: false },
      actions: { ...actions, fireQuery },
      getters: { ...getters, getFireRequest: (state: any) => state.fireRequest },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()
    reject({ response: { status: 500, data: { errorType: 'MRILoggedError', logId: 'log-1' } } })
    await new Promise(r => setTimeout(r, 0))

    expect((wrapper.vm as any).loadError).toEqual({ logId: 'log-1' })
    expect((wrapper.vm as any).errorMessage).toBe('')
  })

  it('clears the load error when the next request starts', async () => {
    const first = createDeferred()
    const second = createDeferred()
    const fireQuery = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const store = createStore({
      state: { fireRequest: false },
      actions: { ...actions, fireQuery },
      getters: { ...getters, getFireRequest: (state: any) => state.fireRequest },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()
    first.reject(new Error('Network Error'))
    await new Promise(r => setTimeout(r, 0))
    expect((wrapper.vm as any).loadError).toEqual({ logId: null })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as any).loadError).toBeNull()
  })

  it('clears the load error and shows the no-columns message when every column is deselected', async () => {
    const { promise, reject } = createDeferred()
    const fireQuery = vi.fn().mockReturnValue(promise)
    const store = createStore({
      state: { fireRequest: false, selectedAttributes: { col1: {} } },
      actions: { ...actions, fireQuery },
      getters: {
        ...getters,
        getFireRequest: (state: any) => state.fireRequest,
        getSelectedAttributes: (state: any) => state.selectedAttributes,
      },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()
    reject({ response: { status: 500, data: { errorType: 'MRILoggedError', logId: 'log-1' } } })
    await new Promise(r => setTimeout(r, 0))
    expect((wrapper.vm as any).loadError).toEqual({ logId: 'log-1' })

    store.state.selectedAttributes = {}
    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as any).loadError).toBeNull()
    expect((wrapper.vm as any).errorMessage).toBe('MRI_PA_PATIENT_LIT_NO_COLUMNS_SELECTED_MESSAGE')
    expect(fireQuery).toHaveBeenCalledTimes(1)
  })

  it('resets to the default columns and reloads when the user resets columns', () => {
    const initPLModel = vi.fn()
    const setFireRequest = vi.fn()
    const store = createStore({
      state: { fireRequest: false },
      actions: { ...actions, initPLModel, setFireRequest },
      getters: { ...getters, getFireRequest: (state: any) => state.fireRequest },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })
    const vm = wrapper.vm as any
    initPLModel.mockClear()
    setFireRequest.mockClear()

    vm.resetColumns()

    expect(initPLModel).toHaveBeenCalledTimes(1)
    expect(initPLModel.mock.calls[0][1]).toEqual({ loadDefault: true })
    expect(setFireRequest).toHaveBeenCalledTimes(1)
  })

  it('ignores stale completion while the latest request is pending', async () => {
    const first = createDeferred()
    const second = createDeferred()
    const fireQuery = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const store = createStore({
      state: { fireRequest: false },
      actions: { ...actions, fireQuery },
      getters: { ...getters, getFireRequest: (state: any) => state.fireRequest },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()
    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()

    first.resolve({ data: [], totalPatientCount: 0 })
    await new Promise(r => setTimeout(r, 0))
    expect((wrapper.vm as any).isLoading).toBe(true)

    second.resolve({ data: [], totalPatientCount: 0 })
    await new Promise(r => setTimeout(r, 0))
    expect((wrapper.vm as any).isLoading).toBe(false)
  })

  it('emits busy false on unmount', async () => {
    const { promise } = createDeferred()
    const fireQuery = vi.fn().mockReturnValue(promise)
    const store = createStore({
      state: { fireRequest: false },
      actions: { ...actions, fireQuery },
      getters: { ...getters, getFireRequest: (state: any) => state.fireRequest },
    })
    const wrapper = shallowMount(PatientListContainer as any, {
      global: { plugins: [store, createPinia()] },
      props: { busyEv: false, showLeftPane: true },
    })

    store.state.fireRequest = !store.state.fireRequest
    await wrapper.vm.$nextTick()

    wrapper.unmount()

    expect(wrapper.emitted('busyEv')).toContainEqual([false])
  })
})
