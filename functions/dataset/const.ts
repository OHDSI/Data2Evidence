import type { AlpRoleType } from './types.d.ts'

export const ROLES: AlpRoleType = {
  ALP_USER_ADMIN: 'ALP_USER_ADMIN',
  ALP_SYSTEM_ADMIN: 'ALP_SYSTEM_ADMIN',
  ALP_NIFI_ADMIN: 'ALP_NIFI_ADMIN',
  ALP_DASHBOARD_VIEWER: 'ALP_DASHBOARD_VIEWER',
  TENANT_VIEWER: 'TENANT_VIEWER',
  STUDY_RESEARCHER: 'RESEARCHER',
  VALIDATE_TOKEN_ROLE: 'VALIDATE_TOKEN',
  ADMIN_DATA_READER_ROLE: 'ADMIN_DATA_READER',
  BI_DATA_READER_ROLE: 'BI_DATA_READER',
  ALP_ADMIN: 'ALP_ADMIN',
  ALP_OWNER: 'ALP_OWNER'
}

export const CDMSchemaTypes = {
  CreateCDM: 'create_cdm',
  NoCDM: 'no_cdm',
  CustomCDM: 'custom_cdm',
  ExistingCDM: 'existing_cdm'
}

export enum DbDialect {
  Postgres = 'postgres',
  Hana = 'hana'
}
