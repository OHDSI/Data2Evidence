import { ref, watch, type Ref } from "vue";
import { getDataset, type Dataset } from "../api/systemPortal";
import {
  getUserGroupList,
  getMyStudyAccessRequests,
  addStudyAccessRequest,
  STUDY_RESEARCHER_ROLE,
} from "../api/userMgmt";
import { getIdpUserId } from "../utils/jwt";

export type AccessState = "approved" | "pending" | "no-access" | "restricted";

export interface UseDatasourceAccessResult {
  dataset: Ref<Dataset | null>;
  accessState: Ref<AccessState>;
  // True only when resolving access itself failed (network/server error) —
  // distinct from a legitimate "no-access" business state. userId is never
  // set on this path, so requestAccess() is a no-op; the view must disable
  // the action rather than present a request flow that silently does nothing.
  accessLookupFailed: Ref<boolean>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  requestingAccess: Ref<boolean>;
  requestAccess: () => Promise<void>;
}

export function useDatasourceAccess(
  getSourceKey: () => string,
  getToken: () => string | null,
): UseDatasourceAccessResult {
  const dataset = ref<Dataset | null>(null);
  const accessState = ref<AccessState>("no-access");
  const loading = ref(true);
  const error = ref<string | null>(null);
  const requestingAccess = ref(false);
  const userId = ref<string | null>(null);
  const accessLookupFailed = ref(false);
  let requestId = 0;

  async function resolveAccessState(myRequestId: number): Promise<void> {
    const sourceKey = getSourceKey();
    const token = getToken();
    const idpUserId = getIdpUserId(token);
    if (!idpUserId) {
      if (myRequestId === requestId) accessState.value = "no-access";
      return;
    }
    try {
      const [groupList, pendingRequests] = await Promise.all([
        getUserGroupList(idpUserId, token),
        getMyStudyAccessRequests(token),
      ]);
      if (myRequestId !== requestId) return;
      accessLookupFailed.value = false;
      userId.value = groupList.userId;
      if (groupList.alp_role_study_researcher.includes(sourceKey)) {
        accessState.value = "approved";
      } else if (
        pendingRequests.some(
          (r) => r.studyId === sourceKey && r.role === STUDY_RESEARCHER_ROLE,
        )
      ) {
        accessState.value = "pending";
      } else if (dataset.value?.studyDetail?.showRequestAccess) {
        accessState.value = "no-access";
      } else {
        accessState.value = "restricted";
      }
    } catch (e) {
      if (myRequestId !== requestId) return;
      accessState.value = "no-access";
      accessLookupFailed.value = true;
      error.value =
        e instanceof Error ? e.message : "Failed to resolve access status";
    }
  }

  async function load(): Promise<void> {
    const myRequestId = ++requestId;
    loading.value = true;
    dataset.value = null;
    error.value = null;
    userId.value = null;
    accessState.value = "no-access";
    accessLookupFailed.value = false;
    try {
      const result = await getDataset(getSourceKey(), getToken());
      if (myRequestId !== requestId) return;
      dataset.value = result;
      await resolveAccessState(myRequestId);
    } catch (e) {
      if (myRequestId !== requestId) return;
      error.value = e instanceof Error ? e.message : "Failed to load dataset";
    } finally {
      if (myRequestId === requestId) loading.value = false;
    }
  }

  async function requestAccess(): Promise<void> {
    if (!userId.value) return;
    requestingAccess.value = true;
    try {
      await addStudyAccessRequest(
        userId.value,
        getSourceKey(),
        STUDY_RESEARCHER_ROLE,
        getToken(),
      );
      await resolveAccessState(requestId);
    } finally {
      requestingAccess.value = false;
    }
  }

  // Atlas3 calls the single-spa parcel's `update` hook (not a remount) when the
  // Data Sources selector changes — the same Vue instance persists and props
  // update reactively, so this composable must re-fetch on its own rather than
  // relying on setup() running again. Also watch the token: a parcel can first
  // render before auth completes (token null), and a token-only update for the
  // same source must re-run load() too, or it stays stuck on whatever state
  // resolved without a token (idpUserId null -> 'no-access').
  watch([getSourceKey, getToken], () => void load(), { immediate: true });

  return {
    dataset,
    accessState,
    accessLookupFailed,
    loading,
    error,
    requestingAccess,
    requestAccess,
  };
}
