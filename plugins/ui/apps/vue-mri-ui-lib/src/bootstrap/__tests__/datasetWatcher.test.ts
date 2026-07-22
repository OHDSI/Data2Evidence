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
