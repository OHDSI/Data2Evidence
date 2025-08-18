from google.cloud import bigquery

from .utils import execute_statement
from .copy import create_schema_query, create_or_replace_table_query, create_index_query

from prefect import task
from prefect.logging import get_run_logger



@task(log_prints=True, task_run_name="copy_bigquery_schema_to_cache_{schema}")
def copy_bigquery_schema_to_cache(write_conn, 
                                  read_conn: any, 
                                  schema: str, 
                                  batch_size: int):
    logger = get_run_logger()

    # Get credentials for database code
    db_credentials = read_conn.tenant_configs

    logger.info(
        f"Copying tables from schema '{schema}' into cache..."
    )
    try:

        execute_statement(write_conn, create_schema_query(schema))
     
        client = bigquery.Client(project=db_credentials.host)
        query = f"SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default, ordinal_position FROM `{db_credentials.host}.{db_credentials.databaseCode}.INFORMATION_SCHEMA.COLUMNS` WHERE is_system_defined = 'NO' AND ordinal_position IS NOT NULL ORDER BY table_name, ordinal_position"
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
            create_table_sql = f"CREATE TABLE IF NOT EXISTS {schema}.{table} ({columns_ddl});"
            logger.info(f"Creating table: {table}")

            execute_statement(write_conn, create_table_sql)

            # Fetch data from BigQuery in batches
            bq_data_query = f"SELECT * FROM `{db_credentials.host}.{schema}.{db_credentials.databaseCode}.{table}`"
            bq_data_iter = client.query(bq_data_query).result(page_size=10000)
            column_names = [col['column_name'] for col in columns]
            insert_sql = f"INSERT INTO {schema}.{table} ({', '.join([f'\"{c}\"' for c in column_names])}) VALUES ({', '.join(['%s'] * len(column_names))})"
            batch = []
            row_count = 0
            for row in bq_data_iter:
                batch.append(tuple(row[c] for c in column_names))
                if len(batch) >= batch_size:
                    logger.info(f"Inserting batch of {len(batch)} rows into {schema}.{table} (total so far: {row_count + len(batch)})")
                    write_conn.executemany(insert_sql, batch)
                    row_count += len(batch)
                    batch = []
            # Insert any remaining rows
            if batch:
                logger.info(f"Inserting final batch of {len(batch)} rows into {schema}.{table} (total: {row_count + len(batch)})")
                write_conn.executemany(insert_sql, batch)
                row_count += len(batch)
            logger.info(f"Total rows inserted for table {table}: {row_count}")

            # Always create indexes, regardless of data presence
            indexes = read_conn.get_indexes_for_table(schema, table)
            for index in indexes:
                index_name = index.get("name")
                column_names = index.get("column_names")
                columns_str = ', '.join(column_names)
                unique = index.get("unique")
                logger.info(f"Creating index: {index_name} on columns: {columns_str} for table {schema}.{table}")
                if unique:
                    index_query = f"CREATE UNIQUE INDEX {index_name} ON {schema}.{table} ({columns_str})"
                else:
                    index_query = f"CREATE INDEX {index_name} ON {schema}.{table} ({columns_str})"
                logger.info(f"Running query: {index_query}")
                
                execute_statement(write_conn, index_query)

            pk_index = read_conn.get_indexes_for_pk(schema, table)
            pk_index_name = pk_index.get("name")
            pk_index_columns = pk_index.get("constrained_columns")
            if pk_index_name is not None and pk_index_columns != []:
                pk_index_query = f"CREATE UNIQUE INDEX {pk_index_name} ON {schema}.{table} ({', '.join(pk_index_columns)})"
                logger.info(f"Running query: {pk_index_query}")
                execute_statement(write_conn, pk_index_query)

    except Exception as err:
        logger.error(
            f"Table and index copy failed with error: {err}")
        raise (err)
    else:
        logger.info(
            f"Schema '{schema}' successfully copied into duckdb database file!")
