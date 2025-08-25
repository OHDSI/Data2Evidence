import psycopg2
from pydantic import SecretStr
from contextlib import contextmanager


from prefect.variables import Variable
from prefect.blocks.system import Secret

from _shared_flow_utils.types import *
from _shared_flow_utils.dao.ibisdao import IbisDao
from _shared_flow_utils.dao.daobase import DialectDrivers


class TrexDao(IbisDao):
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
        return "trex"

    @property
    def tenant_configs(self) -> DBCredentialsType:
        return DBCredentialsType(
            readUser=Variable.get("trex_sql_user"),
            readPassword=SecretStr(Secret.load("trex-sql-password").get()),
            adminUser=Variable.get("trex_sql_user"),
            adminPassword=SecretStr(Secret.load("trex-sql-password").get()),
            user=Variable.get("trex_sql_user"),
            password=SecretStr(Secret.load("trex-sql-password").get()),
            dialect=SupportedDatabaseDialects.TREX,
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

    def _execute_sql(self, sql: str, fetch: bool = False):
        """Execute SQL using a context manager for connection and cursor."""
        with self._get_connection() as con:
            cur = None
            try:
                cur = con.cursor()
                cur.execute(sql)
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

    def drop_schema(self, schema: str, cascade: bool = True) -> None:
        sql = f"DROP SCHEMA IF EXISTS {schema} {'CASCADE' if cascade else 'RESTRICT'};"
        self._execute_sql(sql)

    def check_schema_exists(self, schema: str) -> bool:
        try:
            sql = "SELECT schema_name FROM information_schema.schemata;"
            result = self._execute_sql(sql, fetch=True)
            schemas = {row[0] for row in result}
            return schema in schemas
        except psycopg2.Error as e:
            raise

    def create_schema(self, schema: str) -> None:
        self.validate_schema_name(schema)
        sql = f"CREATE SCHEMA IF NOT EXISTS {schema};"
        self._execute_sql(sql)

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
