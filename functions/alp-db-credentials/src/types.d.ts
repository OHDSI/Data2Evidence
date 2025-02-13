import { AuthenticationMode, DB_DIALECTS, SERVICE_SCOPE, SERVICE_SCOPES, USER_SCOPES } from './common/const'

export type ReqContext = {
  userId: string
  grantType: string
}

export interface IDbDto {
  host: string
  port: number
  code: string
  name: string
  dialect: DbDialect
  extra: IDbExtraDto
  authenticationMode: AuthenticationMode
  credentials: IDbCredentialDto[]
  vocabSchemas: string[]
}

export interface IDbUpdateDto {
  id: string
  name: string
  host: string
  port: number
  vocabSchemas?: string[]
  extra?: IDbExtraDto
}

export interface IDbCredentialUpdateDto {
  id: string
  authenticationMode: AuthenticationMode
  credentials: IDbCredentialDto[]
}

export interface IDbExtraDto {
  [SERVICE_SCOPE.INTERNAL]?: object
  [SERVICE_SCOPE.DATA_PLATFORM]?: object
}

export type DbDialect = (typeof DB_DIALECTS)[number]
export type UserScope = (typeof USER_SCOPES)[number]
export type ServiceScope = (typeof SERVICE_SCOPES)[number]

export interface IDbCredentialDto {
  username: string
  password: string
  salt: string
  userScope: UserScope
  serviceScope: ServiceScope
}
