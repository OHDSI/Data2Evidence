import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveAccess, toCardVM, sortCards, filterCards, useDatasourceCatalog,
  type DatasourceCardVM,
} from './useDatasourceCatalog'
import type { DatasetListItem } from '../api/systemPortal'
import * as systemPortal from '../api/systemPortal'
import * as userMgmt from '../api/userMgmt'
import * as jwt from '../utils/jwt'

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

const base: DatasetListItem = {
  id: 'a', type: 'dataset', visibilityStatus: 'PUBLIC', dataModel: 'OMOP',
  studyDetail: { name: 'EHR', summary: 'desc', showRequestAccess: true },
  attributes: [
    { attributeId: 'patient_count', value: '1223234' },
    { attributeId: 'created_date', value: '2026-06-18' },
    { attributeId: 'version', value: 'omop5-2' },
  ],
}

describe('resolveAccess', () => {
  it('approved when the dataset id is a researcher study', () => {
    expect(resolveAccess(base, new Set(['a']), new Set(), true)).toBe('approved')
  })
  it('pending when a request is pending', () => {
    expect(resolveAccess({ ...base, id: 'b' }, new Set(), new Set(['b']), true)).toBe('pending')
  })
  it('no-access when requestable', () => {
    expect(resolveAccess({ ...base, id: 'c' }, new Set(), new Set(), true)).toBe('no-access')
  })
  it('restricted when not requestable', () => {
    expect(resolveAccess({ ...base, id: 'c', studyDetail: { showRequestAccess: false } }, new Set(), new Set(), true)).toBe('restricted')
  })
  it('anonymous is always no-access', () => {
    expect(resolveAccess(base, new Set(['a']), new Set(['a']), false)).toBe('no-access')
  })
})

describe('toCardVM', () => {
  it('maps attributes, formats date + count, sets public flag', () => {
    const vm = toCardVM(base, 'approved')
    expect(vm.name).toBe('EHR')
    expect(vm.description).toBe('desc')
    expect(vm.subjectCount).toBe('1,223,234')
    expect(vm.publishedDate).toBe('Jun 18, 2026')
    expect(vm.sourceType).toBe('OMOP')
    expect(vm.version).toBe('omop5-2')
    expect(vm.isPublic).toBe(true)
    expect(vm.access).toBe('approved')
  })
})

describe('sortCards / filterCards', () => {
  const mk = (id: string, name: string, access: DatasourceCardVM['access']) => ({ id, name, access } as DatasourceCardVM)
  it('access order: approved, pending, no-access, restricted, then name', () => {
    const out = sortCards([mk('1', 'Z', 'no-access'), mk('2', 'A', 'approved'), mk('3', 'B', 'pending'), mk('4', 'C', 'restricted')], 'access')
    expect(out.map(x => x.id)).toEqual(['2', '3', '1', '4'])
  })
  it('name-asc / name-desc', () => {
    const list = [mk('1', 'Beta', 'approved'), mk('2', 'alpha', 'approved')]
    expect(sortCards(list, 'name-asc').map(x => x.name)).toEqual(['alpha', 'Beta'])
    expect(sortCards(list, 'name-desc').map(x => x.name)).toEqual(['Beta', 'alpha'])
  })
  it('filters by name or description, case-insensitive', () => {
    const list = [
      { id: '1', name: 'EHR Primary', description: 'cardiology' } as DatasourceCardVM,
      { id: '2', name: 'MIMIC', description: 'icu notes' } as DatasourceCardVM,
    ]
    expect(filterCards(list, 'ehr').map(x => x.id)).toEqual(['1'])
    expect(filterCards(list, 'ICU').map(x => x.id)).toEqual(['2'])
    expect(filterCards(list, '').map(x => x.id)).toEqual(['1', '2'])
  })
})

describe('useDatasourceCatalog', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('logged-in: loads researcher list, resolves access, default sort=access', async () => {
    vi.spyOn(jwt, 'getIdpUserId').mockReturnValue('idp-1')
    vi.spyOn(systemPortal, 'getPublicHeaderImage').mockResolvedValue({ type: 'header-image', value: null })
    vi.spyOn(systemPortal, 'getPublicOverviewDescription').mockResolvedValue({ type: 'overview-description', value: 'desc' })
    vi.spyOn(systemPortal, 'getDatasetList').mockResolvedValue([
      base,
      { ...base, id: 'b', studyDetail: { name: 'Beta', showRequestAccess: true } },
    ])
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u1', alp_role_study_researcher: ['a'] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const cat = useDatasourceCatalog(() => 'tok')
    await flushPromises()

    expect(cat.sortMode.value).toBe('access')
    expect(cat.sources.value.find(s => s.id === 'a')!.access).toBe('approved')
    expect(cat.visible.value[0].access).toBe('approved')
  })

  it('anonymous: uses public list, no researcher/pending calls, default sort=name-asc', async () => {
    vi.spyOn(jwt, 'getIdpUserId').mockReturnValue(null)
    vi.spyOn(systemPortal, 'getPublicHeaderImage').mockResolvedValue({ type: 'header-image', value: null })
    vi.spyOn(systemPortal, 'getPublicOverviewDescription').mockResolvedValue({ type: 'overview-description', value: 'desc' })
    const pub = vi.spyOn(systemPortal, 'getPublicDatasetList').mockResolvedValue([base])
    const grp = vi.spyOn(userMgmt, 'getUserGroupList')

    const cat = useDatasourceCatalog(() => null)
    await flushPromises()

    expect(pub).toHaveBeenCalled()
    expect(grp).not.toHaveBeenCalled()
    expect(cat.sortMode.value).toBe('name-asc')
    expect(cat.sources.value[0].access).toBe('no-access')
  })
})
