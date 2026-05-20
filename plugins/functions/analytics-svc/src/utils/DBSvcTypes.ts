export interface QueryObjectResultType<T> {
    data: T;
    sql: string;
    sqlParameters: any[];
}
export interface IDBCredentialsType {
    schema?: string;
    dialect: string;
    host: string;
    port: number;
    user: string;
    password: string;
}
export interface IDBHanaCredentialsType extends IDBCredentialsType {
    databaseName: string;
    autoCommit: boolean;
    hostname_in_certificate: string;
    validate_certificate: boolean;
    pooling: boolean;
    encrypt: boolean;
    sslTrustStore: string;
    sslCryptoProvider: string;
    useTLS: boolean;
    rejectUnauthorized: boolean;
}

export interface IDBPgCredentialsType extends IDBCredentialsType {
    database: string;
    ssl: IPgTenantConfigSSL;
    connectionTimeoutMillis: number;
    idle_in_transaction_session_timeout: number;
    query_timeout: number;
    statement_timeout: number;
}

export interface IHanaTenantConfig {
    host: string;
    port: number;
    databaseName: string;
    hanaReadUser: string;
    hanaReadPassword: string;
    autoCommit: boolean;
    validate_certificate: boolean;
    pooling: boolean;
    encrypt: boolean;
    sslTrustStore: string;
    enableAuditPolicies: boolean;
    dialect: string;
}

interface IPgTenantConfigSSL {
    ca: string;
    rejectUnauthorized: boolean;
}

export interface IPgTenantConfig {
    host: string;
    port: number;
    databaseName: string;
    postgresReadUser: string;
    postgresReadPassword: string;
    ssl: IPgTenantConfigSSL;
    connectionTimeoutMillis: number;
    idle_in_transaction_session_timeout: number;
    query_timeout: number;
    statement_timeout: number;
    dialect: string;
}

export interface SnapshotSchemaMetadata {
    schemaName: string;
    schemaTablesMetadata: SnapshotTableMetadata[];
}

export interface SnapshotTableMetadata {
    tableName: string;
    tableColumnsMetadata: SnapshotColumnMetadata[];
}

export interface SnapshotColumnMetadata {
    columnName: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isSelected: boolean;
}

export interface ITokenUser {
    userId: string;
    idpUserId: string;
    email?: string;
}

export interface SchemaVersionInfo {
    schemaName: string;
    dataModel?: string;
    currentVersionID?: string;
    updatesAvailable?: boolean;
}
