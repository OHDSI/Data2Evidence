from prefect import task
from prefect.logging import get_run_logger

from .config import CreateDuckdbDatabaseFileType


@task(log_prints=True)
def copy_schema_to_cache(con, dbdao: any, options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()
    logger.info(
        f"Copying FHIR tables from source schema '{options.schemaName}' to cache schema '{options.cacheSchemaName}'..."
    )
    created_tables = []
    try:
        con.execute(f'''CREATE SCHEMA IF NOT EXISTS "{options.databaseCode}"."{options.cacheSchemaName}";''')
        table_names = dbdao.get_table_names(options.schemaName)
        chunk_size = 10000
        for table in table_names:
            try:
                logger.info(f"Copying table: {table}")
                columns = dbdao.get_columns(options.schemaName, table)
                
                casted_columns = []
                for col in columns:
                    # if col.lower().endswith('text') or col.lower().endswith('_text'):
                    if col.lower() == 'content':
                        casted_columns.append(f"CAST({col} AS JSON) AS {col}")
                    else:
                        casted_columns.append(col)
                select_columns = ', '.join(casted_columns)
                count_sql = f'SELECT COUNT(*) FROM "{options.sourceDatabase}"."{options.schemaName}"."{table}"'
                con.execute(count_sql)
                total_rows = con.fetchone()[0]
                offset = 0
                first_chunk = True
                # Drop table if exists to ensure fresh copy
                con.execute(f'DROP TABLE IF EXISTS "{options.databaseCode}"."{options.cacheSchemaName}"."{table}"')
                while offset < total_rows:
                    limit_clause = f"LIMIT {chunk_size} OFFSET {offset}"
                    if first_chunk:
                        logger.info(f"Creating table: {table}")
                        create_sql = f'CREATE TABLE IF NOT EXISTS "{options.databaseCode}"."{options.cacheSchemaName}"."{table}" AS FROM (SELECT {select_columns} FROM "{options.sourceDatabase}"."{options.schemaName}"."{table}" {limit_clause})'
                    else:
                        logger.info(f"Inserting chunk into table: {table}")
                        create_sql = f'INSERT INTO "{options.databaseCode}"."{options.cacheSchemaName}"."{table}" SELECT {select_columns} FROM "{options.sourceDatabase}"."{options.schemaName}"."{table}" {limit_clause}'
                    con.execute(create_sql)
                    offset += chunk_size
                    first_chunk = False
                created_tables.append(table)
            except Exception as e:
                logger.error(
                        f"Table copy for table '{options.schemaName}'.'{table}' failed with error: {e}")
                raise e
        return created_tables
    except Exception as err:
        logger.error(
            f"Table copy failed with error: {err}")
        raise (err)

@task(log_prints=True)
def create_indexes_for_tables(con, dbdao, schema_name, created_tables):
    logger = get_run_logger()
    try:
        for table in created_tables:
            try:
                indexes = dbdao.get_indexes_for_table(schema_name, table)
                for index in indexes:
                    index_name = index.get("name")
                    column_names = index.get("column_names")
                    columns_str = ', '.join(column_names)
                    unique = index.get("unique")
                    if unique:
                        index_query = f"CREATE UNIQUE INDEX {index_name} ON {schema_name}.{table} ({columns_str})"
                    else:
                        index_query = f"CREATE INDEX {index_name} ON {schema_name}.{table} ({columns_str})"
                    logger.info(f"Running query: {index_query}")
                    try:
                        con.execute(index_query)
                    except Exception as idx_err:
                        logger.warning(f"Index creation failed for {schema_name}.{table}: {idx_err}")
                pk_index = dbdao.get_indexes_for_pk(schema_name, table)
                pk_index_name = pk_index.get("name")
                pk_index_columns = pk_index.get("constrained_columns")
                if pk_index_name is not None and pk_index_columns != []:
                    pk_index_query = f"CREATE UNIQUE INDEX {pk_index_name} ON {schema_name}.{table} ({', '.join(pk_index_columns)})"
                    logger.info(f"Running query: {pk_index_query}")
                    try:
                        con.execute(pk_index_query)
                    except Exception as pk_idx_err:
                        logger.warning(f"PK index creation failed for {schema_name}.{table}: {pk_idx_err}")
            except Exception as e:
                logger.error(f"Index creation for table '{schema_name}.{table}' failed with error: {e}")
    except Exception as err:
        logger.error(f"Index creation failed with error: {err}")
        raise (err)
