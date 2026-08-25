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

    const { accessState, dataset, error } = useDatasourceAccess(() => 'ds-1', () => 'tok')
    await flushPromises()

    expect(accessState.value).toBe('no-access')
    expect(dataset.value?.studyDetail?.name).toBe('Demo Dataset')
    expect(error.value).not.toBeNull()
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
})
