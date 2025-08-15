from google.cloud import bigquery

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

    dbname = dbdao.database_code

    try:

        # if(is_trex_cache):
        #     con.execute(f"DROP SCHEMA IF EXISTS {schema_name};")            
        con.execute(f"""CREATE SCHEMA IF NOT EXISTS {schema_name};""")

        # Include views when creating duckdb file for cdw config validation

        table_names = dbdao.get_table_names(
            schema_name, include_views=create_for_cdw_config_validation)

        # copy tables from postgres to cache
        for table in table_names:
            try:
                result_proxy = con.execute(

                    f"""CREATE OR REPLACE TABLE {schema_name}.{table} AS FROM (SELECT * FROM postgres_scan('host={db_credentials.host} port={db_credentials.port} dbname={db_credentials.databaseName} user={db_credentials.readUser} password={db_credentials.readPassword.get_secret_value()}', '{schema_name}', '{table}') {limit_statement})"""
                )
                # # DuckDB's execute() returns None for DDL, so fetchone() is not always valid
                # if result_proxy is not None:
                #     result = result_proxy.fetchone()
                #     if result is not None:
                #         logger.info(f"{result[0]} rows copied from '{schema_name}.{table}'!")
                # else:
                #     logger.info(f"Table '{schema_name}.{table}' created (row count not available for DDL statements).")

                con.execute(f"SELECT COUNT(*) FROM {schema_name}.{table}")
                rows_copied = con.fetchall()[0][0]

                # Create index based on index in db table
                indexes = dbdao.get_indexes_for_table(schema_name, table)
                logger.info(
                f"'{table}' table from schema '{schema_name}' recreated with {rows_copied} rows.")

                for index in indexes:
                    index_name = index.get("name")
                    column_names = index.get("column_names")
                    columns_str = ', '.join(column_names)
                    unique = index.get("unique")

                    # by default indexes created on columns in asc order
                    if unique:
                        index_query = f"CREATE UNIQUE INDEX {index_name} ON {dbname}.{schema_name}.{table} ({columns_str})"
                    else:
                        index_query = f"CREATE INDEX {index_name} ON {dbname}.{schema_name}.{table} ({columns_str})"

                    logger.info(f"Running query: {index_query}")
                    con.execute(index_query)

                pk_index = dbdao.get_indexes_for_pk(schema_name, table)
                pk_index_name = pk_index.get("name")
                pk_index_columns = pk_index.get("constrained_columns")

                if pk_index_name is not None and pk_index_columns != []:
                    pk_index_query = f"CREATE UNIQUE INDEX {pk_index_name} ON {dbname}.{schema_name}.{table} ({', '.join(pk_index_columns)})"
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

@task(log_prints=True)
def copy_bigquery_schema_to_cache(con, dbdao: any, batch_size):
    logger = get_run_logger()
    # Get credentials for database code
    db_credentials = dbdao.tenant_configs
    schema_name = db_credentials.databaseName
    logger.info(
        f"Copying tables from schema '{schema_name}' into cache..."
    )
    try:
        con.execute(f"DROP SCHEMA IF EXISTS {schema_name};")            
        con.execute(f"""CREATE SCHEMA {schema_name};""")
        client = bigquery.Client(project=db_credentials.host)
        query = f"SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default, ordinal_position FROM `{db_credentials.host}.{db_credentials.databaseName}.INFORMATION_SCHEMA.COLUMNS` WHERE is_system_defined = 'NO' AND ordinal_position IS NOT NULL ORDER BY table_name, ordinal_position"
        bq_rows = client.query(query).result()
        # Get table schemas from BigQuery
        table_schemas = {}
        for row in bq_rows:
            table = row['table_name']
            if table not in table_schemas:
                table_schemas[table] = []
            table_schemas[table].append({
                'column_name': row['column_name'],
                'data_type': row['data_type'],
                'is_nullable': row['is_nullable']
            })

        # BigQuery to DuckDB/Postgres type mapping
        bq_to_pg_types = {
            "FLOAT64": "DOUBLE PRECISION",
            "INT64": "BIGINT",
            "STRING": "TEXT",
            "BOOL": "BOOLEAN",
            "BOOLEAN": "BOOLEAN",
            "DATE": "DATE",
            "TIMESTAMP": "TIMESTAMP",
        }

        # Create tables in DuckDB and copy data from BigQuery
        for table, columns in table_schemas.items():
            columns_ddl = ', '.join([
                f'"{col["column_name"]}" {bq_to_pg_types.get(col["data_type"], col["data_type"])}' + (" NULL" if col['is_nullable'] == 'YES' else " NOT NULL")
                for col in columns
            ])
            create_table_sql = f"CREATE TABLE IF NOT EXISTS {schema_name}.{table} ({columns_ddl});"
            logger.info(f"Creating table: {table}")
            con.execute(create_table_sql)

            # Fetch data from BigQuery in batches
            bq_data_query = f"SELECT * FROM `{db_credentials.host}.{db_credentials.databaseName}.{table}`"
            bq_data_iter = client.query(bq_data_query).result(page_size=10000)
            column_names = [col['column_name'] for col in columns]
            insert_sql = f"INSERT INTO {schema_name}.{table} ({', '.join([f'\"{c}\"' for c in column_names])}) VALUES ({', '.join(['%s'] * len(column_names))})"
            batch = []
            row_count = 0
            for row in bq_data_iter:
                batch.append(tuple(row[c] for c in column_names))
                if len(batch) >= batch_size:
                    logger.info(f"Inserting batch of {len(batch)} rows into {schema_name}.{table} (total so far: {row_count + len(batch)})")
                    con.executemany(insert_sql, batch)
                    row_count += len(batch)
                    batch = []
            # Insert any remaining rows
            if batch:
                logger.info(f"Inserting final batch of {len(batch)} rows into {schema_name}.{table} (total: {row_count + len(batch)})")
                con.executemany(insert_sql, batch)
                row_count += len(batch)
            logger.info(f"Total rows inserted for table {table}: {row_count}")

            # Always create indexes, regardless of data presence
            indexes = dbdao.get_indexes_for_table(schema_name, table)
            for index in indexes:
                index_name = index.get("name")
                column_names = index.get("column_names")
                columns_str = ', '.join(column_names)
                unique = index.get("unique")
                logger.info(f"Creating index: {index_name} on columns: {columns_str} for table {schema_name}.{table}")
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
    
    except Exception as err:
        logger.error(
            f"Table and index copy failed with error: {err}")
        raise (err)
    else:
        logger.info(
            f"Schema '{schema_name}' successfully copied into duckdb database file!")
