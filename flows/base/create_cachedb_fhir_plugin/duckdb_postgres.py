import duckdb

from prefect import task
from prefect.logging import get_run_logger

@task(log_prints=True)
def copy_schema_to_cache(con, dbdao: any, schema_name: str, create_for_cdw_config_validation: bool, is_trex_cache: bool = False):
    logger = get_run_logger()

    logger.info(
        f"Copying tables from schema '{schema_name}' into {'trex sql cache' if is_trex_cache else 'duckdb'}..."
    )

    # Get credentials for database code
    db_credentials = dbdao.tenant_configs

    # If create_for_cdw_config_validation is True, add a LIMIT 0 to select statement so that only an empty table is created
    limit_statement = "LIMIT 0" if create_for_cdw_config_validation else ""

    try:
        if(is_trex_cache):
            con.execute(f"DROP SCHEMA IF EXISTS {schema_name};")            
        con.execute(f"""CREATE SCHEMA {schema_name};""")
        # Include views when creating duckdb file for cdw config validation
        table_names = dbdao.get_table_names(
            schema_name, include_views=create_for_cdw_config_validation)

        # copy tables from postgres to cache
        for table in table_names:
            try:
                result_proxy = con.execute(
                    f"""CREATE TABLE {schema_name}.{table} AS FROM (SELECT * FROM postgres_scan('host={db_credentials.host} port={db_credentials.port} dbname={db_credentials.databaseName} user={db_credentials.readUser} password={db_credentials.readPassword.get_secret_value()}', '{schema_name}', '{table}') {limit_statement})"""
                )
                # DuckDB's execute() returns None for DDL, so fetchone() is not always valid
                if result_proxy is not None:
                    result = result_proxy.fetchone()
                    if result is not None:
                        logger.info(f"{result[0]} rows copied from '{schema_name}.{table}'!")
                else:
                    logger.info(f"Table '{schema_name}.{table}' created (row count not available for DDL statements).")

                # Create index based on index in db table
                indexes = dbdao.get_indexes_for_table(schema_name, table)

                for index in indexes:
                    index_name = index.get("name")
                    column_names = index.get("column_names")
                    columns_str = ', '.join(column_names)
                    unique = index.get("unique")

                    # by default indexes created on columns in asc order
                    if unique:
                        index_query = f"CREATE UNIQUE INDEX {index_name} ON {schema_name}.{table} ({columns_str})"
                    else:
                        index_query = f"CREATE INDEX {index_name} ON {schema_name}.{table} ({columns_str})"

                    logger.info(f"Running query: {index_query}")
                    con.execute(index_query)

                pk_index = dbdao.get_indexes_for_pk(schema_name, table)
                pk_index_name = pk_index.get("name")
                pk_index_columns = pk_index.get("constrained_columns")

                if pk_index_name is not None and pk_index_columns != []:
                    pk_index_query = f"CREATE UNIQUE INDEX {pk_index_name} ON {schema_name}.{table} ({', '.join(pk_index_columns)})"
                    logger.info(f"Running query: {pk_index_query}")
                    con.execute(pk_index_query)
            except Exception as e:
                logger.error(
                        f"Table and index copy for table '{schema_name}.{table}' failed with error: {err}f")
                raise e

    except Exception as err:
        logger.error(
            f"Table and index copy failed with error: {err}f")
        raise (err)
    else:
        logger.info(
            f"Schema '{schema_name}' succesfully copied into duckdb database file!")
