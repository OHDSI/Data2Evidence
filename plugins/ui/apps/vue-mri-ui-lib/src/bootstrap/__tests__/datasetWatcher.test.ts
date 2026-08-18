import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPortalContextStore } from '@/stores/portalContext'
import { SET_DATASET_RELOAD_IN_PROGRESS } from '@/store/mutation-types'
import { installDatasetChangeWatcher } from '../datasetWatcher'

const createDeferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(res => {
    resolve = res
  })

  return { promise, resolve }
}

describe('bootstrap/datasetWatcher', () => {
  it('triggers dataset reload flow on dataset change in order', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const calls: string[] = []
    const vuexStore = {
      commit: vi.fn((name: string) => calls.push(`commit:${name}`)),
      dispatch: vi.fn(async (name: string) => {
        calls.push(`dispatch:${name}`)
      }),
    } as any

    const stop = installDatasetChangeWatcher(portalContext, vuexStore)

    portalContext.applyProps({ datasetId: 'ds-2' })
    await nextTick()

    await vi.waitFor(() => {
      expect(calls).toEqual([
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
        'commit:SET_ACTIVE_BOOKMARK',
        'commit:RESET_ALL_BOOKMARKS',
        'dispatch:setDataset',
        'dispatch:setDatasetReleaseId',
        'commit:RESET_DATASET_CACHE',
        'dispatch:requestMriConfig',
        'dispatch:setFireRequest',
        'dispatch:refreshBookmarksForDatasetSwitch',
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
      ])
    })

    stop()
  })

  it('runs the reload flow at install when the store holds a different dataset', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-2',
      releaseId: 'rel-2',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const calls: string[] = []
    const vuexStore = {
      // Simulates the shared plain-object Vuex state surviving a single-spa
      // unmount: the app was last loaded for ds-1, but is now remounted under ds-2.
      getters: { getSelectedDataset: { id: 'ds-1' } },
      commit: vi.fn((name: string) => calls.push(`commit:${name}`)),
      dispatch: vi.fn(async (name: string) => {
        calls.push(`dispatch:${name}`)
      }),
    } as any

    const stop = installDatasetChangeWatcher(portalContext, vuexStore)

    await vi.waitFor(() => {
      expect(calls).toEqual([
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
        'commit:SET_ACTIVE_BOOKMARK',
        'commit:RESET_ALL_BOOKMARKS',
        'dispatch:setDataset',
        'dispatch:setDatasetReleaseId',
        'commit:RESET_DATASET_CACHE',
        'dispatch:requestMriConfig',
        'dispatch:setFireRequest',
        'dispatch:refreshBookmarksForDatasetSwitch',
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
      ])
    })

    stop()
  })

  it('clears the reload flag when an install-time reload fails', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-2',
      releaseId: 'rel-2',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const commit = vi.fn()
    const dispatch = vi.fn(async (name: string) => {
      if (name === 'requestMriConfig') {
        throw new Error('config failed')
      }
    })

    const stop = installDatasetChangeWatcher(portalContext, {
      getters: { getSelectedDataset: { id: 'ds-1' } },
      commit,
      dispatch,
    } as any)

    await vi.waitFor(() => {
      expect(commit).toHaveBeenCalledWith(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: false })
    })

    stop()
  })

  it('a subscriber change supersedes an in-flight install-time reload', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-2',
      releaseId: 'rel-2',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const installRequest = createDeferred()
    let requestMriConfigCount = 0
    const commit = vi.fn()
    const dispatch = vi.fn(async (name: string) => {
      if (name === 'requestMriConfig') {
        requestMriConfigCount += 1
        if (requestMriConfigCount === 1) {
          await installRequest.promise
        }
      }
    })

    const stop = installDatasetChangeWatcher(portalContext, {
      getters: { getSelectedDataset: { id: 'ds-1' } },
      commit,
      dispatch,
    } as any)

    // Install-time reload is in flight (blocked in requestMriConfig); a live
    // dataset change arrives and must own the completion effects.
    await vi.waitFor(() => {
      expect(requestMriConfigCount).toBe(1)
    })
    portalContext.applyProps({ datasetId: 'ds-3' })
    await nextTick()

    installRequest.resolve()

    await vi.waitFor(() => {
      const finishCalls = commit.mock.calls.filter(
        ([mutation, payload]) =>
          mutation === SET_DATASET_RELOAD_IN_PROGRESS && payload?.datasetReloadInProgress === false
      )
      expect(finishCalls.length).toBe(1)
      // Only the subscriber's reload may reach the bookmark refresh.
      const refreshCalls = dispatch.mock.calls.filter(([action]) => action === 'refreshBookmarksForDatasetSwitch')
      expect(refreshCalls.length).toBe(1)
    })

    stop()
  })

  it('does not run the reload flow at install when the store dataset matches', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const vuexStore = {
      getters: { getSelectedDataset: { id: 'ds-1' } },
      commit: vi.fn(),
      dispatch: vi.fn(async () => {}),
    } as any

    const stop = installDatasetChangeWatcher(portalContext, vuexStore)
    await nextTick()

    expect(vuexStore.commit).not.toHaveBeenCalled()
    expect(vuexStore.dispatch).not.toHaveBeenCalled()

    stop()
  })

  it('does not run the reload flow at install on first mount with no persisted dataset', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const vuexStore = {
      getters: {},
      commit: vi.fn(),
      dispatch: vi.fn(async () => {}),
    } as any

    const stop = installDatasetChangeWatcher(portalContext, vuexStore)
    await nextTick()

    expect(vuexStore.commit).not.toHaveBeenCalled()
    expect(vuexStore.dispatch).not.toHaveBeenCalled()

    stop()
  })

  it('does not trigger reload flow when watched values are unchanged', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const vuexStore = {
      commit: vi.fn(),
      dispatch: vi.fn(async () => {}),
    } as any

    const stop = installDatasetChangeWatcher(portalContext, vuexStore)

    portalContext.applyProps({ debug: true })
    await nextTick()

    expect(vuexStore.commit).not.toHaveBeenCalled()
    expect(vuexStore.dispatch).not.toHaveBeenCalled()

    stop()
  })

  it('clears dataset reload loading flag when requestMriConfig fails', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const commit = vi.fn()
    const dispatch = vi.fn(async (name: string) => {
      if (name === 'requestMriConfig') {
        throw new Error('config failed')
      }
    })

    const stop = installDatasetChangeWatcher(portalContext, { commit, dispatch } as any)

    portalContext.applyProps({ datasetId: 'ds-3' })
    await nextTick()

    await vi.waitFor(() => {
      expect(commit).toHaveBeenCalledWith(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: false })
    })
    expect(dispatch).toHaveBeenCalledWith('requestMriConfig')

    stop()
  })

  it('keeps only latest dataset reload completion effects when updates overlap', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const setDatasetA = createDeferred()
    const requestLatest = createDeferred()
    let setDatasetCount = 0

    const commit = vi.fn()
    const dispatch = vi.fn(async (name: string) => {
      if (name === 'setDataset') {
        setDatasetCount += 1
        if (setDatasetCount === 1) {
          await setDatasetA.promise
        }
      }

      if (name === 'requestMriConfig' && setDatasetCount >= 2) {
        await requestLatest.promise
      }
    })

    const stop = installDatasetChangeWatcher(portalContext, { commit, dispatch } as any)

    portalContext.applyProps({ datasetId: 'ds-2' })
    await nextTick()

    portalContext.applyProps({ datasetId: 'ds-3' })
    await nextTick()

    setDatasetA.resolve()

    await vi.waitFor(() => {
      expect(setDatasetCount).toBe(2)
      const setFireRequestCalls = dispatch.mock.calls.filter(([action]) => action === 'setFireRequest')
      expect(setFireRequestCalls.length).toBe(0)
    })

    requestLatest.resolve()

    await vi.waitFor(() => {
      const setFireRequestCalls = dispatch.mock.calls.filter(([action]) => action === 'setFireRequest')
      expect(setFireRequestCalls.length).toBe(1)

      const reloadFinishCalls = commit.mock.calls.filter(
        ([mutation, payload]) =>
          mutation === SET_DATASET_RELOAD_IN_PROGRESS && payload?.datasetReloadInProgress === false
      )
      expect(reloadFinishCalls.length).toBe(1)
    })

    stop()
  })

  it('does not clear dataset reload flag until latest overlapping reload completes', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const setDatasetA = createDeferred()
    const requestLatest = createDeferred()
    let setDatasetCount = 0

    const commit = vi.fn()
    const dispatch = vi.fn(async (name: string) => {
      if (name === 'setDataset') {
        setDatasetCount += 1
        if (setDatasetCount === 1) {
          await setDatasetA.promise
        }
      }

      if (name === 'requestMriConfig' && setDatasetCount >= 2) {
        await requestLatest.promise
      }
    })

    const stop = installDatasetChangeWatcher(portalContext, { commit, dispatch } as any)

    portalContext.applyProps({ datasetId: 'ds-2' })
    await nextTick()
    portalContext.applyProps({ datasetId: 'ds-3' })
    await nextTick()

    setDatasetA.resolve()

    await vi.waitFor(() => {
      expect(setDatasetCount).toBe(2)
    })

    const reloadFinishCallsBeforeLatestResolves = commit.mock.calls.filter(
      ([mutation, payload]) => mutation === SET_DATASET_RELOAD_IN_PROGRESS && payload?.datasetReloadInProgress === false
    )
    expect(reloadFinishCallsBeforeLatestResolves.length).toBe(0)

    requestLatest.resolve()

    await vi.waitFor(() => {
      const reloadFinishCalls = commit.mock.calls.filter(
        ([mutation, payload]) =>
          mutation === SET_DATASET_RELOAD_IN_PROGRESS && payload?.datasetReloadInProgress === false
      )
      expect(reloadFinishCalls.length).toBe(1)
    })

    stop()
  })

  it('keeps overlay active until dataset-switch bookmark refresh completes', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const refreshBookmarks = createDeferred()
    const commit = vi.fn()
    const dispatch = vi.fn(async (name: string) => {
      if (name === 'refreshBookmarksForDatasetSwitch') {
        await refreshBookmarks.promise
      }
    })

    const stop = installDatasetChangeWatcher(portalContext, { commit, dispatch } as any)

    portalContext.applyProps({ datasetId: 'ds-2' })
    await nextTick()

    await vi.waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith('refreshBookmarksForDatasetSwitch')
    })

    const finishCallsBeforeBookmarkRefresh = commit.mock.calls.filter(
      ([mutation, payload]) => mutation === SET_DATASET_RELOAD_IN_PROGRESS && payload?.datasetReloadInProgress === false
    )
    expect(finishCallsBeforeBookmarkRefresh.length).toBe(0)

    refreshBookmarks.resolve()

    await vi.waitFor(() => {
      const finishCalls = commit.mock.calls.filter(
        ([mutation, payload]) =>
          mutation === SET_DATASET_RELOAD_IN_PROGRESS && payload?.datasetReloadInProgress === false
      )
      expect(finishCalls.length).toBe(1)
    })

    stop()
  })
})
