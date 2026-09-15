import { ITokenUser } from './types'

import { LOGTO_ROLE_NAMES } from '@alp/idp/roles.ts'
export {
  ROLES,
  LOGTO_ROLES,
  LOGTO_ROLE_NAMES,
  WEBAPI_RESEARCHER_SCOPES,
  sourceUserScopeName,
  datasetResearcherScopes
} from '@alp/idp/roles.ts'

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
