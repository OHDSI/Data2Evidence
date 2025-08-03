import duckdb

from prefect import task
from prefect.logging import get_run_logger

@task(log_prints=True)
def copy_schema_to_cache(con, dbdao: any, schema_name: str, create_for_cdw_config_validation: bool, is_trex_cache: bool = False):
    logger = get_run_logger()

    logger.info(
        f"Copying tables from schema '{schema_name}' into cache..."
    )

    # Get credentials for database code
    db_credentials = dbdao.tenant_configs
    
    try:
        con.execute(f"DROP SCHEMA IF EXISTS {schema_name};")            
        con.execute(f"""CREATE SCHEMA {schema_name};""")
        table_names = dbdao.get_table_names(schema_name)

        CHUNK_SIZE = 10000
        # copy tables from postgres to cache with data
        for table in table_names:
            try:
                columns = dbdao.get_columns(schema_name, table)
                casted_columns = []
                for col in columns:
                    if col.lower().endswith('text') or col.lower().endswith('_text'):
                        casted_columns.append(f"CAST({col} AS JSON) AS {col}")
                    else:
                        casted_columns.append(col)
                select_columns = ', '.join(casted_columns)
                print(table)
                print(select_columns)
                # Get total row count from source table
                count_sql = f"SELECT COUNT(*) FROM postgres_scan('host={db_credentials.host} port={db_credentials.port} dbname={db_credentials.databaseName} user={db_credentials.readUser} password={db_credentials.readPassword.get_secret_value()}', '{schema_name}', '{table}')"
                con.execute(count_sql)
                total_rows = con.fetchone()[0]
                offset = 0
                first_chunk = True
                while offset < total_rows:
                    limit_clause = f"LIMIT {CHUNK_SIZE} OFFSET {offset}"
                    if first_chunk:
                        create_sql = f"CREATE TABLE {schema_name}.{table} AS FROM (SELECT {select_columns} FROM postgres_scan('host={db_credentials.host} port={db_credentials.port} dbname={db_credentials.databaseName} user={db_credentials.readUser} password={db_credentials.readPassword.get_secret_value()}', '{schema_name}', '{table}') {limit_clause})"
                    else:
                        create_sql = f"INSERT INTO {schema_name}.{table} SELECT {select_columns} FROM postgres_scan('host={db_credentials.host} port={db_credentials.port} dbname={db_credentials.databaseName} user={db_credentials.readUser} password={db_credentials.readPassword.get_secret_value()}', '{schema_name}', '{table}') {limit_clause}"
                    con.execute(create_sql)
                    offset += CHUNK_SIZE
                    first_chunk = False
                # Create index based on index in db table
                indexes = dbdao.get_indexes_for_table(schema_name, table)

                # for index in indexes:
                #     index_name = index.get("name")
                #     column_names = index.get("column_names")
                #     columns_str = ', '.join(column_names)
                #     unique = index.get("unique")

                #     # by default indexes created on columns in asc order
                #     if unique:
                #         index_query = f"CREATE UNIQUE INDEX {index_name} ON fhir_trexpg.{schema_name}.{table} ({columns_str})"
                #     else:
                #         index_query = f"CREATE INDEX {index_name} ON fhir_trexpg.{schema_name}.{table} ({columns_str})"

                #     logger.info(f"Running query: {index_query}")
                #     con.execute(index_query)

                # pk_index = dbdao.get_indexes_for_pk(schema_name, table)
                # pk_index_name = pk_index.get("name")
                # pk_index_columns = pk_index.get("constrained_columns")

                # if pk_index_name is not None and pk_index_columns != []:
                #     pk_index_query = f"CREATE UNIQUE INDEX {pk_index_name} ON fhir_trexpg.{schema_name}.{table} ({', '.join(pk_index_columns)})"
                #     logger.info(f"Running query: {pk_index_query}")
                #     con.execute(pk_index_query)
            except Exception as e:
                logger.error(
                        f"Table and index copy for table '{schema_name}.{table}' failed with error: {e}f")
                raise e

    except Exception as err:
        logger.error(
            f"Table and index copy failed with error: {err}f")
        raise (err)
    else:
        logger.info(
            f"Schema '{schema_name}' succesfully copied into duckdb database file!")
