import ibis
import pandas as pd
from typing import Any
from datetime import datetime
from contextlib import contextmanager

from _shared_flow_utils.dao.sqlalchemydao import SqlAlchemyDao
from _shared_flow_utils.types import UserType, SupportedDatabaseDialects

class IbisDao(SqlAlchemyDao):
    """
    In Ibis-Framework for implementation:
    - schemas are referred to as databases
    - databases are referred to as catalogs
    - tables are referred to as schemas
    """
    
    def __init__(self, use_cache_db: bool, 
                 database_code: str,
                 user_type: UserType = UserType.ADMIN_USER,
                 plugin_name: str = "flow-plugin",
                 connect_to_duckdb = False, 
                 metadata = None):

        super().__init__(use_cache_db, database_code, user_type, plugin_name, connect_to_duckdb)

    # --- Create methods ---
    def create_schema(self, schema: str) -> None:
        self.validate_schema_name(schema)
        with self.ibis_connect() as con:
            con.create_database(schema)

    # Fallback to sqlalchemy because ibis cannot set length for str types
    # def create_table(self, table_name: str, columns: dict):
    #     """
    #     table_name:
    #         name of table to create
    #     columns:
    #         dictionary mapping of column name and python dtype 
        
    #     ```
    #     dbdao.create_table(table_name="test",
    #                         columns={
    #                             "id": int,
    #                             "value": str
    #                         })
    #     ```
    #     """
    #     table_schema = ibis.schema(columns)
    #     with self.ibis_connect() as con:
    #         con.create_table(name=table_name, 
    #                          schema=table_schema,
    #                          database=schema)


    def copy_table_as_dataframe(self, source_schema_name: str, source_table_name: str, 
                                columns_to_copy: list[str], filter_conditions: dict = None) -> pd.DataFrame:
        with self.ibis_connect() as con:
            table_obj = con.table(source_table_name, database=source_schema_name)
            query = table_obj.select(columns_to_copy)
            
            if "patient_filter" in filter_conditions:            
                person_id_column = filter_conditions["patient_filter"]["person_id_column"]
                patients_to_filter = filter_conditions["patient_filter"]["patients_to_filter"]
                query = query.filter(table_obj[person_id_column].isin(patients_to_filter))
            
            if "date_filter" in filter_conditions:
                timestamp_column = filter_conditions["date_filter"]["timestamp_column"]
                dates_to_filter = filter_conditions["date_filter"]["dates_to_filter"]
                query = query.filter(dates_to_filter >= table_obj[timestamp_column])
            
            copied_df = query.execute()
            return copied_df
        
    # --- Read methods ---
    def check_schema_exists(self, schema: str) -> bool:
        with self.ibis_connect() as con:
            schemas = con.list_databases()
        return schema in schemas


    def check_empty_schema(self, schema: str) -> bool:    
        # check if schema exists because ibis returns False even if schema doesn't exist
        schema_exists = self.check_schema_exists(schema)
        if not schema_exists:
            raise ValueError(f"Schema '{schema}' does not exist!")
        tables = self.get_table_names(schema)
        return False if tables else True


    def check_table_exists(self, schema: str, table: str) -> bool:
        tables = self.get_table_names(schema)
        return table in tables


    # Use sqlalchemy implementation as ibis lists cannot filter by table type 
    # def get_table_names(self, include_views: bool = False) -> list[str]:
    #     with self.ibis_connect() as con:
    #         tables = con.list_tables(database=schema)
    #     if not include_views:
    #         warn("Unable to filter out views from tables!")
    #     return tables
    
    
    def get_cdm_version_concept_id(self, vocab_schema: str, cdm_concept_code: str):
        with self.ibis_connect() as con:
            table_obj = con.table("concept", 
                                  database=vocab_schema)
            
            expr = table_obj.filter(
                table_obj.vocabulary_id == "CDM",
                table_obj.concept_class_id == "CDM",
                table_obj.concept_code == cdm_concept_code
                ).select(table_obj.concept_id)
            concept_id = expr.execute()
            return int(concept_id.iloc[0,0])
    
    def get_vocabulary_version(self, vocab_schema: str):
        with self.ibis_connect() as con:
            table_obj = con.table("vocabulary", 
                                  database=vocab_schema)
            
            expr = table_obj.filter(table_obj.vocabulary_id == "None").select(table_obj.vocabulary_version).order_by(ibis.desc(table_obj.vocabulary_version))
            vocab_version = expr.execute()
            return vocab_version.iloc[0,0]

    def get_columns(self, schema: str, table: str) -> list[str]:
        with self.ibis_connect() as con:
            table_obj = con.table(table, database=schema)
        return table_obj.columns
    

    def get_table_row_count(self, schema: str, table: str) -> int:
        with self.ibis_connect() as con:
            table_obj = con.table(table, database=schema)
            row_count = table_obj.count().execute()
        return int(row_count)


    def get_distinct_count(self, schema: str, table: str, column: str) -> int:
        with self.ibis_connect() as con:
            table_obj = con.table(table, database=schema)
            row_count = table_obj.group_by(column).count().count().execute()
        return int(row_count)
    

    def get_value(self, schema: str, table: str, column: str):
        """
        Fetch the first column of the first row, and close the result set.
        """
        with self.ibis_connect() as con:
            table_obj = con.table(table, database=schema)
            value = table_obj.select(column).execute()
            return value.iloc[0,0]


    def get_next_record_id(self, schema: str, table: str, id_column: str) -> int:
        with self.ibis_connect() as con:
            table_obj = con.table(table, database=schema)
            last_record_id = getattr(table_obj, id_column).max().execute()
            if last_record_id is None:
                return 1
            return last_record_id + 1

    def get_last_executed_changeset(self, schema: str) -> str:
        with self.ibis_connect() as con:
            table_obj = con.table("databasechangelog", database=schema)
            latest_record = table_obj.order_by([table_obj.dateexecuted.desc()]).limit(1)
            latest_changeset = latest_record.select("filename").execute()
            return latest_changeset.iloc[0,0]


    
    def get_datamodel_created_date(self, schema: str) -> datetime:
        with self.ibis_connect() as con:
            table_obj = con.table("databasechangelog", database=schema)
            first_record = getattr(table_obj, "dateexecuted").min().execute()
            return first_record.to_pydatetime()



    def get_datamodel_updated_date(self, schema: str) -> datetime:
        with self.ibis_connect() as con:
            table_obj = con.table("databasechangelog", database=schema)
            last_record = getattr(table_obj, "dateexecuted").max().execute()
            return last_record.to_pydatetime()
        

    # --- Update methods ---
    # Use sqlalchemy implementation
    # def insert_values_into_table(self, table_name: str, column_value_mapping: list[dict]):
        # This works for simple data
        # with self.ibis_connect() as con:
            # con.insert(table_name=table_name, 
            #            database=schema,
            #            obj=column_value_mapping)

        # Alternative implementation
        # Expects dict of scalar values to have an index
        # df = pd.DataFrame.from_records(column_value_mapping, index=[0])
        
        # with self.ibis_connect() as con:
        #     table_to_insert = con.table(name=table_name,
        #                                 database=schema)
        #     # Fill missing df columns with null
        #     for col in table_to_insert.columns:
        #         if col not in column_value_mapping.keys():
        #             column_value_mapping[col] = pd.NA
            
        #     df = pd.DataFrame.from_records(column_value_mapping, index=[0])      
            
        #     Ibis throws exception for null values
        #     con.insert(table_name=table_name, 
        #                database=schema,
        #                obj=df)
        

    # --- Delete methods ---
    def drop_schema(self, schema: str, cascade: bool = False):
        with self.ibis_connect() as con:
            con.drop_database(schema, cascade=cascade)

    def truncate_table(self, schema: str, table: str):
        with self.ibis_connect() as con:
            try:
                con.truncate_table(
                    table,
                    database=schema
                )
            except Exception as e:
                print(f"Failed to truncate table '{schema}.{table}': {e}")
                raise e
            else:
                print(f"Sucessfully truncated table '{schema}.{table}'")
                

    # --- Helper methods ---
    @contextmanager
    def ibis_connect(self):
        # Temporary as Ibis does not have a context manager yet
        con = None
        try:
            configs = self.tenant_configs
            if self.connect_to_duckdb:
                connection_string = self.create_cachedb_connection_url(
                    user=configs.adminUser,
                    host=configs.host,
                    port=configs.port,
                    database_name=configs.databaseName
                )
            else:
                connection_string = self.create_ibis_connection_url(
                    dialect=configs.dialect,
                    user=configs.adminUser,
                    password=configs.adminPassword.get_secret_value(),
                    host=configs.host,
                    port=configs.port,
                    database_name=configs.databaseName
                )            
            con = ibis.connect(connection_string)
            yield con
        finally:
            if con:
                con.disconnect()
                # gc.collect()
        
        # To check open cursors in pg: SELECT * FROM pg_cursors WHERE name = 'Crsr_IDs

        

    # --- Static methods ---


        
    # --- User methods ---
    def check_user_exists(self, user: str) -> bool:
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                select_stmt = f"""select * from pg_user where usename = :user"""
            case _:
                raise Exception(f"Unsupported dialect '{self.dialect}'!")

        parameterized_query = self.compile_sql_with_params(select_stmt, {"user": user})

        with self.ibis_connect() as con:
            if self.dialect == SupportedDatabaseDialects.POSTGRES:
                res = con.raw_sql(parameterized_query)

        if res == []:
            return False
        else:
            return True


    def check_role_exists(self, role_name: str) -> bool:
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                select_stmt = f"""select * from pg_roles where rolname = :role_name"""
            case _:
                raise Exception(f"Unsupported dialect '{self.dialect}'!")

        parameterized_query = self.compile_sql_with_params(sqlquery=select_stmt, bind_params={"role_name": role_name})
        
        with self.ibis_connect() as con:
            print(f"Executing check role exists statement..")
            res = con.raw_sql(parameterized_query).fetchall()

        if res == []:
            return False
        else:
            return True


    def create_read_role(self, role_name: str):
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                create_role_stmt = f"""CREATE ROLE {role_name}"""
            case _:
                raise Exception(f"Unsupported dialect {self.dialect}!")

        with self.ibis_connect() as con:
            print("Executing create read role statement..")
            create_role_res = con.raw_sql(create_role_stmt)
            print(f"{role_name} role Created Successfully")


    def create_user(self, user: str, password: str = None):
        if user == self.read_user:
            password = self.tenant_configs.get("readPassword")
        else:
            raise ValueError("Password cannot be empty")
    
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                create_user_stmt = f'''CREATE USER {user} WITH PASSWORD "{password}"'''

        with self.ibis_connect() as con:
            print("Executing create user statement..")
            create_user_res = con.raw_sql(create_user_stmt)
            print(f"{user} User Created Successfully")


    def create_and_assign_role(self, user: str, role_name: str):
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                create_role_stmt = f"""CREATE ROLE {role_name}"""
                grant_role_stmt = f"""GRANT {role_name} TO {user}"""

        
        with self.ibis_connect() as con:
            print("Executing create role statement..")
            create_role_res = con.raw_sql(create_role_stmt)
            print(f"{role_name} role Created Successfully")
             
            print("Executing grant role to user statement..")
            grant_role_res = con.raw_sql(grant_role_stmt)
            print(f" {role_name} Role Granted to {user} User Successfully")


    def grant_read_privileges(self, schema: str, role_name: str):
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                grant_read_stmt = f"""
                    GRANT USAGE ON SCHEMA {schema} TO {role_name};
                    GRANT SELECT ON ALL TABLES IN SCHEMA {schema} TO {role_name};
                    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA {schema} TO {role_name};
                    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA {schema} TO {role_name};
                    GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA {schema} TO {role_name};
                    ALTER DEFAULT PRIVILEGES IN SCHEMA {schema} GRANT SELECT ON TABLES TO {role_name};
                    ALTER DEFAULT PRIVILEGES IN SCHEMA {schema} GRANT USAGE, SELECT ON SEQUENCES TO {role_name};
                    ALTER DEFAULT PRIVILEGES IN SCHEMA {schema} GRANT EXECUTE ON FUNCTIONS TO {role_name};"""

        with self.ibis_connect() as con:
            print("Executing grant read privilege statement..")
            grant_read_res = con.raw_sql(grant_read_stmt)
            print(f"Granted Read privileges Successfully")


    def grant_cohort_write_privileges(self, schema: str, role_name: str):
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                grant_cohort_write_stmt = f"""GRANT DELETE, INSERT, UPDATE ON {schema}.cohort TO {role_name}"""
                grant_cohort_def_write_stmt = f"""GRANT DELETE, INSERT, UPDATE ON {schema}.cohort_definition TO {role_name}"""
        with self.ibis_connect() as con:
            print("Executing grant cohort write privilege statement..")
            try:
                grant_cohort_write_res = con.raw_sql(grant_cohort_write_stmt)
                grant_cohort_def_write_res = con.raw_sql(grant_cohort_def_write_stmt)
            except Exception as e:
                raise e
            else:
                print(
                    f"Granted cohort and cohort definition Write privileges Successfully")
