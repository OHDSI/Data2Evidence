import os
import logging
from enum import Enum
from typing import Optional, Dict
import duckdb
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from .backends.duckdb import DuckDBConnection
from .backends.postgres import PGConnection
from .backends.hana import HANAConnection
from buenavista import bv_dialects, rewrite
from config import Env
from .cdw_config import _resolve_cdw_config_duckdb_file_path
from api.OpenIdAPI import OpenIdAPI

logger = logging.getLogger(__name__)


class DBCredentialsType(BaseModel):
    user: Optional[str]
    password: Optional[str]
    dialect: str
    databaseName: str
    host: str
    port: int
    encrypt: bool
    validateCertificate: bool
    sslTrustStore: str
    hostnameInCertificate: str
    enableAuditPolicies: bool


class DatabaseDialects(str, Enum):
    HANA = "hana"
    POSTGRES = "postgresql"
    DUCKDB = "duckdb"
class ConnectionTypes(str, Enum):
    READ = "read"
    WRITE = "write"
class AuthenticationTypes(str, Enum):
    PASSWORD = "password"
    JWT = "JWT"


class CachedbDatabaseClients(BaseModel):
    hana: Optional[Dict[ConnectionTypes, Dict[str, Engine]]] = {}
    postgresql: Optional[Dict[ConnectionTypes, Dict[str, Engine]]] = {}

    class Config:
        arbitrary_types_allowed = True


def get_database_code_and_dialect_from_db_creds():
    dbs = Env.DATABASE_CREDENTIALS
    return [[db["values"]["code"], db["values"]["dialect"]] for db in dbs]


def extract_db_credentials(database_code: str):
    dbs = Env.DATABASE_CREDENTIALS
    if dbs == []:
        raise ValueError(
            f"Database credentials environment variable is empty")
    else:
        _db = next(filter(lambda x: x["values"]
                          ["code"] == database_code and "analytics" in x["tags"], dbs), None)
        if not _db:
            raise ValueError(
                f"Database code '{database_code}' not found in database credentials")
        else:
            database_credential = DatabaseCredentials(_db)
            return database_credential.get_values()


class DatabaseCredentials:
    def __init__(self, db):
        self.type = db["type"]
        self.tags = db["tags"]
        self.values = db["values"]

    def get_values(self) -> DBCredentialsType:
        values = self.values["credentials"]
        values["databaseName"] = self.values["databaseName"]
        values["dialect"] = self.values["dialect"]
        values["host"] = self.values["host"]
        values["port"] = self.values["port"]
        values["encrypt"] = self.values.get("encrypt", False)
        values["validateCertificate"] = self.values.get(
            "validateCertificate", False)
        values["sslTrustStore"] = self.values.get("sslTrustStore", "")
        values["hostnameInCertificate"] = self.values.get(
            "hostnameInCertificate", "")
        values["enableAuditPolicies"] = self.values.get(
            "enableAuditPolicies", False)

        # validate
        DBCredentialsType(**values)

        return values

def GetAuthenticationTypePerDialect(database_code: str):
    try:
        conn_details = extract_db_credentials(database_code)
        dialect = conn_details["dialect"]
        if "readUser" not in conn_details or "readPassword" not in conn_details:
            if dialect == DatabaseDialects.HANA:
                return AuthenticationTypes.JWT
            elif dialect == DatabaseDialects.POSTGRES:
                raise ValueError(f"Username/Password is undefined for db credentials - {database_code}")
        return AuthenticationTypes.PASSWORD
    except Exception as e:
        raise ValueError(
            f"Failed to extract database credential values for database code '{database_code}'") from e

def GetDBConnection(database_code: str, connection_type: ConnectionTypes, connect_args: Dict[str, str|int|bool] = {}):
    try:
        conn_details = extract_db_credentials(database_code)
    except Exception as e:
        raise ValueError(
            f"Failed to extract database credential values for database code '{database_code}'") from e
    else:
        database_name = conn_details["databaseName"]
        if conn_details["dialect"] == DatabaseDialects.HANA:
            dialect_driver = "hana+hdbcli"
            connect_args["encrypt"] = conn_details["encrypt"]
            connect_args["sslValidateCertificate"] = conn_details["validateCertificate"]
            if connect_args["sslValidateCertificate"] == True and conn_details["hostnameInCertificate"]:
                connect_args["sslHostNameInCertificate"] = conn_details["hostnameInCertificate"]
            db = database_name
        elif conn_details['dialect'] == DatabaseDialects.POSTGRES:
            dialect_driver = "postgresql+psycopg2"
            db = database_name
        host = conn_details["host"]
        port = conn_details["port"]
        if connection_type == ConnectionTypes.WRITE:
            # Get admin user credentials if connection type is write
            user = conn_details["adminUser"] if "adminUser" in conn_details else None
            password = conn_details["adminPassword"] if "adminPassword" in conn_details else None
        else: 
            # Get read user credentials by default
            user = conn_details["user"] if "user" in conn_details else None
            password = conn_details["password"] if "password" in conn_details else None
        conn_string = _CreateConnectionString(dialect_driver, user, password, host, port, db, database_code)
        engine = create_engine(conn_string, pool_size=Env.CACHEDB__POOL_SIZE, connect_args=connect_args)
        return engine

def _CreateConnectionString(dialect_driver: str, user: str, pw: str,
                            host: str, port: int, db: str, database_code: str) -> str:
    if user is None or pw is None:
        if dialect_driver == "hana+hdbcli":
            conn_string = f"{dialect_driver}://{host}:{port}/{db}" # JWT Authentication
        else:
            raise ValueError(f"Username/Password is undefined for db credentials - {database_code}")
    else:
        conn_string = f"{dialect_driver}://{user}:{pw}@{host}:{port}/{db}"
    return conn_string


def get_db_connection(clients: CachedbDatabaseClients, dialect: str, connection_type: ConnectionTypes, database_code: str, schema: str, vocab_schema: str, token: str):
    connection = None

    # Handle special case whereby cdw-config-svc is using alp-cachedb to get connection to cdw-svc duckdb file
    if database_code == Env.CDW_CONFIG_SVC_DATABASE_CODE and schema == Env.CDW_CONFIG_SVC_DUCKDB_SCHEMA_NAME:
        return DuckDBConnection(get_cdw_config_duckdb_connection(database_code, schema, connection_type))

    # Guard clause for postgres and hana for unsupported database_codes
    if dialect == DatabaseDialects.POSTGRES or dialect == DatabaseDialects.HANA:
        if database_code not in clients[dialect]:
            raise Exception(
                f"Dialect:{dialect} has no configuration with database code:{database_code}")
        
    # Guard clause for duckdb for unsupported database_codes
    # For DUCKDB, check against postgres dialect to check for supported database_codes
    if dialect == DatabaseDialects.DUCKDB:
        if database_code not in clients[DatabaseDialects.POSTGRES]:
            raise Exception(
                f"Dialect:{dialect} has no configuration with database code:{database_code}")


    if dialect == DatabaseDialects.POSTGRES:
        connection = PGConnection(
            clients[dialect][database_code][connection_type])

    if dialect == DatabaseDialects.HANA:
        hana_authentication_mode = clients[dialect][database_code]["AuthenticationMode"]
        if hana_authentication_mode == AuthenticationTypes.JWT:
            openIdAPI = OpenIdAPI()
            third_party_token = openIdAPI.get_third_party_token(token)
            # New connection is needed every single time since the end user's jwt is used
            jwt_engine = GetDBConnection(database_code, connection_type, {"password": third_party_token})
            connection = HANAConnection(jwt_engine)
        else:
            if clients[dialect][database_code][connection_type] is None:
                clients[dialect][database_code][connection_type] = GetDBConnection(database_code, connection_type)
            connection = HANAConnection(clients[dialect][database_code][connection_type])

    if dialect == DatabaseDialects.DUCKDB:
        '''
        Check if both schema and vocab duckdb database files exists.
        If both exists, continue connection with duckdb
        Else either does not exist, fallback connection to postgres.
        '''
        cdm_schema_duckdb_file_path = os.path.join(
            Env.DUCKDB__DATA_FOLDER, f"{database_code}_{schema}")
        vocab_schema_duckdb_file_path = os.path.join(
            Env.DUCKDB__DATA_FOLDER, f"{database_code}_{vocab_schema}")

        # Only when both duckdb files for cdm schema and vocab schema exist, connect to duckdb
        if os.path.isfile(cdm_schema_duckdb_file_path) and os.path.isfile(vocab_schema_duckdb_file_path):
            db = _get_duckdb_connection(
                cdm_schema_duckdb_file_path, schema, vocab_schema_duckdb_file_path, vocab_schema, connection_type)
            
            # Attach direct postgres connection, this is used by analytics-svc for cohort/cohort_definition table queries where it requires direct connection to postgres.
            if database_code in clients[DatabaseDialects.POSTGRES]:
                _attach_direct_postgres_connection_for_duckdb(db, database_code, connection_type)

            # In order for FTS to work, vocab schema has to be passed into DuckDBConnection
            # TODO: To remove vocab_schema as an input parameter after issue has been fixed
            # https://github.com/duckdb/duckdb/issues/13523
            connection = DuckDBConnection(db, vocab_schema)
        else:
            # Fallback connection to postgres
            logger.warning(
                f"Duckdb Inaccessible at following paths {cdm_schema_duckdb_file_path} OR {vocab_schema_duckdb_file_path}. Hence fallback to Postgres dialect connection"
            )
            connection = PGConnection(
                clients[DatabaseDialects.POSTGRES][database_code][connection_type])

    if connection:
        return connection
    else:
        # If no connection can be found
        raise Exception(
            f"Database connection not found for connection with dialect:{dialect}, database_code:{database_code}, schema:{schema}, ")


def _attach_direct_postgres_connection_for_duckdb(db: duckdb.DuckDBPyConnection, database_code: str, connection_type: ConnectionTypes):
    duckdb_pg_connection_type = "(TYPE postgres)"
    print("Attaching postgres as direct connection ")
    conn_details = extract_db_credentials(database_code)

    # Load postgres_scanner extension when attaching postgres as direct connection
    db.load_extension(Env.DUCKDB_POSTGRES_SCANNER_EXTENSION)
    db.execute(
        f"ATTACH 'host={conn_details['host']} port={conn_details['port']} dbname={conn_details['databaseName']} user={conn_details['user']} password={conn_details['password']}' AS direct_db_conn {duckdb_pg_connection_type}")


def _get_duckdb_connection(cdm_schema_duckdb_file_path: str, schema: str, vocab_schema_duckdb_file_path: str, vocab_schema: str, connection_type: ConnectionTypes) -> duckdb.DuckDBPyConnection:
    '''
    Get duckdb connection with both cdm and vocab schema attached
    '''
    duckdb_connection_type = "(READ_ONLY)" if connection_type == ConnectionTypes.READ else ""
    db = duckdb.connect()

    # Load FTS extension for all duckdb connections
    db.load_extension(Env.DUCKDB_FTS_EXTENSION)

    # Attach cdm schema in READ or WRITE connection depending on duckdb_connection_type
    db.execute(
        f"ATTACH '{cdm_schema_duckdb_file_path}' AS {schema} {duckdb_connection_type};")
    
    # For cases where cdm schema and vocab schema are different, attach as a separate database in duckdb
    if (cdm_schema_duckdb_file_path != vocab_schema_duckdb_file_path):
        # Attach vocab schema as READ_ONLY in all cases
        db.execute(
            f"ATTACH '{vocab_schema_duckdb_file_path}' AS {vocab_schema} (READ_ONLY);")
    return db

def get_cdw_config_duckdb_connection(database_code: str, schema: str, connection_type: ConnectionTypes) -> duckdb.DuckDBPyConnection:
    '''
    Get duckdb connection for cdw-config-svc
    First check if dynamically generated duckdb file is available, if not fallback to using built in duckdb file for cdw-config
    '''
    duckdb_connection_type = "(READ_ONLY)" if connection_type == ConnectionTypes.READ else ""
    duckdb_file_name = f"{database_code}_{schema}"
    duckdb_file_path = _resolve_cdw_config_duckdb_file_path(duckdb_file_name)

    db = duckdb.connect()
    # Attach cdm schema
    db.execute(
        f"ATTACH '{duckdb_file_path}' AS {schema} {duckdb_connection_type};")
    return db


def get_rewriter_from_dialect(dialect: str) -> Optional[rewrite.Rewriter]:
    class DefaultRewriterForPostgres(rewrite.Rewriter):
        def rewrite(self, sql: str) -> str:
            if sql.lower() == "select pg_catalog.version()":
                return "SELECT 'PostgreSQL 9.3' as version"
            else:
                return super().rewrite(sql)

    if dialect == DatabaseDialects.DUCKDB:
        return DefaultRewriterForPostgres(
            bv_dialects.BVDuckDB(), bv_dialects.BVDuckDB()
        )

    if dialect == DatabaseDialects.POSTGRES:
        return DefaultRewriterForPostgres(
            bv_dialects.BVPostgres(), bv_dialects.BVPostgres()
        )

    return None


def initialize_db_clients() -> CachedbDatabaseClients:
    cachedb_database_clients = {
        "hana": {},
        "postgresql": {}
    }

    # Dynamically fill up cachedb_database_clients with connection based on each entry in database_credentials
    database_codes_and_dialects = get_database_code_and_dialect_from_db_creds()

    for database_code, dialect in database_codes_and_dialects:
        # Initialize
        cachedb_database_clients[dialect][database_code] = {}
        cachedb_database_clients[dialect][database_code]["AuthenticationMode"] = GetAuthenticationTypePerDialect(database_code)
        cachedb_database_clients[dialect][database_code][ConnectionTypes.READ] = None
        cachedb_database_clients[dialect][database_code][ConnectionTypes.WRITE] = None

        if dialect == DatabaseDialects.POSTGRES:
            # Create read and write engines for postgres dialect only initially. 
            cachedb_database_clients[dialect][database_code][ConnectionTypes.READ] = GetDBConnection(database_code, ConnectionTypes.READ)
            cachedb_database_clients[dialect][database_code][ConnectionTypes.WRITE] = GetDBConnection(database_code, ConnectionTypes.WRITE)
    return cachedb_database_clients
