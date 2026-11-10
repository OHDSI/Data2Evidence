import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { useDatasourceOptions } from './useDatasourceOptions'

const getPublicDatasetList = vi.fn()
const fetchResearcherSources = vi.fn()

vi.mock('../api/systemPortal', () => ({ getPublicDatasetList: () => getPublicDatasetList() }))
vi.mock('./useDatasourceCatalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./useDatasourceCatalog')>()),
  fetchResearcherSources: (...args: unknown[]) => fetchResearcherSources(...args),
}))
vi.mock('../utils/jwt', () => ({ getIdpUserId: (t: string | null) => (t ? 'idp-user' : null) }))

describe('useDatasourceOptions', () => {
  beforeEach(() => {
    getPublicDatasetList.mockReset()
    fetchResearcherSources.mockReset()
  })

  it('lists public datasets as no-access when signed out', async () => {
    getPublicDatasetList.mockResolvedValue([{ id: 'p1', type: 'webapi', visibilityStatus: '', dataModel: 'omop', studyDetail: { name: 'Public one' } }])
    const opts = useDatasourceOptions(() => null)
    await flushPromises()
    expect(fetchResearcherSources).not.toHaveBeenCalled()
    expect(opts.sources.value).toEqual([expect.objectContaining({ id: 'p1', name: 'Public one', access: 'no-access', isPublic: true })])
    expect(opts.loading.value).toBe(false)
  })

  it('reloads when the token changes', async () => {
    fetchResearcherSources.mockResolvedValue([])
    const token = ref<string | null>('t1')
    useDatasourceOptions(() => token.value)
    await flushPromises()
    token.value = 't2'
    await flushPromises()
    expect(fetchResearcherSources.mock.calls.map(c => c[0])).toEqual(['t1', 't2'])
  })
})
