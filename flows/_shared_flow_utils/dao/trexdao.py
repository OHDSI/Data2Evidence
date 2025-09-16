from datetime import datetime
from pydantic import SecretStr
from contextlib import contextmanager

import psycopg2
from psycopg2 import sql as pg_sql

from prefect.variables import Variable
from prefect.blocks.system import Secret

from _shared_flow_utils.types import *
from _shared_flow_utils.dao.daobase import DaoBase
from _shared_flow_utils.dao.daobase import DialectDrivers



class TrexDao(DaoBase):
    def __init__(
        self,
        use_cache_db: bool,
        database_code: str,
        user_type: UserType = UserType.ADMIN_USER,
        is_study_results_db: bool = False,
    ):
        super().__init__(use_cache_db, database_code, user_type, is_study_results_db)

    @property
    def dialect(self):
        return SupportedDatabaseDialects.TREX.value

    @property
    def tenant_configs(self) -> DBCredentialsType:
        return DBCredentialsType(
            readUser=Variable.get("trex_sql_user"),
            readPassword=SecretStr(Secret.load("trex-sql-password").get()),
            adminUser=Variable.get("trex_sql_user"),
            adminPassword=SecretStr(Secret.load("trex-sql-password").get()),
            user=Variable.get("trex_sql_user"),
            password=SecretStr(Secret.load("trex-sql-password").get()),
            dialect=SupportedDatabaseDialects.TREX.value,
            databaseName=self.database_code,
            databaseCode=self.database_code,
            host=Variable.get("trex_sql_host"),
            port=int(Variable.get("trex_sql_port")),
            encrypt=False,
            validateCertificate=False,
            sslTrustStore=None,
            hostnameInCertificate="",
            enableAuditPolicies=False,
            readRole="",
            authMode=AuthMode.PASSWORD,
        )

    @contextmanager
    def _get_connection(self):
        """Get a PostgreSQL connection"""
        configs = self.tenant_configs
        con = None
        try:
            con = psycopg2.connect(
                host=configs.host,
                port=configs.port,
                user=configs.user,
                password=configs.password.get_secret_value(),
                dbname=self.database_code,
            )
            con.autocommit = True
            yield con
        except Exception:
            if con and not con.autocommit:
                con.rollback()
            raise
        else:
            con.commit()
        finally:
            if con:
                con.close()

    def execute_sql(self, sql: str, fetch: bool = False):
        """Execute SQL using a context manager for connection and cursor."""
        with self._get_connection() as con:
            cur = None
            try:
                cur = con.cursor()
                composed_query = sql.as_string(cur) if hasattr(sql, "as_string") else sql
                cur.execute(composed_query)
                if fetch:
                    return cur.fetchall()
                if not con.autocommit:
                    con.commit()
            except Exception:
                # Re-raise the original exception with preserved stack trace
                raise
            finally:
                if cur:
                    cur.close()


    # --- Create methods ---
    def create_schema(self, schema: str) -> None:
        self.validate_schema_name(schema)
        sql = pg_sql.SQL("CREATE SCHEMA IF NOT EXISTS {}") \
                .format(pg_sql.Identifier(schema))
        self.execute_sql(sql)


    def create_table(self, schema: str, table: str, columns: dict) -> None:
        pass


    # --- Read methods ---

    def check_schema_exists(self, schema: str) -> bool:
        try:
            sql = '''
                SELECT schema_name FROM information_schema.schemata
                WHERE catalog_name = current_database();
            '''
            result = self.execute_sql(sql, fetch=True)
            schemas = {row[0] for row in result}
            return schema in schemas
        except psycopg2.Error as e:
            raise


    def check_empty_schema(schema: str) -> bool:
        pass


    def check_table_exists(self, schema: str, table: str) -> bool:
        pass


    def get_table_names(self, schema: str, include_views=False) -> list[str]:
        pass


    def get_columns(self, schema: str, table: str) -> list[str]:
        pass


    def get_table_row_count(self, schema: str, table: str) -> int:
        sql = pg_sql.SQL("SELECT COUNT(*) FROM {schema}.{table}")\
            .format(
                schema=pg_sql.Identifier(schema),
                table=pg_sql.Identifier(table)
            )
        result = self.execute_sql(sql, fetch=True)
        return result[0][0]


    def get_distinct_count(self, schema: str, table: str, column: str) -> int:
        sql = pg_sql.SQL("SELECT COUNT(DISTINCT {column}) FROM {schema}.{table}")\
            .format(
                column=pg_sql.Identifier(column),
                schema=pg_sql.Identifier(schema),
                table=pg_sql.Identifier(table)
            )
        result = self.execute_sql(sql, fetch=True)
        return result[0][0]


    def get_value(self, schema: str, table: str, column: str) -> str:
        sql = pg_sql.SQL("SELECT {column} FROM {schema}.{table} LIMIT 1")\
            .format(
                column=pg_sql.Identifier(column),
                schema=pg_sql.Identifier(schema),
                table=pg_sql.Identifier(table)
            )
        result = self.execute_sql(sql, fetch=True)
        return result[0][0]

    def get_next_record_id(self, schema: str, table: str, id_column: int) -> int:
        pass

    def get_last_executed_changeset(self, schema: str) -> str:
        pass

    def get_datamodel_created_date(self, schema: str) -> datetime:
        pass


    def get_datamodel_updated_date(self, schema: str) -> datetime:
        pass

    # --- Update methods ---

    def update_cdm_version(self, schema: str, cdm_version: str):
        pass

    def insert_values_into_table(
        self, schema: str, table: str, column_value_mapping: list[dict]
    ):
        pass


    # --- Delete methods ---
    def drop_schema(self, schema: str, cascade: bool = False):
        sql = f"DROP SCHEMA IF EXISTS {schema} {'CASCADE' if cascade else 'RESTRICT'};"
        self.execute_sql(sql)


    def truncate_table(self, schema: str, table: str):
        pass

    def get_database_connector_connection_string(
        self, user_type: UserType = UserType.ADMIN_USER, release_date: str = None
    ) -> str:
        """
        Generate R DatabaseConnector connection string for Trex PostgreSQL database.
        For TrexDao, user_type and release_date are ignored since we use fixed Trex credentials.
        """

        host = self.tenant_configs.host
        port = self.tenant_configs.port
        user = self.tenant_configs.user
        password = self.tenant_configs.password.get_secret_value()

        # Use jdbc:postgresql for DatabaseConnector
        conn_url = f"{DialectDrivers.jdbc.trex}://{host}:{port}/{self.database_code}?preferQueryMode=simple&autocommit=true"

        return f"""connectionDetails <- DatabaseConnector::createConnectionDetails(dbms = '{DialectDrivers.database_connector.trex}', connectionString = '{conn_url}', user = '{user}', password = '{password}', pathToDriver = '{self.path_to_driver}')"""
