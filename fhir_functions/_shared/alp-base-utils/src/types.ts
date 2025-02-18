//import { ITokenPayload } from "passport-azure-ad";
import { Request } from "express";
import { ConnectionInterface } from "./Connection";

export interface IMRIDBRequest extends Request {
  dbConnections: Map<string, ConnectionInterface>;
}

export interface IDBCredentialsType {
  schema?: string;
  dialect: string;
  host: string;
  port: number;
  user: string;
  password: string;
}
export interface QueryObjectResultType<T> {
  data: T;
  sql: string;
  sqlParameters: any[];
}

export interface IRoleTypeOf<T, ADMIN_ROLE_TYPE> {
  ALP_ADMIN_ROLE: ADMIN_ROLE_TYPE;
  ALP_OWNER_ROLE: ADMIN_ROLE_TYPE;
  TENANT_ADMIN_ROLE: T;
  TENANT_VIEWER_ROLE: T;
  STUDY_ADMIN_ROLE: T;
  STUDY_MANAGER_ROLE: T;
  STUDY_RESEARCHER_ROLE: T;
}

//Roles for tenant users map
export type AlpTenantUserRoleMapType = IRoleTypeOf<string[], boolean>;

//Roles for tenant users
export type AlpTenantUserRoleType = IRoleTypeOf<string, string>;

//Roles for apps
export interface AlpAppRoleMapType {
  VALIDATE_TOKEN_ROLE: string;
  ADMIN_DATA_READER_ROLE: string;
  BI_DATA_READER_ROLE: string;
}

export type AlpRoleType = AlpTenantUserRoleType & AlpAppRoleMapType;

export interface IUser {
  userId: string;
  name?: string;
  email?: string;
}

export type IAppTokenPayload = any & {
  given_name: string;
  family_name: string;
  extension_termsOfUseConsentVersion: string;
  email: string;
  userMgmtGroups: IUserMgmtGroups;
};

export interface IUserMgmtGroups {
  groups: string[];

  // alp admin
  alp_role_admin?: boolean;

  // alp owner
  alp_role_owner?: boolean;

  alp_tenant_id: string[];

  // list of tenantid
  alp_role_tenant_admin: string[];

  // list of tenantid
  alp_role_tenant_viewer: string[];

  // list of studyid
  alp_role_study_admin: string[];

  // list of studyid
  alp_role_study_mgr: string[];

  // list of studyid
  alp_role_study_researcher: string[];
}

export interface QuerySvcResultType {
  queryObject: QueryObjectType;
  fast: any;
  config: any;
  measures: MRIEndpointResultMeasureType[];
  categories: MRIEndpointResultCategoryType[];
  groupAttrAliases: any;
}

export interface MRIEndpointResultCategoryType {
  axis: number;
  id: string;
  name: string;
  order: string; //"ASC" | "DESC";
  type: string;
  value: string;
}

export interface MRIEndpointResultMeasureType {
  group: number;
  id: string;
  name: string;
  type: string;
  value: string;
}

export interface QueryObjectType {
  queryString: string;
  parameterPlaceholders: any;
  sqlReturnOn: any;
}

export interface ProcessEnv {
  [key: string]: string | undefined;
}
