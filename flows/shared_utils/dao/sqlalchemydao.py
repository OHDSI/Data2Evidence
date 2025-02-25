from functools import wraps
from typing import Any, Callable
from datetime import datetime
import pandas as pd
import re

import sqlalchemy as sql
from sqlalchemy.engine import Connection
from sqlalchemy.sql.selectable import Select
from sqlalchemy.types import Text, UnicodeText
from sqlalchemy.sql.schema import Table, Column
from sqlalchemy.engine.cursor import CursorResult
from sqlalchemy.schema import CreateSchema, DropSchema

from shared_utils.dao.daobase import DaoBase
from shared_utils.types import SupportedDatabaseDialects, UserType

class SqlAlchemyDao(DaoBase):
    """
    Using SQLAlchemy for implementation
    """
    
    def __init__(self, use_cache_db: bool, database_code: str,
                 user_type: UserType = UserType.ADMIN_USER,
                 schema_name: str = None, vocab_schema_name: str = None,
                 connect_to_duckdb = False, metadata = None):

        super().__init__(use_cache_db, database_code, user_type, schema_name, vocab_schema_name, connect_to_duckdb)
        self.metadata = sql.MetaData(self.schema_name)


    # --- Property methods ---
    @property
    def engine(self):
        # Todo: Switch to session in future task
        configs = self.tenant_configs
        match configs.dialect:
            case SupportedDatabaseDialects.HANA:
                database_name = configs.databaseName + \
                    f"?encrypt={configs.encrypt}?sslValidateCertificate={configs.validateCertificate}"
            case _:
                database_name = configs.databaseName

        # For connecting to cachedb
        if self.connect_to_duckdb:
            connection_string = self.create_cachedb_connection_url(
                user=configs.adminUser,
                host=configs.host,
                port=configs.port,
                database_name=database_name
            )
            return sql.create_engine(connection_string)

        connection_string, connect_args = self.create_sqlalchemy_connection_url(
            dialect=configs.dialect,
            auth_mode=configs.authMode,
            user=configs.adminUser,
            password=configs.adminPassword,
            host=configs.host,
            port=configs.port,
            database_name=database_name
        )
        return sql.create_engine(connection_string, connect_args=connect_args)

    
    @property
    def inspector(self):
        return sql.inspect(self.engine)

    # --- Create methods ---
    def create_schema(self, schema_name: str = None) -> None:
        schema = schema_name if schema_name else self.schema_name
        self.validate_schema_name(schema)
        with self.engine.connect() as connection:
            connection.execute(CreateSchema(schema))
            connection.commit()

    def create_table(self, table_name: str, columns: dict, schema_name: str = None):
        schema = schema_name if schema_name else self.schema_name
        metadata_obj = sql.MetaData(schema=schema)
        with self.engine.connect() as connection:
            new_table = sql.Table(table_name,
                                  metadata_obj,
                                  *(sql.Column(name, dtype) for name, dtype in columns.items())
                                  )
            metadata_obj.create_all(self.engine)
            connection.commit()

    
    # --- Read methods ---
    def check_schema_exists(self) -> bool:
        return self.inspector.has_schema(self.schema_name)
    
    def check_empty_schema(self) -> bool:
        schema = schema if schema else self.schema_name
        tables = self.get_table_names()
        return False if tables else True

    def check_table_exists(self, table: str) -> bool:
        return self.inspector.has_table(schema=self.schema_name, table_name=table)

    def get_table_names(self, include_views: bool = False) -> list[str]:
        tables = self.inspector.get_table_names(schema=self.schema_name)
        if include_views:
            views = self.inspector.get_view_names(schema=self.schema_name)
        else: views = []
        return tables + views

    def get_indexes_for_table(self, table: str) -> list[dict]:
        # Doesn't return indexes created on primary key
        return self.inspector.get_indexes(schema=self.schema_name, table_name=table)
        
    def get_indexes_for_pk(self, table: str) -> dict:
        # To get indexes created on primary key
        # returns { "constrained_columns": [str], "name": str, comment: str|None }
        return self.inspector.get_pk_constraint(schema=self.schema_name, table_name=table)
    
    def get_columns(self, table: str) -> list[str]:
        all_columns = self.inspector.get_columns(schema=self.schema_name, table_name=table)
        column_names = [col.get("name") for col in all_columns]
        return column_names

    def get_table_row_count(self, table: str) -> int:
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table(table, metadata_obj, autoload_with=connection)
            select_count_stmt = sql.select(sql.func.count()).select_from(table)
            row_count = connection.execute(select_count_stmt).scalar()   
        return row_count

    def get_distinct_count(self, table: str, column_name: str) -> int:
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table(table, metadata_obj,
                              autoload_with=connection)
            distinct_count = connection.execute(sql.func.count(
                sql.func.distinct(getattr(table.c, column_name)))).scalar()
        return distinct_count
    
    def get_last_executed_changeset(self) -> str:
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table("databasechangelog".casefold(), metadata_obj,
                              autoload_with=connection)
            filename_col = getattr(table.c, "filename".casefold())
            dateexecuted_col = getattr(table.c, "dateexecuted".casefold())
            select_stmt = sql.select(filename_col).order_by(
                sql.desc(dateexecuted_col)).limit(1)
            latest_changeset = connection.execute(select_stmt).scalar()
            return latest_changeset

    def get_datamodel_created_date(self) -> datetime:
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table("databasechangelog".casefold(), metadata_obj,
                              autoload_with=connection)
            dateexecuted_col = getattr(table.c, "dateexecuted".casefold())
            select_stmt = sql.select(dateexecuted_col).order_by(
                sql.asc(dateexecuted_col)).limit(1)
            created_date = connection.execute(select_stmt).scalar()
            return created_date

    def get_datamodel_updated_date(self) -> datetime:
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table("databasechangelog".casefold(), metadata_obj,
                              autoload_with=connection)
            dateexecuted_col = getattr(table.c, "dateexecuted".casefold())
            select_stmt = sql.select(dateexecuted_col).order_by(
                sql.desc(dateexecuted_col)).limit(1)
            updated_date = connection.execute(select_stmt).scalar()
            return updated_date
    
    def get_value(self, table_name: str, column_name: str) -> str:
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table(table_name, metadata_obj,
                              autoload_with=connection)
            stmt = sql.select(table.c[column_name]).select_from(table)
            value = connection.execute(stmt).scalar()
            return value

    def get_next_record_id(self, table_name: str, id_column_name: int) -> int:
        metadata_obj = sql.MetaData(schema=self.schema_name)
        table = sql.Table(table_name, metadata_obj,
                          autoload_with=self.engine)
        id_column = getattr(table.c, id_column_name.casefold())
        last_record_id_stmt = sql.select(sql.func.max(id_column))
        last_record_id = self.execute_sqlalchemy_statement(
            last_record_id_stmt, self.get_single_value)
        if last_record_id is None:
            return 1
        else:
            return int(last_record_id) + 1
    
    
    
    # --- Update methods ---  
    def update_cdm_version(self, cdm_version: str):
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table("cdm_source".casefold(), metadata_obj,
                              autoload_with=connection)
            cdm_source_col = getattr(table.c, "cdm_source_name".casefold())
            update_stmt = sql.update(table).where(
                cdm_source_col == self.schema_name).values(cdm_version=cdm_version)
            res = connection.execute(update_stmt)
            connection.commit()

    def insert_values_into_table(self, table_name: str, column_value_mapping: list[dict]):
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table(table_name, metadata_obj,
                              autoload_with=connection)
            res = connection.execute(table.insert(), column_value_mapping)
            connection.commit()
        
    def update_data_ingestion_date(self):
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            table = sql.Table("dataset_metadata".casefold(), metadata_obj,
                              autoload_with=connection)
            condition_col = getattr(table.c, "schema_name".casefold())
            update_stmt = sql.update(table).where(
                condition_col == self.schema_name).values(data_ingestion_date=datetime.now())
            print(
                f"Updating data ingestion date for schema {self.schema_name}")
            res = connection.execute(update_stmt)
            connection.commit()
            print(f"Updated data ingestion date for {self.schema_name}")


    # --- Delete methods ---
    def drop_schema(self, cascade: bool=True):
        with self.engine.connect() as connection:
            connection.execute(DropSchema(self.schema_name, cascade=cascade))
            connection.commit()

    def delete_records(self, table_name: str, conditions: list):
        metadata_obj = sql.MetaData(schema=self.schema_name)
        table = sql.Table(table_name, metadata_obj, autoload_with=self.engine)
        delete_from_conditions = sql.and_(*conditions)
        delete_from_statement = table.delete().where(delete_from_conditions)
        result = self.execute_sqlalchemy_statement(
            delete_from_statement, SqlAlchemyDao.return_affected_rowcounts
        )
        return result
    

    def truncate_table(self, table_name):
        with self.engine.connect() as connection:
            trans = connection.being()
            try:
                truncate_sql = sql.text(f"delete from {self.schema_name}.{table_name}")
                connection.execute(truncate_sql)
                trans.commit()
            except Exception as e:
                trans.rollback()
                print(f"Failed to truncate table '{self.schema_name}.{table_name}': {e}")
                raise e
            else:
                print(f"Table '{self.schema_name}.{table_name}' truncated successfully!")
                self.engine.dispose()
            



    # --- Static methods ---
    @staticmethod
    def return_affected_rowcounts(result) -> int:
        return result.rowcount
 
 
    def dispose_engine_after_use(func):
        """
        To dispose of engine
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract the engine from the class instance
            self = args[0]
            engine = getattr(self, 'engine', None)
            if engine is None:
                raise AttributeError("Class instance does not have an 'engine' attached.")
            
            try:
                # Execute the decorated method
                result = func(*args, **kwargs)
            finally:
                engine.dispose()
                print(f"engine disposed")
            return result
        return wrapper






    def get_sqlalchemy_columns(self, table_name: str, column_names: list[str]) -> dict[str, Column]:
        '''
        Returns a dictionary mapping column names to sqlalchemy Column objects
        '''
        with self.engine.connect() as connection:
            metadata_obj = self.metadata
            table = Table(table_name, metadata_obj, autoload_with=connection)            
            return {column_name: getattr(table.c, column_name.casefold()) for column_name in column_names}
        

    def execute_sqlalchemy_statement(self, sqlalchemy_statement, callback: Callable) -> Any | None:
        with self.engine.connect() as connection:
            res = connection.execute(sqlalchemy_statement)
            connection.commit()
            return callback(res)


    def check_user_exists(self, user: str) -> bool:
        with self.engine.connect() as connection:
            if self.dialect == SupportedDatabaseDialects.POSTGRES:
                select_stmt = sql.text("select * from pg_user where usename = :x")
                print(f"Executing check user exists statement..")
                res = connection.execute(select_stmt, {"x": user}).fetchall()
            elif SupportedDatabaseDialects.HANA:
                schema_name = "SYS"
                metadata_obj = sql.MetaData(schema=schema_name)
                table = Table("USERS".casefold(), metadata_obj,
                              autoload_with=connection)
                user_col = getattr(table.c, "USER_NAME".casefold())
                select_stmt = sql.select(table).where(user_col == user)
                print(f"Executing check user exists statement..")
                res = connection.execute(select_stmt).fetchall()
            if res == []:
                return False
            else:
                return True


    def check_role_exists(self, role_name: str) -> bool:
        with self.engine.connect() as connection:
            if self.dialect == SupportedDatabaseDialects.POSTGRES:
                select_stmt = sql.text("select * from pg_roles where rolname = :x")
                print(f"Executing check role exists statement..")
                res = connection.execute(
                    select_stmt, {"x": role_name}).fetchall()
            elif SupportedDatabaseDialects.HANA:
                schema_name = "SYS"
                metadata_obj = sql.MetaData(schema=schema_name)
                table = Table("ROLES".casefold(), metadata_obj,
                              autoload_with=connection)
                role_col = getattr(table.c, "ROLE_NAME".casefold())
                select_stmt = sql.select(table).where(role_col == role_name)
                print(f"Executing check role exists statement..")
                res = connection.execute(select_stmt).fetchall()
            if res == []:
                return False
            else:
                return True


    def create_read_role(self, role_name: str):
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                create_role_stmt = sql.text(f'CREATE ROLE {role_name}')
            case SupportedDatabaseDialects.HANA:
                create_role_stmt = sql.text(
                    f'CREATE ROLE {role_name} NO GRANT TO CREATOR')
        with self.engine.connect() as connection:
            print("Executing create read role statement..")
            create_role_res = connection.execute(
                create_role_stmt)
            connection.commit()
            print(f"{role_name} role Created Successfully")


    def create_user(self, user: str, password: str = None):
        if user == self.read_user:
            password = self.tenant_configs.get("readPassword")
        else:
            raise ValueError("Password cannot be empty")
        
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                create_user_stmt = sql.text(
                    f'CREATE USER {user} WITH PASSWORD "{password}"')
            case SupportedDatabaseDialects.HANA:
                create_user_stmt = sql.text(
                    f'CREATE USER {user} PASSWORD "{password}" NO FORCE_FIRST_PASSWORD_CHANGE')
        with self.engine.connect() as connection:
            print("Executing create user statement..")
            create_user_res = connection.execute(
                create_user_stmt)
            connection.commit()
            print(f"{user} User Created Successfully")

    def create_and_assign_role(self, user: str, role_name: str):
        with self.engine.connect() as connection:
            create_role_stmt = sql.text(f"CREATE ROLE {role_name}")
            print("Executing create role statement..")
            create_role_res = connection.execute(
                create_role_stmt)
            print(f"{role_name} role Created Successfully")

            grant_role_stmt = sql.text(f"GRANT {role_name} TO {user}")
            print("Executing grant role to user statement..")
            grant_role_res = connection.execute(
                grant_role_stmt, {"x": role_name, "y": user})
            connection.commit()
            print(f" {role_name} Role Granted to {user} User Successfully")

    def grant_read_privileges(self, role_name: str):
        match self.dialect:
            case SupportedDatabaseDialects.POSTGRES:
                grant_read_stmt = sql.text(f"""
                    GRANT USAGE ON SCHEMA {self.schema_name} TO {role_name};
                    GRANT SELECT ON ALL TABLES IN SCHEMA {self.schema_name} TO {role_name};
                    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA {self.schema_name} TO {role_name};
                    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA {self.schema_name} TO {role_name};
                    GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA {self.schema_name} TO {role_name};
                    ALTER DEFAULT PRIVILEGES IN SCHEMA {self.schema_name} GRANT SELECT ON TABLES TO {role_name};
                    ALTER DEFAULT PRIVILEGES IN SCHEMA {self.schema_name} GRANT USAGE, SELECT ON SEQUENCES TO {role_name};
                    ALTER DEFAULT PRIVILEGES IN SCHEMA {self.schema_name} GRANT EXECUTE ON FUNCTIONS TO {role_name};""")
            case SupportedDatabaseDialects.HANA:
                grant_read_stmt = sql.text(
                    f"GRANT SELECT, EXECUTE, CREATE TEMPORARY TABLE ON SCHEMA {self.schema_name} to {role_name}")
        with self.engine.connect() as connection:

            print("Executing grant read privilege statement..")
            grant_read_res = connection.execute(
                grant_read_stmt)
            connection.commit()
            print(f"Granted Read privileges Successfully")

    def grant_cohort_write_privileges(self, role_name: str):
        with self.engine.connect() as connection:
            grant_cohort_write_stmt = sql.text(
                f"GRANT DELETE, INSERT, UPDATE ON {self.schema_name}.cohort TO {role_name}")
            grant_cohort_def_write_stmt = sql.text(
                f"GRANT DELETE, INSERT, UPDATE ON {self.schema_name}.cohort_definition TO {role_name}")
            print("Executing grant cohort write privilege statement..")
            try:
                grant_cohort_write_res = connection.execute(
                    grant_cohort_write_stmt)
                grant_cohort_def_write_res = connection.execute(
                    grant_cohort_def_write_stmt)
                connection.commit()
            except Exception as e:
                raise e
            else:
                print(
                    f"Granted cohort and cohort definition Write privileges Successfully")
                


    def create_table_from_select(self, source_table: str, target_schema: str, target_table: str, columns_to_copy: list[str], filter_conditions: list) -> int:
                                
        sanitized_source_table = self.__sanitize_inputs(source_table)
        sanitized_target_table = self.__sanitize_inputs(target_table)
        sanitized_target_schema = self.__sanitize_inputs(target_schema)

        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            source_table = sql.Table(sanitized_source_table, metadata_obj,
                                        autoload_with=connection)
            
            select_statement = self.create_select_statement(source_table, columns_to_copy, filter_conditions)

            compiled_sql_query = str(select_statement.compile(compile_kwargs={"literal_binds": True}))
            
            create_from_select_statement = sql.text(f'''CREATE TABLE {sanitized_target_schema}.{sanitized_target_table} AS ({compiled_sql_query});''')
            row_count = connection.execute(create_from_select_statement).rowcount

        return row_count

    def copy_table_as_dataframe(self, source_table_name: str, columns_to_copy: list[str], filter_conditions: str) -> pd.DataFrame:
        # Construct select statements with filter conditions
        select_statement = self.create_select_statement(source_table_name, columns_to_copy, filter_conditions)
        df = pd.read_sql_query(select_statement, self.engine)
        return df

    def create_select_statement(self, table_name: str, columns_to_select: list[str], filter_conditions: list) -> Select:
        select_from_conditions = sql.and_(*filter_conditions)
        with self.engine.connect() as connection:
            metadata_obj = self.metadata
            source_table = sql.Table(table_name, metadata_obj,
                                        autoload_with=connection)
            
            match self.dialect:
                case SupportedDatabaseDialects.HANA:
                    # cast text columns to nclob
                    select_statement = sql.select(*map(lambda x: sql.cast(getattr(source_table.c, x), UnicodeText) if isinstance(source_table.c[x].type, Text) else getattr(source_table.c, x), columns_to_select)).where(select_from_conditions)

                case SupportedDatabaseDialects.POSTGRES:
                    select_statement = sql.select(*map(lambda x: getattr(source_table.c, x), columns_to_select)).where(select_from_conditions)
        
        return select_statement

    def copy_table(self, source_table_name: str, target_table_name: str, target_schema_name: str, columns_to_copy: list[str], filter_conditions: str) -> int:
        with self.engine.connect() as connection:
            metadata_obj = sql.MetaData(schema=self.schema_name)
            source_table = sql.Table(source_table_name, metadata_obj, autoload_with=connection)

            # Copy column from source_table including data type
            target_columns = [source_table.c[col].copy() for col in columns_to_copy]
            target_constraints = [constraint.copy() for constraint in source_table.constraints if set(constraint.columns.keys()).issubset(columns_to_copy)]
            target_metadata = sql.MetaData(schema=target_schema_name)
            target_table = sql.Table(target_table_name, target_metadata, *target_columns,*target_constraints, schema=target_schema_name)
            
            # Create the new table in the database
            target_metadata.create_all(self.engine, tables=[target_table])

            # Create indexes manually
            for index in source_table.indexes:
                index_name = index.name
                index_columns = [col.name for col in index.columns]

                if set(index_columns).issubset(set(columns_to_copy)):
                    column_objects = [target_table.c[column] for column in index_columns]
                    index = sql.Index(index_name, *column_objects)
                    index.create(connection)
            
            # Construct select statements with filter conditions
            select_statement = self.create_select_statement(source_table_name, columns_to_copy, filter_conditions)

            # Insert into target table from source table
            insert_statement = sql.insert(target_table).from_select(columns_to_copy, select_statement)
            
            result = connection.execute(insert_statement)
            connection.commit()
            
            if self.dialect == SupportedDatabaseDialects.POSTGRES:
                row_count = result.rowcount
            elif self.dialect == SupportedDatabaseDialects.HANA:
                select_count_stmt = sql.select(
                    sql.func.count()).select_from(target_table)
                row_count = connection.execute(
                    select_count_stmt).scalar()   
        return row_count