export type PrefectVariable = {
  name: string;
  value: string;
};

export interface PrefectSecret {
  value: any;
}

export enum BlockType {
  RFS = "remote-file-system",
  SECRET = "secret",
  DOCKER_CREDENTIALS = "docker-registry-credentials",
}

enum UserScope {
  "ADMIN" = "Admin",
  "READ" = "Read",
}

enum ServiceScope {
  "INTERNAL" = "Internal",
}

interface Credentials {
  username: string;
  password: string;
  userScope: UserScope;
  serviceScope: ServiceScope;
}

interface DbExtra {
  encrypt?: boolean;
  validateCertificate?: boolean;
  sslTrustStore?: string;
  hostnameInCertificate?: string;
  enableAuditPolicies?: boolean;
  readRole?: string;
}

export interface DBCredentials {
  code: string;
  id: string;
  host: string;
  port: number;
  name: string;
  dialect: DatabaseDialect;
  credentials: Credentials[];
  vocab_schemas: string[];
  publications: any[];
  db_extra: DbExtra;
  authentication_mode: AuthMode.JWT | AuthMode.PASSWORD;
}

export enum DatabaseDialect {
  PG = "postgres",
  HANA = "hana",
}

export enum AuthMode {
  PASSWORD = "Password",
  JWT = "JWT",
}

interface TransformedDBCredentials {
  readUser: string | null;
  readPassword?: string | null;
  adminUser: string | null;
  adminPassword?: string | null;
  dialect: string;
  databaseName: string;
  databaseCode: string;
  host: string;
  port: number;
  encrypt?: boolean;
  validateCertificate?: boolean;
  sslTrustStore?: string;
  hostnameInCertificate?: string;
  enableAuditPolicies?: boolean;
  readRole?: string;
  authMode: AuthMode.PASSWORD | AuthMode.JWT;
}

export function transformDBCredentials(
  dbCredentialsArray: DBCredentials[]
): TransformedDBCredentials[] {
  return dbCredentialsArray.map((dbCredentials) => {
    // Extract read and admin credentials based on their type
    const readCredential = dbCredentials.credentials.find(
      (cred) => cred.userScope === UserScope.READ
    );
    const adminCredential = dbCredentials.credentials.find(
      (cred) => cred.userScope === UserScope.ADMIN
    );

    // Create the transformed object
    const transformedCredentials: TransformedDBCredentials = {
      readUser: readCredential ? readCredential.username : null,
      readPassword: readCredential ? readCredential.password : null,
      adminUser: adminCredential ? adminCredential.username : null,
      adminPassword: adminCredential ? adminCredential.password : null,
      dialect: dbCredentials.dialect,
      databaseCode: dbCredentials.code,
      databaseName: dbCredentials.name,
      host: dbCredentials.host,
      port: dbCredentials.port,
      encrypt: dbCredentials.db_extra.encrypt
        ? dbCredentials.db_extra.encrypt
        : false,
      validateCertificate: dbCredentials.db_extra.validateCertificate
        ? dbCredentials.db_extra.validateCertificate
        : false,
      sslTrustStore: dbCredentials.db_extra.sslTrustStore
        ? dbCredentials.db_extra.sslTrustStore
        : "",
      hostnameInCertificate: dbCredentials.db_extra.hostnameInCertificate
        ? dbCredentials.db_extra.hostnameInCertificate
        : "",
      enableAuditPolicies: dbCredentials.db_extra.enableAuditPolicies
        ? dbCredentials.db_extra.enableAuditPolicies
        : false,
      readRole: dbCredentials.db_extra.readRole
        ? dbCredentials.db_extra.readRole
        : "",
      authMode: dbCredentials.authentication_mode,
    };
    return transformedCredentials;
  });
}

export enum SERVICE_SCOPE {
  INTERNAL = "Internal",
  DATA_PLATFORM = "DataPlatform",
}
