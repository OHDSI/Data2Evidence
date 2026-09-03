import { ref, computed, watch, type Ref } from 'vue'
import { getDatasetList, getPublicDatasetList, getPublicDatasetIds, getPublicHeaderImage, getPublicOverviewDescription, type DatasetListItem } from '../api/systemPortal'
import { getUserGroupList, getMyStudyAccessRequests, STUDY_RESEARCHER_ROLE } from '../api/userMgmt'
import { getIdpUserId } from '../utils/jwt'
import type { AccessState } from './useDatasourceAccess'

export type SortMode = 'access' | 'name-asc' | 'name-desc'

export interface DatasourceCardVM {
  id: string
  name: string
  description: string
  subjectCount: string
  publishedDate: string
  sourceType: string
  version: string
  isPublic: boolean
  access: AccessState
}

export interface BannerConfig {
  title: string
  description: string
  logoUrl?: string
}

const DEFAULT_BANNER: BannerConfig = {
  title: 'Data2Evidence',
  description: 'Our vision is a world where health data is comprehensively, digitally, and securely available for research.',
  // Default header image when the admin hasn't set one (served at /atlas/config
  // in the d2e Atlas build) — mirrors the portal's researcher Overview default.
  logoUrl: '/atlas/config/landing-page-illustration.svg',
}

const ACCESS_ORDER: Record<AccessState, number> = { approved: 0, pending: 1, 'no-access': 2, restricted: 3 }

const attr = (d: DatasetListItem, id: string): string =>
  d.attributes?.find(a => a.attributeId === id)?.value ?? ''

export function resolveAccess(
  d: DatasetListItem,
  researcherIds: Set<string>,
  pendingIds: Set<string>,
  isLoggedIn: boolean,
): AccessState {
  if (!isLoggedIn) return 'no-access'
  if (researcherIds.has(d.id)) return 'approved'
  if (pendingIds.has(d.id)) return 'pending'
  return d.studyDetail?.showRequestAccess ? 'no-access' : 'restricted'
}

export function toCardVM(d: DatasetListItem, access: AccessState, isPublic?: boolean): DatasourceCardVM {
  const rawCount = attr(d, 'patient_count')
  const count = Number(rawCount)
  const created = attr(d, 'created_date')
  const date = created ? new Date(created) : null
  return {
    id: d.id,
    name: d.studyDetail?.name ?? '',
    description: d.studyDetail?.summary ?? d.studyDetail?.description ?? '',
    subjectCount: rawCount !== '' && Number.isFinite(count) ? count.toLocaleString('en-US') : rawCount,
    publishedDate: date && !isNaN(date.getTime())
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      : '',
    sourceType: d.dataModel ?? '',
    version: attr(d, 'version'),
    // `/dataset/list` doesn't return visibilityStatus, so callers pass isPublic
    // derived from the public list; fall back to the field when present.
    isPublic: isPublic ?? d.visibilityStatus === 'PUBLIC',
    access,
  }
}

export function sortCards(list: DatasourceCardVM[], mode: SortMode): DatasourceCardVM[] {
  const byName = (a: DatasourceCardVM, b: DatasourceCardVM): number =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  const copy = [...list]
  if (mode === 'name-asc') return copy.sort(byName)
  if (mode === 'name-desc') return copy.sort((a, b) => byName(b, a))
  return copy.sort((a, b) => ACCESS_ORDER[a.access] - ACCESS_ORDER[b.access] || byName(a, b))
}

export function filterCards(list: DatasourceCardVM[], query: string): DatasourceCardVM[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter(x => x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q))
}

export function useDatasourceCatalog(getToken: () => string | null) {
  const sources: Ref<DatasourceCardVM[]> = ref([])
  const banner = ref<BannerConfig>({ ...DEFAULT_BANNER })
  const loading = ref(true)
  const error = ref<string | null>(null)
  const query = ref('')
  const isLoggedIn = ref(false)
  const sortMode = ref<SortMode>('name-asc')

  async function loadBanner(): Promise<void> {
    // Admin banner via the PUBLIC config endpoints (no auth) — mirrors the d2e
    // portal. `header-image`.value is the admin-set image (null if unset);
    // `overview-description`.value is the tagline.
    try {
      const [img, desc] = await Promise.all([
        getPublicHeaderImage().catch(() => null),
        getPublicOverviewDescription().catch(() => null),
      ])
      banner.value = {
        title: DEFAULT_BANNER.title,
        description: desc?.value || DEFAULT_BANNER.description,
        logoUrl: img?.value || DEFAULT_BANNER.logoUrl,
      }
    } catch {
      banner.value = { ...DEFAULT_BANNER }
    }
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    const token = getToken()
    const idpUserId = getIdpUserId(token)
    isLoggedIn.value = !!idpUserId
    sortMode.value = idpUserId ? 'access' : 'name-asc'
    try {
      await loadBanner()
      if (idpUserId) {
        const [datasets, groupList, pending, publicIds] = await Promise.all([
          getDatasetList(token),
          getUserGroupList(idpUserId, token),
          getMyStudyAccessRequests(token),
          getPublicDatasetIds().catch(() => [] as string[]),
        ])
        const rSet = new Set(groupList.alp_role_study_researcher)
        const pSet = new Set(pending.filter(r => r.role === STUDY_RESEARCHER_ROLE).map(r => r.studyId))
        // visibilityStatus isn't on the researcher list, so a dataset is public
        // iff it also appears in the public list (by id).
        const publicSet = new Set(publicIds)
        sources.value = datasets.map(d => toCardVM(d, resolveAccess(d, rSet, pSet, true), publicSet.has(d.id)))
      } else {
        const datasets = await getPublicDatasetList()
        // Everything from the public list is public by definition.
        sources.value = datasets.map(d => toCardVM(d, resolveAccess(d, new Set(), new Set(), false), true))
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load data sources'
    } finally {
      loading.value = false
    }
  }

  const visible = computed(() => sortCards(filterCards(sources.value, query.value), sortMode.value))

  // Mirrors useDatasourceAccess: re-fetch when the token changes (Atlas3 may
  // update props via the parcel `update` hook rather than remounting).
  watch(getToken, () => void load(), { immediate: true })

  return { sources, visible, banner, loading, error, query, sortMode, isLoggedIn, load }
}
