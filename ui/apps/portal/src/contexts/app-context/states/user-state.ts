export interface UserState {
  userId: string | null;
  idpUserId: string | null;
  canAccessSystemAdminPortal: boolean;
  canAccessResearcherPortal: boolean;
  isResearcher: boolean;
  isUserAdmin: boolean;
  isSystemAdmin: boolean;
  isDashboardViewer: boolean;
  isDatasetResearcher: DatasetResearcherKeyValue;
}

export interface DatasetResearcherKeyValue {
  [datasetId: string]: boolean;
}

type RoleTypeOf<T, Boolean> = {
  ALP_USER_ADMIN: Boolean;
  ALP_SYSTEM_ADMIN: Boolean;
  ALP_DASHBOARD_VIEWER: Boolean;
  TENANT_VIEWER: T;
  STUDY_MANAGER: T;
  STUDY_RESEARCHER: T;
};

type AlpTenantUserRoleMapType = RoleTypeOf<string[], boolean>;

export interface UserGroupMetadata {
  userId: string | null;
  groups: string[];
  alpRoleMap: AlpTenantUserRoleMapType;
  alp_tenant_id: string[]; // list of all tenant ids
  alp_role_study_researcher: string[]; // list of study ids
  alp_role_study_mgr: string[]; // list of study ids
  alp_role_tenant_viewer: string[]; // list of tenant ids
  alp_role_user_admin: boolean; // alp user admin
  alp_role_system_admin: boolean; // alp system admin
  alp_role_dashboard_viewer: boolean; // dashboard viewer
}
