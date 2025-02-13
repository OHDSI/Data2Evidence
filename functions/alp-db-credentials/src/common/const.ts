export enum DB_DIALECT {
  PG = 'postgres',
  HANA = 'hana'
}

export const DB_DIALECTS = Object.values(DB_DIALECT).map(v => v as string)

export enum AuthenticationMode {
  PASSWORD = 'Password',
  JWT = 'JWT'
}

export const AUTHENTICATION_MODES = Object.values(AuthenticationMode).map(v => v as string)

export enum USER_SCOPE {
  ADMIN = 'Admin',
  READ = 'Read'
}

export const USER_SCOPES = Object.values(USER_SCOPE).map(v => v as string)

export enum SERVICE_SCOPE {
  INTERNAL = 'Internal',
  DATA_PLATFORM = 'DataPlatform'
}

export const SERVICE_SCOPES = Object.values(SERVICE_SCOPE).map(v => v as string)
