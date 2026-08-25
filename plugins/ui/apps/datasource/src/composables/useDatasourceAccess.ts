import { ref, watch, type Ref } from 'vue'
import { getDataset, type Dataset } from '../api/systemPortal'
import { getUserGroupList, getMyStudyAccessRequests, addStudyAccessRequest, STUDY_RESEARCHER_ROLE } from '../api/userMgmt'
import { getIdpUserId } from '../utils/jwt'

export type AccessState = 'approved' | 'pending' | 'no-access' | 'restricted'

export interface UseDatasourceAccessResult {
  dataset: Ref<Dataset | null>
  accessState: Ref<AccessState>
  loading: Ref<boolean>
  error: Ref<string | null>
  requestingAccess: Ref<boolean>
  requestAccess: () => Promise<void>
}

export function useDatasourceAccess(
  getSourceKey: () => string,
  getToken: () => string | null,
): UseDatasourceAccessResult {
  const dataset = ref<Dataset | null>(null)
  const accessState = ref<AccessState>('no-access')
  const loading = ref(true)
  const error = ref<string | null>(null)
  const requestingAccess = ref(false)
  const userId = ref<string | null>(null)

  async function resolveAccessState(): Promise<void> {
    const sourceKey = getSourceKey()
    const token = getToken()
    const idpUserId = getIdpUserId(token)
    if (!idpUserId) {
      accessState.value = 'no-access'
      return
    }
    try {
      const [groupList, pendingRequests] = await Promise.all([
        getUserGroupList(idpUserId, token),
        getMyStudyAccessRequests(token),
      ])
      userId.value = groupList.userId
      if (groupList.alp_role_study_researcher.includes(sourceKey)) {
        accessState.value = 'approved'
      } else if (pendingRequests.some(r => r.studyId === sourceKey && r.role === STUDY_RESEARCHER_ROLE)) {
        accessState.value = 'pending'
      } else if (dataset.value?.studyDetail?.showRequestAccess) {
        accessState.value = 'no-access'
      } else {
        accessState.value = 'restricted'
      }
    } catch (e) {
      accessState.value = 'no-access'
      error.value = e instanceof Error ? e.message : 'Failed to resolve access status'
    }
  }

  async function load(): Promise<void> {
    loading.value = true
    dataset.value = null
    error.value = null
    userId.value = null
    accessState.value = 'no-access'
    try {
      dataset.value = await getDataset(getSourceKey(), getToken())
      await resolveAccessState()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load dataset'
    } finally {
      loading.value = false
    }
  }

  async function requestAccess(): Promise<void> {
    if (!userId.value) return
    requestingAccess.value = true
    try {
      await addStudyAccessRequest(userId.value, getSourceKey(), STUDY_RESEARCHER_ROLE, getToken())
      await resolveAccessState()
    } finally {
      requestingAccess.value = false
    }
  }

  // Atlas3 calls the single-spa parcel's `update` hook (not a remount) when the
  // Data Sources selector changes — the same Vue instance persists and props
  // update reactively, so this composable must re-fetch on its own rather than
  // relying on setup() running again.
  watch(getSourceKey, () => void load(), { immediate: true })

  return { dataset, accessState, loading, error, requestingAccess, requestAccess }
}
