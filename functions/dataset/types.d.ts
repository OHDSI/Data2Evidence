type RoleTypeOf<T, ADMIN_ROLE_TYPE> = {
  ALP_USER_ADMIN: ADMIN_ROLE_TYPE
  ALP_SYSTEM_ADMIN: ADMIN_ROLE_TYPE
  ALP_NIFI_ADMIN: ADMIN_ROLE_TYPE
  ALP_DASHBOARD_VIEWER: ADMIN_ROLE_TYPE
  ALP_ADMIN: ADMIN_ROLE_TYPE
  ALP_OWNER: ADMIN_ROLE_TYPE
  TENANT_VIEWER: T
  STUDY_RESEARCHER: T
}

//Roles for tenant users map
type AlpTenantUserRoleMapType = RoleTypeOf<string[], boolean>

//Roles for tenant users
type AlpTenantUserRoleType = RoleTypeOf<string, string>

//Roles for apps
type AlpAppRoleMapType = {
  VALIDATE_TOKEN_ROLE: string
  ADMIN_DATA_READER_ROLE: string
  BI_DATA_READER_ROLE: string
}

type AlpRoleType = AlpTenantUserRoleType & AlpAppRoleMapType

export interface RoleMap {
  alp_tenant_id: string[] // list of all tenant ids
  alp_role_study_researcher: string[] // list of study ids
  alp_role_tenant_viewer: string[] // list of tenant ids
  alp_role_user_admin: boolean // alp user admin
  alp_role_system_admin: boolean // alp system admin
  alp_role_nifi_admin: boolean // alp nifi admin
  alp_role_alp_dashboard_viewer: boolean // alp dashboard viewer
}

export interface IPluginItem {
  name: string
  route: string
  pluginPath: string
  featureFlag?: string
  iconUrl?: string
  iconSize?: number
  enabled?: boolean
  requireRoles?: string[]
  type?: string
  proxySource?: string
  proxyDestination?: string
  proxyTarget?: string
  proxyTimeout?: number
}

export interface IPlugin {
  researcher: IPluginItem[]
  admin: IPluginItem[]
  systemadmin: IPluginItem[]
  superadmin: IPluginItem[]
}

export interface IRouteProp {
  source: string
  destination: string
}

export interface IALPUser {
  userId: string
  name?: string
  email?: string
  alpRoleMap: AlpTenantUserRoleMapType
  roles: string[]
  tenantId: string[]
  groups: string[]
  jwt: string
  isB2C: boolean
  sourceOrigin?: string
  system?: string
}

export interface IToken {
  sub: string
  aud: string | string[]
  roles?: string[]
  [prop: string]: any
}

export type LoggingLevel = 'info' | 'warn' | 'error'

export interface DatasetDashboard {
  id: string
  name: string
  url: string
  basePath: string
}

export interface Dataset {
  dialect: string
  databaseCode: string
  schemaName: string
  resultsSchemaName: string
  dashboards: DatasetDashboard[]
  vocabSchemaName: string
}
