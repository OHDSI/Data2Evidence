import { Request } from 'express'
import { ITokenPayload } from 'passport-azure-ad'

export type Knex = any;

export interface Pagination {
  offset: number
  limit: number
}

type RoleTypeOf<T> = {
  ALP_USER_ADMIN: boolean
  ALP_SYSTEM_ADMIN: boolean
  ALP_NIFI_ADMIN: boolean
  ALP_DASHBOARD_VIEWER: boolean
  TENANT_ADMIN: T
  TENANT_VIEWER: T
  STUDY_MANAGER: T
  STUDY_RESEARCHER: T
  STUDY_WRITE_DQD_RESEARCHER: T
}

//Roles for tenant users map
type AlpTenantUserRoleMapType = RoleTypeOf<string[]>

export interface ITokenUser {
  userId: string
  idpUserId?: string
}

export interface IAppRequest extends Request {
  user: ITokenUser
}

export interface RoleMap {
  alp_tenant_id: string[] // list of all tenant ids
  alp_role_study_researcher: string[] // list of study ids
  alp_role_study_mgr: string[] // list of study ids
  alp_role_study_admin: string[] // list of study ids
  alp_role_tenant_admin: string[] // list of tenant ids
  alp_role_tenant_viewer: string[] // list of tenant ids
  alp_role_study_write_dqd_researcher: boolean // alp job runner
  alp_role_user_admin: boolean // alp user admin
  alp_role_system_admin: boolean // alp system admin
  alp_role_nifi_admin: boolean // nifi admin
  alp_role_dashboard_viewer: boolean // dashboard viewer
}

export interface UserGroupMetadata extends RoleMap {
  userId: string
  groups: string[]
  alpRoleMap: AlpTenantUserRoleMapType
}

export interface IUserWithRoles {
  userId: string
  username: string
  roles: string[]
}

export interface IUserWithRolesInfo {
  userId: string
  username: string
  roles: string[]
  system: string | null
  tenantId: string | null
  studyId: string | null
}

export type AccessRequestAction = 'approve' | 'reject'

export interface IUser {
  id: string
  name: string
}

export interface EmailTemplateRequest {
  toEmail: string
  templateId: number
  data: { [key: string]: string }
}

export interface ITenantFeature {
  tenantId: string
  feature: string
}

export interface ITenant {
  id: string
  name: string
}

export interface ILogtoUser {
  id: string
  username: string
  primaryEmail: string | undefined
}

export interface ILogtoUserCreated {
  id: string
}

export interface UserAddRequest {
  username: string
  groupIds: string[]
  password?: string
}

export interface UserDeleteRequest {
  userId: string
}

export interface UserActivateRequest {
  userId: string
  active: boolean
}

export interface ConfigItem {
  code: string
  value: string
}

export interface ConfigSetRequest {
  configs: ConfigItem[]
}

export interface AzureADSetupRequest {
  tenantViewerGroupId: string
  systemAdminGroupId: string
  userAdminGroupId: string
}

export interface IDataset {
  id: string
  token_dataset_code: string
}