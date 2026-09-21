import { ref, nextTick } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDatasourceAccess } from './useDatasourceAccess'
import * as systemPortal from '../api/systemPortal'
import * as userMgmt from '../api/userMgmt'
import * as jwt from '../utils/jwt'

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('useDatasourceAccess', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(jwt, 'getIdpUserId').mockReturnValue('idp-1')
    vi.spyOn(systemPortal, 'getDataset').mockResolvedValue({
      id: 'ds-1',
      studyDetail: { name: 'Demo Dataset', description: 'Hello **world**', showRequestAccess: true },
    })
  })

  it('resolves to approved when the dataset id is in alp_role_study_researcher', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({
      userId: 'u-1',
      alp_role_study_researcher: ['ds-1'],
    })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const { accessState, loading } = useDatasourceAccess(() => 'ds-1', () => 'tok')
    await flushPromises()

    expect(loading.value).toBe(false)
    expect(accessState.value).toBe('approved')
  })

  it('resolves to pending when a matching access request exists', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([
      { id: 'r1', userId: 'u-1', studyId: 'ds-1', role: 'RESEARCHER' },
    ])

    const { accessState } = useDatasourceAccess(() => 'ds-1', () => 'tok')
    await flushPromises()

    expect(accessState.value).toBe('pending')
  })

  it('resolves to no-access when showRequestAccess is true and no role/pending request', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const { accessState } = useDatasourceAccess(() => 'ds-1', () => 'tok')
    await flushPromises()

    expect(accessState.value).toBe('no-access')
  })

  it('resolves to restricted when showRequestAccess is false and no role/pending request', async () => {
    vi.spyOn(systemPortal, 'getDataset').mockResolvedValue({
      id: 'ds-1',
      studyDetail: { name: 'Demo Dataset', description: 'x', showRequestAccess: false },
    })
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const { accessState } = useDatasourceAccess(() => 'ds-1', () => 'tok')
    await flushPromises()

    expect(accessState.value).toBe('restricted')
  })

  it('falls back to no-access (not a crash) when the role/pending-request calls fail, but still exposes the dataset', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockRejectedValue(new Error('500'))
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const { accessState, accessLookupFailed, dataset, error, requestAccess } = useDatasourceAccess(() => 'ds-1', () => 'tok')
    await flushPromises()

    expect(accessState.value).toBe('no-access')
    expect(dataset.value?.studyDetail?.name).toBe('Demo Dataset')
    expect(error.value).not.toBeNull()
    // Distinct from a legitimate no-access: userId was never resolved on this
    // path, so the view must not present a request flow that silently no-ops.
    expect(accessLookupFailed.value).toBe(true)

    const addSpy = vi.spyOn(userMgmt, 'addStudyAccessRequest')
    await requestAccess()
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('requestAccess posts the request then refetches to pending', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    const pendingSpy = vi
      .spyOn(userMgmt, 'getMyStudyAccessRequests')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'r1', userId: 'u-1', studyId: 'ds-1', role: 'RESEARCHER' }])
    const addSpy = vi.spyOn(userMgmt, 'addStudyAccessRequest').mockResolvedValue(undefined)

    const { accessState, requestAccess } = useDatasourceAccess(() => 'ds-1', () => 'tok')
    await flushPromises()
    expect(accessState.value).toBe('no-access')

    await requestAccess()

    expect(addSpy).toHaveBeenCalledWith('u-1', 'ds-1', 'RESEARCHER', 'tok')
    expect(pendingSpy).toHaveBeenCalledTimes(2)
    expect(accessState.value).toBe('pending')
  })

  it('reloads with the new dataset when the reactive sourceKey changes (switching the Data Sources selector)', async () => {
    const getDatasetSpy = vi.spyOn(systemPortal, 'getDataset').mockImplementation(async (sourceKey: string) => ({
      id: sourceKey,
      studyDetail: { name: `Dataset ${sourceKey}`, description: 'x', showRequestAccess: true },
    }))
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const sourceKey = ref('ds-1')
    const { dataset } = useDatasourceAccess(() => sourceKey.value, () => 'tok')
    await flushPromises()

    expect(dataset.value?.id).toBe('ds-1')
    expect(getDatasetSpy).toHaveBeenCalledWith('ds-1', 'tok')

    sourceKey.value = 'ds-2'
    await nextTick()
    await flushPromises()

    expect(dataset.value?.id).toBe('ds-2')
    expect(dataset.value?.studyDetail?.name).toBe('Dataset ds-2')
    expect(getDatasetSpy).toHaveBeenCalledWith('ds-2', 'tok')
  })

  it('discards a slow response for an abandoned source when a newer one resolves first (out-of-order network races)', async () => {
    const deferreds: Record<string, { resolve: (v: unknown) => void }> = {}
    vi.spyOn(systemPortal, 'getDataset').mockImplementation((sourceKey: string) =>
      new Promise(resolve => {
        deferreds[sourceKey] = { resolve: resolve as (v: unknown) => void }
      }),
    )
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const sourceKey = ref('ds-1')
    const { dataset, loading } = useDatasourceAccess(() => sourceKey.value, () => 'tok')
    await flushPromises()
    expect(loading.value).toBe(true) // ds-1's getDataset is still pending

    sourceKey.value = 'ds-2'
    await nextTick()
    await flushPromises()
    expect(loading.value).toBe(true) // ds-2's getDataset is also still pending

    // ds-2 (the current source) resolves first...
    deferreds['ds-2'].resolve({ id: 'ds-2', studyDetail: { name: 'Dataset ds-2', description: 'x', showRequestAccess: true } })
    await flushPromises()
    expect(dataset.value?.id).toBe('ds-2')
    expect(loading.value).toBe(false)

    // ...then ds-1's stale response arrives late and must not clobber it.
    deferreds['ds-1'].resolve({ id: 'ds-1', studyDetail: { name: 'Dataset ds-1', description: 'x', showRequestAccess: true } })
    await flushPromises()
    expect(dataset.value?.id).toBe('ds-2')
    expect(loading.value).toBe(false)
  })

  it('re-resolves once a token-only update arrives for the same source (parcel first rendered before auth completed)', async () => {
    vi.spyOn(jwt, 'getIdpUserId').mockImplementation((token: string | null) => (token ? 'idp-1' : null))
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: ['ds-1'] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const token = ref<string | null>(null)
    const { accessState } = useDatasourceAccess(() => 'ds-1', () => token.value)
    await flushPromises()

    expect(accessState.value).toBe('no-access') // no token yet -> idpUserId null -> early-return branch

    token.value = 'tok-123'
    await nextTick()
    await flushPromises()

    expect(accessState.value).toBe('approved')
  })
})
