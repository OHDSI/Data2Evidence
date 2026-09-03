import { ref, nextTick } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDatasourceResources } from './useDatasourceResources'
import * as systemPortal from '../api/systemPortal'
import * as downloadUtil from '../utils/downloadResource'

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('useDatasourceResources', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('loads the resource list for the current sourceKey', async () => {
    vi.spyOn(systemPortal, 'getResources').mockResolvedValue([
      { name: 'cohort.csv', size: '12 KB', type: 'text/csv' },
    ])

    const res = useDatasourceResources(() => 'ds-1', () => 'tok')
    expect(res.loading.value).toBe(true)
    await flushPromises()

    expect(systemPortal.getResources).toHaveBeenCalledWith('ds-1', 'tok')
    expect(res.loading.value).toBe(false)
    expect(res.resources.value).toEqual([{ name: 'cohort.csv', size: '12 KB', type: 'text/csv' }])
  })

  it('re-fetches when the reactive sourceKey changes (switching the Data Sources selector)', async () => {
    const spy = vi.spyOn(systemPortal, 'getResources').mockResolvedValue([])
    const sourceKey = ref('ds-1')
    useDatasourceResources(() => sourceKey.value, () => 'tok')
    await flushPromises()
    expect(spy).toHaveBeenCalledWith('ds-1', 'tok')

    sourceKey.value = 'ds-2'
    await nextTick()
    await flushPromises()

    expect(spy).toHaveBeenCalledWith('ds-2', 'tok')
  })

  it('clears resources and swallows errors on failure', async () => {
    vi.spyOn(systemPortal, 'getResources').mockRejectedValue(new Error('boom'))

    const res = useDatasourceResources(() => 'ds-1', () => 'tok')
    await flushPromises()

    expect(res.loading.value).toBe(false)
    expect(res.resources.value).toEqual([])
  })

  it('download() fetches, decodes, and saves the file, tracking which one is downloading', async () => {
    vi.spyOn(systemPortal, 'getResources').mockResolvedValue([{ name: 'cohort.csv', size: '12 KB', type: 'text/csv' }])
    const downloadSpy = vi.spyOn(systemPortal, 'downloadResource').mockResolvedValue({ data: 'aGVsbG8=', contentType: 'text/csv' })
    const saveBlobAsSpy = vi.spyOn(downloadUtil, 'saveBlobAs').mockImplementation(() => {})

    const res = useDatasourceResources(() => 'ds-1', () => 'tok')
    await flushPromises()

    const promise = res.download(res.resources.value[0])
    expect(res.downloadingName.value).toBe('cohort.csv')
    await promise

    expect(downloadSpy).toHaveBeenCalledWith('ds-1', 'cohort.csv', 'tok')
    expect(saveBlobAsSpy).toHaveBeenCalled()
    expect(res.downloadingName.value).toBeNull()
  })
})
