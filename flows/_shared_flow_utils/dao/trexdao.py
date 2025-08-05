import psycopg2
from _shared_flow_utils.types import UserType
from _shared_flow_utils.dao.ibisdao import IbisDao
from prefect.variables import Variable
from prefect.blocks.system import Secret

class TrexDao(IbisDao):
    def __init__(self, use_cache_db: bool, 
                 database_code: str,
                 user_type: UserType = UserType.ADMIN_USER,
                 is_study_results_db: bool = False,
                 metadata = None):

        super().__init__(use_cache_db, database_code, user_type, is_study_results_db)
            
    def connect(self):
        trex_conn = psycopg2.connect(
            host=Variable.get("trex_sql_host"),
            port=Variable.get("trex_sql_port"),
            user=Variable.get("trex_sql_user"),
            password='pencil',
            dbname=Variable.get("trex_sql_dbname")
        )
        return trex_conn
    
    def drop_schema(self, schema: str, cascade: bool = False) -> None:
        with self.connect() as con:
            sql = f"DROP SCHEMA IF EXISTS {schema};"
            with con.cursor() as cur:
                cur.execute(sql)
            con.commit()
        print(f"Schema '{schema}' dropped successfully.")
        
    def check_schema_exists(self, schema: str) -> bool:
        print(f"Checking if schema '{schema}' exists in database '{self.database_code}'")
        with self.connect() as con:
            sql = "SELECT schema_name FROM information_schema.schemata;"
            with con.cursor() as cur:
                cur.execute(sql)
                schemas = [row[0] for row in cur.fetchall()]
                print(f"Found schemas: {schemas}")
        return schema in schemas
    
    def create_schema(self, schema: str) -> None:
        self.validate_schema_name(schema)
        with self.connect() as con:
            sql = f"CREATE SCHEMA IF NOT EXISTS {schema};"
            with con.cursor() as cur:
                cur.execute(sql)
            con.commit()

