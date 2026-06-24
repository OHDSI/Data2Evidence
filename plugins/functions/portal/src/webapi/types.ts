/**
 * WebAPI Source Request payload
 * Used for creating/updating sources in WebAPI
 * Field names match WebAPI's SourceRequest.java
 */
export interface ISourceRequest {
  key: string
  name: string
  dialect: string
  connectionString: string
  username?: string
  password?: string
  daimons: IDaimonRequest[]
  krbAuthMethod?: string
}

/**
 * Daimon configuration for a WebAPI source
 */
export interface IDaimonRequest {
  daimonType: 'CDM' | 'Vocabulary' | 'Results'
  tableQualifier: string
  priority: number
}

/**
 * WebAPI Source Info response
 * Returned from WebAPI source endpoints
 */
export interface ISourceInfo {
  sourceId: number
  sourceKey: string
  sourceName: string
  sourceDialect: string
  sourceConnection: string
  daimons?: ISourceDaimon[]
}

/**
 * Daimon info from WebAPI source response
 */
export interface ISourceDaimon {
  sourceDaimonId: number
  daimonType: string
  tableQualifier: string
  priority: number
}

/**
 * Database credentials interface
 * Used to build JDBC connection strings
 */
export interface IDbCredentials {
  host: string
  port: number | string
  database: string
  dialect: string
  username: string
  password: string
}

/**
 * WebAPI security role (subset) returned by GET /role.
 */
export interface IRole {
  id: number
  name: string
}
