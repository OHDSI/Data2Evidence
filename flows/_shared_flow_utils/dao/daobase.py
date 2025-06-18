import os
import re
from typing import Optional, Tuple
from datetime import datetime
from abc import ABC, abstractmethod
from pydantic import BaseModel
from sqlalchemy import text

from prefect.variables import Variable
from prefect.blocks.system import Secret
from _shared_flow_utils.types import UserType, AuthToken
from _shared_flow_utils.api.PrefectAPI import build_user_from_token, get_auth_token_from_input, get_third_party_token_value

from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI
from _shared_flow_utils.types import SupportedDatabaseDialects, UserType, DBCredentialsType, CacheDBCredentialsType, AuthMode

# List of system schemas by database
SYSTEM_SCHEMAS = {
    "postgres": ["information_schema", "pg_catalog", "public"]
}

class DialectDrivers(BaseModel):
    class jdbc:
        postgres: str = "jdbc:postgresql"
        hana: str = "jdbc:sap"
        duckdb: str = "jdbc:duckdb"

    class sqlalchemy:
        postgres: str = "postgresql+psycopg2"
        hana: str = "hana+hdbcli"
        duckdb: str = "duckdb"

    class ibis:
        # Used for ibis
        postgres: str = "postgres"
        duckdb: str = "duckdb"

    class database_connector:
        postgres: str = "postgresql"
        hana: str = "hana"

    class cachedb:
        postgres: str = "postgresql"
        hana: str = "hana"
        duckdb: str = "duckdb"


class DaoBase(ABC):
    path_to_driver = "/app/inst/drivers"

    use_cache_db: bool = False
    database_code: str
    user_type: Optional[UserType] = UserType.ADMIN_USER

    def __init__(self,
                 use_cache_db: bool,
                 database_code: str,
                 user_type: UserType = UserType.ADMIN_USER,
                 connect_to_duckdb: bool = False):

        secret_block = Secret.load("database-credentials").get()
        if secret_block is None:
            raise ValueError(
                "'DATABASE_CREDENTIALS' secret block is undefined!")

        self.use_cache_db = use_cache_db
        self.database_code = database_code
        self.user_type = user_type
        self.connect_to_duckdb = connect_to_duckdb
    # --- Property methods ---

    @property
    def dialect(self):
        return self.tenant_configs.dialect

    @property
    def read_user(self):
        return self.tenant_configs.readUser

    @property
    def read_role(self):
        return self.tenant_configs.readRole

    @property
    def tenant_configs(self) -> DBCredentialsType | CacheDBCredentialsType:
        return self.__extract_database_credentials()
    
    def cachedb_tenant_configs(self,schema_name: str, vocab_schema_name: str) -> DBCredentialsType | CacheDBCredentialsType:
        database_credentials = self.__extract_database_credentials()
        if self.connect_to_duckdb == True:
            database_credentials.dialect = SupportedDatabaseDialects.DUCKDB.value
            database_credentials.databaseName = self.__create_cachedb_db_name(database_credentials, 
                                                                              schema_name, 
                                                                              vocab_schema_name)
            database_credentials.adminUser = database_credentials.readUser = "Bearer " + \
                OpenIdAPI().getClientCredentialToken()
            database_credentials.adminPassword = database_credentials.readPassword = "Qwerty"
            database_credentials.host = Variable.get("cachedb_host")
            database_credentials.port = Variable.get("cachedb_port")
            return CacheDBCredentialsType(**database_credentials.model_dump())

    # --- Create methods ---

    @abstractmethod
    def create_schema(self, schema: str):
        pass

    @abstractmethod
    def create_table(self, schema: str, table: str, columns: dict):
        pass

    # --- Read methods ---

    @abstractmethod
    def check_schema_exists(schema: str) -> bool:
        pass

    @abstractmethod
    def check_empty_schema(schema: str) -> bool:
        pass

    @abstractmethod
    def check_table_exists(self, schema: str, table: str) -> bool:
        pass

    @abstractmethod
    def get_table_names(self, schema: str, include_views=False) -> list[str]:
        pass

    @abstractmethod
    def get_columns(self, schema: str, table: str) -> list[str]:
        pass

    @abstractmethod
    def get_table_row_count(self, schema: str, table: str) -> int:
        pass

    @abstractmethod
    def get_distinct_count(self, schema: str, table: str, column: str) -> int:
        pass

    @abstractmethod
    def get_value(self, schema: str, table: str, column: str) -> str:
        pass

    @abstractmethod
    def get_next_record_id(self, schema: str, table: str, id_column: int) -> int:
        pass

    @abstractmethod
    def get_last_executed_changeset(self, schema: str) -> str:
        pass

    @abstractmethod
    def get_datamodel_created_date(self, schema: str) -> datetime:
        pass

    @abstractmethod
    def get_datamodel_updated_date(self, schema: str) -> datetime:
        pass

    # --- Update methods ---

    @abstractmethod
    def update_cdm_version(self, schema: str, cdm_version: str):
        pass

    @abstractmethod
    def insert_values_into_table(self, schema: str, table: str, column_value_mapping: list[dict]):
        pass

    # --- Delete methods ---

    @abstractmethod
    def drop_schema(self, schema: str, cascade: bool = False):
        pass

    @abstractmethod
    def truncate_table(self, schema: str, table: str):
        # Ibis already uses truncate_table
        pass

    # --- User methods ---

    @abstractmethod
    def check_user_exists(self, user: str) -> bool:
        pass

    @abstractmethod
    def check_role_exists(self, role_name: str) -> bool:
        pass

    @abstractmethod
    def create_read_role(self, role_name: str):
        pass

    @abstractmethod
    def create_user(self, user: str, password: str = None):
        pass

    @abstractmethod
    def create_and_assign_role(self, user: str, role_name: str):
        pass

    @abstractmethod
    def grant_read_privileges(self, schema: str, role_name: str):
        pass

    @abstractmethod
    def grant_cohort_write_privileges(self, schema: str, role_name: str):
        pass

    # --- Static methods ---
    @staticmethod
    def validate_schema_name(schema_name: str) -> None:
        if len(schema_name.encode('utf-8')) > 63:
            raise ValueError(
                f"Schema name '{schema_name}' should not exceed 63 bytes!")

    @staticmethod
    def create_ibis_connection_url(dialect: SupportedDatabaseDialects,
                                   database_name: str = None,
                                   user: str = None,
                                   password: str = None,
                                   host: str = None,
                                   port: int = None
                                   ) -> str:
        match dialect:
            case SupportedDatabaseDialects.DUCKDB:
                # "duckdb://" will connect to in-memory ephemeral database
                base_url = f"{getattr(DialectDrivers.ibis, dialect)}://{database_name}"
            case SupportedDatabaseDialects.HANA:
                raise ValueError(
                    f"'{SupportedDatabaseDialects.HANA}' database dialect not supported!")
            case _:
                base_url = f"{getattr(DialectDrivers.ibis, dialect)}://{user}:{password}@{host}:{port}/{database_name}"
        return base_url

    @staticmethod
    def create_sqlalchemy_connection_url(dialect: SupportedDatabaseDialects,
                                         database_name: str = None,
                                         auth_mode: AuthMode = AuthMode.PASSWORD,
                                         user: str = None,
                                         password: str = None,
                                         host: str = None,
                                         port: int = None) -> Tuple[str, dict]:
        match dialect:
            case SupportedDatabaseDialects.DUCKDB:
                base_url = f"{getattr(DialectDrivers.sqlalchemy, dialect)}://{database_name}"
            case _:
                base_url = f"{getattr(DialectDrivers.sqlalchemy, dialect)}://{host}:{port}/{database_name}"

        if dialect == SupportedDatabaseDialects.HANA:
            hana_connect_args = { "encrypt": True, "sslValidateCertificate": False }
            if auth_mode == AuthMode.JWT:
                # Prefect task to fetch token
                auth_token: AuthToken = get_auth_token_from_input()
                hana_connect_args["password"] = get_third_party_token_value(auth_token)
                
                # Add APPLICATION and APPLICATIONUSER as session variables for JWT
                app_name = f"d2e-{os.environ.get('plugin_name')}"
                token_user = build_user_from_token(get_third_party_token_value(auth_token=auth_token))
                base_url = f"{base_url}&sessionVariable:APPLICATION={app_name}&sessionVariable:APPLICATIONUSER={token_user.user_id}"
                return base_url, hana_connect_args
            if auth_mode == AuthMode.PASSWORD:
                hana_connect_args.update({"user": user, "password": password.get_secret_value()})
                return base_url, hana_connect_args

        return base_url, {"user": user, "password": password.get_secret_value()}

    def create_cachedb_connection_url(self,
                                      database_name: str = None,
                                      user: str = None,
                                      host: str = None,
                                      port: int = None) -> str:
        # postgresql used for all cachedb connections
        base_url = f"postgresql://{user.get_secret_value()}@{host}:{port}/{database_name}"
        return base_url

    def get_database_connector_connection_string(
        self,
        user_type: UserType,
        release_date: str = None,
    ):
        """
        Used for Database Connector package
        """

        database_credentials = self.tenant_configs
        database_connector_dialect = getattr(
            DialectDrivers.database_connector, database_credentials.dialect)
        dialect = database_credentials.dialect
        host = database_credentials.host
        port = database_credentials.port
        database_name = database_credentials.databaseName

        match dialect:
            case SupportedDatabaseDialects.POSTGRES:
                conn_url = f"{getattr(DialectDrivers.jdbc, dialect)}://{host}:{port}/{database_name}"
            case SupportedDatabaseDialects.HANA:
                encrypt = database_credentials.encrypt or "TRUE"
                validateCertificate = database_credentials.validateCertificate or "FALSE"
                conn_url = f"{getattr(DialectDrivers.jdbc, dialect)}://{host}:{port}?databaseName={database_name}&encrypt={encrypt}&validateCertificate={validateCertificate}"
                extra_config = f"&sessionVariable:TEMPORAL_SYSTEM_TIME_AS_OF={release_date}" if release_date else None
                conn_url += extra_config

        if database_credentials.authMode == AuthMode.JWT and dialect == SupportedDatabaseDialects.HANA:
            user = ""
            # Prefect task to fetch token
            auth_token: AuthToken = get_auth_token_from_input()
            
            # Add APPLICATION and APPLICATIONUSER as session variables for JWT
            app_name = f"d2e-{os.environ.get('plugin_name')}"
            token_user = build_user_from_token(get_third_party_token_value(auth_token=auth_token))
            conn_url_with_app = f"{conn_url}&sessionVariable:APPLICATION={app_name}&sessionVariable:APPLICATIONUSER={token_user.user_id}"
            
            return f"""connectionDetails <- DatabaseConnector::createConnectionDetails(dbms = '{database_connector_dialect}', connectionString = '{conn_url_with_app}', user = '{user}', password = '{get_third_party_token_value(auth_token)}', pathToDriver = '{DaoBase.path_to_driver}')"""

        else:
            match user_type:
                case UserType.ADMIN_USER:
                    user = database_credentials.adminUser
                    password = database_credentials.adminPassword
                case UserType.READ_USER:
                    user = database_credentials.readUser
                    password = database_credentials.readPassword

            return f"""connectionDetails <- DatabaseConnector::createConnectionDetails(dbms = '{database_connector_dialect}', connectionString = '{conn_url}', user = '{user}', password = '{password.get_secret_value()}', pathToDriver = '{DaoBase.path_to_driver}')"""

    @staticmethod
    def set_db_driver_env() -> str:
        """
        Updates path to driver class variable and returns R code
        """
        database_connector_jar_folder = DaoBase.path_to_driver
        set_jar_file_path = f"Sys.setenv(\'DATABASECONNECTOR_JAR_FOLDER\' = '{database_connector_jar_folder}')"
        return set_jar_file_path

    @staticmethod
    def compile_sql_with_params(sqlquery: str, bind_params: dict) -> str:
        """
        Compiles an sqlalchemy 

        e.g. select * from table where id = :id, {"id": 1}
        """
        if not bind_params:
            return sqlquery
        raw_sql = text(sqlquery).bindparams(
            **bind_params).compile(compile_kwargs={"literal_binds": True})
        return str(raw_sql)

    # --- Helper methods ---

    def __extract_database_credentials(self) -> DBCredentialsType:
        database_credentials_list = Secret.load("database-credentials").get()
        if not database_credentials_list:
            raise ValueError(f"'DATABASE_CREDENTIALS' secret is empty")
        _db = next(filter(lambda x: x["databaseCode"] ==
                   self.database_code, database_credentials_list), None)
        database_credentials = DBCredentialsType(**_db)
        match database_credentials.dialect:
            case SupportedDatabaseDialects.HANA:
                database_credentials.readRole = "TENANT_READ_ROLE"
            case SupportedDatabaseDialects.POSTGRES:
                database_credentials.readRole = "postgres_tenant_read_role"
            case _:
                dialect_err = f"Dialect {self.values['dialect']} not supported. Unable to find corresponding dialect read role."
                raise ValueError(dialect_err)
        return database_credentials

    def __create_cachedb_db_name(self, database_credentials: DBCredentialsType, 
                                 schema_name: str, vocab_schema_name: str) -> str:
        if database_credentials.dialect == SupportedDatabaseDialects.POSTGRES:
            database_credentials.dialect = "postgresql"
        match self.user_type:
            case UserType.READ_USER:
                connection_type = "read"
            case UserType.ADMIN_USER:
                connection_type = "write"
        db_name = f"B|{database_credentials.dialect}|{connection_type}|{self.database_code}"
        if database_credentials.dialect == SupportedDatabaseDialects.DUCKDB:
            db_name += f"|{schema_name}|{vocab_schema_name}"
        return db_name

    def __sanitize_inputs(self, input: str):
        # Allow only alphanumeric characters, underscores, and periods
        if not all(char.isalnum() or char in ("_", ".") for char in input):
            raise ValueError("Invalid characters in idenitifier")
        return re.sub(r'[^a-zA-Z0-9_.]', '', input)

    def _casefold(self, obj_name: str) -> str:
        if not obj_name.startswith("GDM."):
            return obj_name.casefold()
        else:
            return obj_name
