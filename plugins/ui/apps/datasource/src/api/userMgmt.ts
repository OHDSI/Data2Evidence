import { apiFetch } from './client'

export const STUDY_RESEARCHER_ROLE = 'RESEARCHER'

export interface UserGroupMetadata {
  userId: string | null
  alp_role_study_researcher: string[]
}

function fetchUserGroupList(idpUserId: string, token: string | null, sync: boolean): Promise<UserGroupMetadata> {
  return apiFetch<UserGroupMetadata>('/usermgmt/api/user-group/list', {
    method: 'POST',
    body: { userId: idpUserId, sync },
    token,
  })
}

// Sign-in already synced; sync here only if the user isn't provisioned yet.
export function getUserGroupList(idpUserId: string, token: string | null): Promise<UserGroupMetadata> {
  return fetchUserGroupList(idpUserId, token, false).catch(() => fetchUserGroupList(idpUserId, token, true))
}

export interface StudyAccessRequest {
  id: string
  userId: string
  studyId: string
  role: string
}

export function getMyStudyAccessRequests(token: string | null): Promise<StudyAccessRequest[]> {
  return apiFetch<StudyAccessRequest[]>('/usermgmt/api/study/access-request/me', { token })
}

export async function addStudyAccessRequest(
  userId: string,
  studyId: string,
  role: string,
  token: string | null,
): Promise<void> {
  await apiFetch('/usermgmt/api/study/access-request', {
    method: 'POST',
    body: { userId, studyId, role },
    token,
  })
}
