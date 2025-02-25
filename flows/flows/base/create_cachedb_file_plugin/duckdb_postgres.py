import duckdb

from prefect import task
from prefect.logging import get_run_logger

from flows.create_cachedb_file_plugin.utils import resolve_duckdb_file_path, DUCKDB_EXTENSIONS_FILEPATH


@task(log_prints=True)
def copy_postgres_to_duckdb(db_dao: any, duckdb_database_name: str, create_for_cdw_config_validation: bool):
    logger = get_run_logger()

    # Include views when creating duckdb file for cdw config validation
    table_names = db_dao.get_table_names(
        include_views=create_for_cdw_config_validation)

    # Get credentials for database code
    db_credentials = db_dao.tenant_configs

    duckdb_file_path = resolve_duckdb_file_path(duckdb_database_name, create_for_cdw_config_validation)
    
    # copy tables from postgres into duckdb
    for table in table_names:
        try:
            logger.info(f"Copying table: {table} from postgres into duckdb...")

            
            postgres_scan_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/postgres_scanner.duckdb_extension';
            with duckdb.connect(duckdb_file_path) as con:
                con.load_extension(postgres_scan_extension_path)
                # If create_for_cdw_config_validation is True, add a LIMIT 0 to select statement so that only an empty table is created
                limit_statement = "LIMIT 0" if create_for_cdw_config_validation else ""

                # Copy table and data
                result = con.execute(
                    f"""CREATE TABLE {duckdb_database_name}."{table}" AS FROM (SELECT * FROM postgres_scan('host={db_credentials.host} port={db_credentials.port} dbname={
                        db_credentials.databaseName} user={db_credentials.readUser} password={db_credentials.readPassword.get_secret_value()}', '{db_dao.schema_name}', '{table}') {limit_statement})"""
                ).fetchone()
                logger.info(f"{result[0]} rows copied")

                # Create index based on index in db table
                indexes = db_dao.get_indexes_for_table(table)

                for index in indexes:
                    index_name = index.get("name")
                    column_names = index.get("column_names")
                    columns_str = ', '.join(column_names)
                    unique = index.get("unique")

                    # by default indexes created on columns in asc order
                    if unique:
                        index_query = f"CREATE UNIQUE INDEX {index_name} ON {table} ({columns_str})"
                    else:
                        index_query = f"CREATE INDEX {index_name} ON {table} ({columns_str})"
                    
                    logger.info(f"Running query: {index_query}") 
                    con.execute(index_query)

                pk_index = db_dao.get_indexes_for_pk(table)
                pk_index_name = pk_index.get("name")
                pk_index_columns = pk_index.get("constrained_columns")
                
                if pk_index_name is not None and pk_index_columns != []:
                    pk_index_query = f"CREATE UNIQUE INDEX {pk_index_name} ON {table} ({', '.join(pk_index_columns)})"
                    logger.info(f"Running query: {pk_index_query}") 
                    con.execute(pk_index_query)

        except Exception as err:
            logger.error(f"Table and index creation for table '{table}' failed with error: {err}f")
            raise (err)
    logger.info("Postgres tables succesfully copied into duckdb database file")

    logger.info(
        f"""Duckdb database file: {duckdb_database_name} successfully created.""")
