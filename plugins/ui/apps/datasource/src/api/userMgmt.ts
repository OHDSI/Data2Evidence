import { apiFetch } from './client'

export const STUDY_RESEARCHER_ROLE = 'RESEARCHER'

export interface UserGroupMetadata {
  userId: string | null
  alp_role_study_researcher: string[]
}

export function getUserGroupList(idpUserId: string, token: string | null): Promise<UserGroupMetadata> {
  return apiFetch<UserGroupMetadata>('/usermgmt/api/user-group/list', {
    method: 'POST',
    body: { userId: idpUserId, sync: true },
    token,
  })
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
