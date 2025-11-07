export interface IDatabaseCredentialCredentialsItem {
    username: string;
    userScope: string;
    serviceScope: string;
    password: string;
}

export interface IDatabaseCredential {
    code: string;
    id: string;
    host: number;
    port: string;
    name: string;
    dialect: string;
    credentials: IDatabaseCredentialCredentialsItem[];
    vocab_schemas: string[];
    publications: string[];
    db_extra: any;
    cation_: string;
}

type ConfigTypes = {
    HANA: "HANA";
    POSTGRES: "POSTGRES";
    AUDIT: "AUDIT";
    INT_TEST: "INT_TEST";
};

export type CombinedEnv = (HanaConfig | PostgresConfig | IntTestConfig)[];

export type HanaValues = {
    credentials: {
        user: string;
        password: string;
        adminUser: string;
        adminPassword: string;
        readUser: string;
        readPassword: string;
        customUser: string;
        customPassword: string;
        writeUser: string;
        writePassword: string;
    };
    host: string;
    port: string;
    code: string;
    databaseName: string;
    validateCertificate: boolean;
    pooling: boolean;
    autoCommit: boolean;
    encrypt: boolean;
    enableAuditPolicies: boolean;
    sslTrustStore: string;
    ca: string;
    useTLS: boolean;
    rejectUnauthorized: boolean;
    probeSchema: string;
    vocabSchema: string;
    configSchema: string;
    cdwSchema: string;
    schema: string;
    dialect: string;
    sslCryptoProvider: string;
    hostnameInCertificate: string;
};
export type HanaConfig = {
    type: ConfigTypes["HANA"];
    tags: string[];
    name: string;
    key: string;
    description: string;
    values: HanaValues;
    analyticsSvcValues?: Partial<HanaValues>;
    dbSvcValues?: Partial<HanaValues>;
    cdwSvcValues?: Partial<HanaValues>;
};

export type PostgresValues = {
    credentials: {
        user: string;
        password: string;
        adminUser: string;
        adminPassword: string;
        readUser: string;
        readPassword: string;
        customUser: string;
        customPassword: string;
        writeUser: string;
        writePassword: string;
    };
    host: string;
    port: string;
    code: string;
    database: string;
    databaseName: string;
    schema: string;
    vocabSchema: string;
    connectionTimeoutMillis: number;
    idleInTransactionSessionTimeout: number;
    queryTimeout: number;
    statementTimeout: number;
    dialect: string;
    max: number;
    idleTimeoutMillis: number;
};

export type PostgresConfig = {
    type: ConfigTypes["POSTGRES"];
    tags: string[];
    name: string;
    key: string;
    description: string;
    values: PostgresValues;
    analyticsSvcValues?: Partial<PostgresValues>;
    dbSvcValues?: Partial<PostgresValues>;
};

export type IntTestValues = {
    HANASERVER: string;
    TESTPORT: number;
    HDIUSER: string;
    TESTSYSTEMPW: string;
    TESTSCHEMA: string;
};

export type IntTestConfig = {
    type: ConfigTypes["INT_TEST"];
    tags: string[];
    name: string;
    key: string;
    description: string;
    values: IntTestValues;
    analyticsSvcValues?: Partial<IntTestValues>;
    dbSvcValues?: Partial<IntTestValues>;
};

export type VcapMridb = {
    mridb: (
        | VcapAlpHana
        | VcapAlpPostgres
        | VcapAlpHanaHttpTest
        | VcapAlpHanaTest
    )[];
};

export type EnvHana = {
    [key: string]: {
        host: string;
        port: string;
        databaseName: string;
        validate_certificate: boolean;
        pooling: boolean;
        autoCommit: boolean;
        encrypt: boolean;
        hanaAdminUser: string;
        hanaAdminPassword: string;
        hanaReadUser: string;
        hanaReadPassword: string;
        hanaWriteUser: string;
        hanaWritePassword: string;
        enableAuditPolicies: boolean;
        sslTrustStore: string;
        ca?: string;
    };
};

export type DbSvcPostgres = {
    [key: string]: {
        host: string;
        port: string;
        databaseName: string;
        user: string;
        password: string;
        postgresAdminUser: string;
        postgresAdminPassword: string;
        postgresReadUser: string;
        postgresReadPassword: string;
        postgresWriteUser: string;
        postgresWritePassword: string;
        postgresCustomUser: string;
        postgresCustomPassword: string;
        connectionTimeoutMillis: number;
        idle_in_transaction_session_timeout: number;
        query_timeout: number;
        statement_timeout: number;
    };
};
// Subtypes

export type VcapAlpHana = {
    name: string;
    credentials: {
        host: string;
        port: string;
        code: string;
        databaseName: string;
        user: string;
        password: string;
        validate_certificate: boolean;
        sslTrustStore: string;
        probeSchema: string;
        vocabSchema: string;
        configSchema: string;
        cdwSchema: string;
        schema: string;
        dialect: string;
        encrypt: boolean;
        sslCryptoProvider: string;
        pooling: string;
        hostname_in_certificate: string;
        ca: string;
        useTLS: boolean;
        rejectUnauthorized: boolean;
    };
    tags: string[];
};

export type VcapAlpPostgres = {
    name: string;
    credentials: {
        host: string;
        port: number;
        code: string;
        user: string;
        schema: string;
        vocabSchema: string;
        password: string;
        database: string;
        databaseName: string;
        dialect: string;
        idleTimeoutMillis: number;
        max: number;
    };
    tags: string[];
};

export type VcapAlpHanaHttpTest = {
    name: string;
    credentials: {
        HANASERVER: string;
        TESTPORT: number;
        HDIUSER: string;
        TESTSYSTEMPW: string;
        TESTSCHEMA: string;
    };
};

export type VcapAlpHanaTest = {
    name: string;
    credentials: {
        host: string;
        port: string;
        code: string;
        databaseName: string;
        user: string;
        password: string;
        validate_certificate: boolean;
        probeSchema: string;
        vocabSchema: string;
        schema: string;
        dialect: string;
        encrypt: boolean;
        pooling: string;
    };
    tags: string[];
};
