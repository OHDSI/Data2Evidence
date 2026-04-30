export type UserScope = "Admin" | "Read";
export type ServiceScope = "Internal";

export interface IDbCredential {
  id?: string;
  username: string;
  password: string;
  salt: string;
  userScope: UserScopeType;
  serviceScope: ServiceScopeType;
}

export enum SERVICE_SCOPE_TYPES {
  INTERNAL = "Internal",
  DATA_PLATFORM = "DataPlatform",
}

export type ServiceScopeType = `${SERVICE_SCOPE_TYPES}`;

export enum USER_SCOPE_TYPES {
  ADMIN = "Admin",
  READ = "Read",
}

export enum AUTHENTICATION_MODES {
  PASSWORD = "Password",
  JWT = "JWT",
}
export type AuthenticationMode = `${AUTHENTICATION_MODES}`;

export type UserScopeType = `${USER_SCOPE_TYPES}`;

export interface IDbCreateDto {
  host: string;
  port: number;
  code: string;
  name: string;
  dialect: "postgres" | "hana";
  extra: { [key in ServiceScope]: object };
  authenticationMode: AuthenticationMode;
  credentials: IDbCredential[];
  vocabSchemas: string[];
}

export interface IDbDto extends IDbCreateDto {
  id: string;
}

