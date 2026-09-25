// Role naming shared by usermgmt (which writes roles as memberships change) and
// the IdP migration (which writes them once for existing memberships). One copy,
// so the two cannot drift.

export const ROLES = {
  ALP_USER_ADMIN: 'ALP_USER_ADMIN',
  ALP_SYSTEM_ADMIN: 'ALP_SYSTEM_ADMIN',
  ALP_DASHBOARD_VIEWER: 'ALP_DASHBOARD_VIEWER',
  ETL_MAPPING_CONTRIBUTOR: 'ETL_MAPPING_CONTRIBUTOR',
  TENANT_ADMIN: 'TENANT_ADMIN',
  TENANT_VIEWER: 'TENANT_VIEWER',
  STUDY_ADMIN: 'STUDY_ADMIN',
  STUDY_RESEARCHER: 'RESEARCHER',
  STUDY_WRITE_DQD_RESEARCHER: 'STUDY_WRITE_DQD_RESEARCHER',
  STUDY_RESULTS_READ_RESEARCHER: 'STUDY_RESULTS_READ_RESEARCHER',
  ALP_SHARED: 'ALP_SHARED'
}

export const LOGTO_ROLES = {
  USER_ADMIN: 'role.useradmin',
  SYSTEM_ADMIN: 'role.systemadmin',
  DASHBOARD_VIEWER: 'role.dashboardviewer',
  TENANT_VIEWER: 'role.viewer',
  RESEARCHER: 'role.researcher',
  JOB_RUNNER: 'role.jobrunner',
  STUDY_RESULTS_READER: 'role.studyresultsreader',
  ETL_MAPPING_CONTRIBUTOR: 'role.etlmappingcontributor'
} as const

export const LOGTO_ROLE_NAMES: Record<string, string> = {
  [ROLES.ALP_USER_ADMIN]: LOGTO_ROLES.USER_ADMIN,
  [ROLES.ALP_SYSTEM_ADMIN]: LOGTO_ROLES.SYSTEM_ADMIN,
  [ROLES.ALP_DASHBOARD_VIEWER]: LOGTO_ROLES.DASHBOARD_VIEWER,
  [ROLES.TENANT_VIEWER]: LOGTO_ROLES.TENANT_VIEWER,
  [ROLES.STUDY_RESEARCHER]: LOGTO_ROLES.RESEARCHER,
  [ROLES.STUDY_WRITE_DQD_RESEARCHER]: LOGTO_ROLES.JOB_RUNNER,
  [ROLES.STUDY_RESULTS_READ_RESEARCHER]: LOGTO_ROLES.STUDY_RESULTS_READER,
  [ROLES.ETL_MAPPING_CONTRIBUTOR]: LOGTO_ROLES.ETL_MAPPING_CONTRIBUTOR
}

// Kebab-case because Logto rejects spaces in scope names; canonicalRoleNames
// expands them back to the sec_role names WebAPI matches.
export const WEBAPI_RESEARCHER_SCOPES = ['cohort-reader', 'cohort-creator', 'concept-set-creator']

export const sourceUserScopeName = (datasetId: string) => `source-user-${datasetId}`

// Cohort and concept-set scopes apply to every dataset type: those objects live in
// WebAPI whatever the dataset's own type, so a researcher on a hana__omop or omop
// dataset needs them to create a concept set as much as one on a webapi dataset.
// Only the per-source "Source user" scope stays webapi-only, because the WebAPI
// source role it maps to exists only for webapi-type datasets.
export const datasetResearcherScopes = (roleName: string, datasetId: string, type?: string): string[] => {
  const scopes = [roleName, `role.researcher.${datasetId}`, ...WEBAPI_RESEARCHER_SCOPES]
  if (type === 'webapi') {
    scopes.push(sourceUserScopeName(datasetId))
  }
  return scopes
}

// LOGTO__ROLES_SCOPES paired these roles with extra scopes that are
// webapi.sec_role names in their own right.
const IMPLIED_CANONICAL_ROLES: Record<string, string[]> = {
  'role.systemadmin': ['admin'],
  'role.viewer': ['anonymous']
}

/**
 * The canonical names one group grants, from its role and scope pair. Every
 * scope becomes a name: dropping any of them would quietly remove access.
 */
export function canonicalRoleNames(role: string, scopes: string[]): string[] {
  const sourceUser = /^source-user-(.+)$/
  const kebab: Record<string, string> = {
    'cohort-reader': 'cohort reader',
    'cohort-creator': 'cohort creator',
    'concept-set-creator': 'concept set creator'
  }
  const expand = (name: string): string => {
    const match = sourceUser.exec(name)
    if (match) return `Source user (${match[1]})`
    // Unknown scopes pass through: a name nothing maps is recoverable, a
    // dropped grant is not.
    return kebab[name] ?? name
  }
  const input = [role, ...scopes]
  const implied = input.flatMap(name => IMPLIED_CANONICAL_ROLES[name] ?? [])
  return [...new Set([...input, ...implied].map(expand))]
}

/**
 * The role and scopes one membership grants. A dataset-scoped researcher is
 * `role.researcher.<tokenDatasetCode>`; without a code there is nothing to grant.
 */
export function groupRoleAndScopes(
  group: { role: string; studyId?: string | null },
  dataset?: { tokenDatasetCode?: string | null; type?: string | null } | null
): { role: string; scopes: string[] } | null {
  const name = LOGTO_ROLE_NAMES[group.role] || group.role
  if (group.role === ROLES.STUDY_RESEARCHER && group.studyId) {
    if (!dataset?.tokenDatasetCode) return null
    const role = `${name}.${dataset.tokenDatasetCode}`
    return { role, scopes: datasetResearcherScopes(role, group.studyId, dataset.type ?? undefined) }
  }
  return { role: name, scopes: [name] }
}
