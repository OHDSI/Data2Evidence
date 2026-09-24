export interface UsermgmtUserRow { id: string; username: string; idpUserId: string | null }
export interface LogtoUserRow { id: string; username: string | null; primaryEmail: string | null; name: string | null; isSuspended: boolean }
export interface SubjectHistoryRow { userId: string; oldSub: string | null; newSub: string }
export interface GroupRow { userId: string; role: string; studyId: string | null; tokenDatasetCode: string | null; datasetType: string | null }
export interface PlannedLink { usermgmtId: string; username: string; logtoId: string; currentIdpUserId: string | null; email: string; name: string | null; banned: boolean }
export type SkipReason = 'duplicate_email' | 'no_email' | 'email_linked_elsewhere' | 'link_failed' | 'subject_would_change' | 'rekey_failed' | 'role_failed' | 'logto_origin_missing'
export interface SkippedUser { usermgmtId: string; username: string; logtoId: string; reason: SkipReason; detail?: string }
export interface LinkPlan { links: PlannedLink[]; skipped: SkippedUser[]; notLogto: number }
export type StepName = 'provider' | 'link' | 'roles' | 'rekey'
export type StepStatus = 'ok' | 'partial' | 'failed' | 'skipped'
