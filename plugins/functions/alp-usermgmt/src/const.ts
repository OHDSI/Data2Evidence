import { ITokenUser } from './types'

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

// Reverse mapping: Logto role name → internal role name
export const LOGTO_TO_INTERNAL_ROLES: Record<string, string> = Object.fromEntries(
  Object.entries(LOGTO_ROLE_NAMES).map(([internal, logto]) => [logto, internal])
)

export const GROUP_NAME_PARTS = {
  TID: 'TID',
  STUDYID: 'SID',
  ROLE: 'ROLE'
}

export const DEMO_USER: ITokenUser = {
  userId: 'e30e6fa8-5064-4adc-af88-e9e00ad78198'
}

// Sentinel userId for machine-to-machine / service tokens (sub === client_id).
// Authorization middleware bypasses checks only for this explicit value, so an
// unprovisioned end-user (whose userId is the empty string) cannot slip through.
export const SERVICE_USER_ID = '__service__'

export const INVITE_EXPIRY_SECONDS = 604800

export const CONTAINER_KEY = {
  DB_CONNECTION: 'DB_CONNECTION',
  AUTHORIZATION_HEADER: 'AUTHORIZATION_HEADER',
  CURRENT_USER: 'CURRENT_USER'
}

export const CONFIG_KEY = {
  ROLE_TENANT_VIEWER_GROUP_ID: 'ROLE_TENANT_VIEWER_GROUP_ID',
  ROLE_SYSTEM_ADMIN_GROUP_ID: 'ROLE_SYSTEM_ADMIN_GROUP_ID',
  ROLE_USER_ADMIN_GROUP_ID: 'ROLE_USER_ADMIN_GROUP_ID'
}

export const IDP_SCOPE_ROLE = {
  SYSTEM_ADMIN: 'role.systemadmin',
  USER_ADMIN: 'role.useradmin',
  DASHBOARD_VIEWER: 'role.dashboardviewer',
  DATASET_RESEARCHER_PREFIX: 'role.researcher.'
}

// Kebab-case because Logto rejects spaces in scope names; LOGTO__CUSTOM_JWT (docker-compose.yml)
// expands them back to canonical sec_role names ("cohort reader", etc.) for WebAPI matching.
export const WEBAPI_RESEARCHER_SCOPES = ['cohort-reader', 'cohort-creator', 'concept-set-creator']

// JWT customizer expands to `Source user (<id>)` to match WebAPI's per-source sec_role.
export const sourceUserScopeName = (datasetId: string) => `source-user-${datasetId}`

// Base researcher scopes apply to every dataset type. The WebAPI-specific scopes
// (per-source "Source user" + cohort/concept-set scopes) only apply to type === 'webapi'.
export const datasetResearcherScopes = (roleName: string, datasetId: string, type?: string): string[] => {
  const scopes = [roleName, `role.researcher.${datasetId}`]
  if (type === 'webapi') {
    scopes.push(sourceUserScopeName(datasetId), ...WEBAPI_RESEARCHER_SCOPES)
  }
  return scopes
}
