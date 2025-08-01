from google.cloud import bigquery

from prefect import task
from prefect.logging import get_run_logger

@task(log_prints=True)
def copy_schema_to_cache(con, dbdao: any):
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

            # Fetch data from BigQuery
            bq_data_query = f"SELECT * FROM `{db_credentials.host}.{db_credentials.databaseName}.{table}`"
            bq_data = client.query(bq_data_query).result()
            # Remove none_to_null and use direct value
            rows = [tuple(row[col['column_name']] for col in columns) for row in bq_data]
            print(f"Rows extracted for table {table}: {len(rows)}")
            if rows:
                valid_rows = rows
                mismatch_count = sum(1 for r in valid_rows if len(r) != len(columns))
                if mismatch_count > 0:
                    msg = f"Error: {mismatch_count} rows have a column count mismatch in table {table} (expected {len(columns)} columns)"
                    print(msg)
                    raise ValueError(msg)
                if valid_rows:
                    column_names = ', '.join([f'"{col["column_name"]}"' for col in columns])
                    placeholders = ', '.join(['%s'] * len(columns))
                    insert_sql = f"INSERT INTO {schema_name}.{table} ({column_names}) VALUES ({placeholders})"
                    logger.info(f"Inserting {len(valid_rows)} rows into {schema_name}.{table}")
                    con.executemany(insert_sql, valid_rows)
                else:
                    print(f"No valid rows to insert for table {table} (all rows had column mismatch)")
            else:
                print(f"No rows found for table {table}, skipping insert.")

            # TEST QUERY: Fetch and print a few rows from the person table after insert
            # if table == "person":
            #     test_query = f"SELECT * FROM {schema_name}.person LIMIT 5;"
            #     logger.info(f"Running test query: {test_query}")
            #     try:
            #         # Use the connection if it has cursor(), else use as-is (for DB-API compatibility)
            #         if hasattr(con, 'cursor') and not hasattr(con, 'execute'):  # e.g., SQLAlchemy connection
            #             cursor = con.cursor()
            #             cursor.execute(test_query)
            #         elif hasattr(con, 'cursor') and hasattr(con, 'execute') and not isinstance(con, type(con.cursor())):
            #             cursor = con.cursor()
            #             cursor.execute(test_query)
            #         else:
            #             cursor = con
            #             cursor.execute(test_query)
            #         test_rows = cursor.fetchall()
            #         print(f"Sample rows from {schema_name}.person:")
            #         for row in test_rows:
            #             print(row)
            #     except Exception as test_err:
            #         print(f"Test query failed: {test_err}")

                # Create index based on index in db table
                indexes = dbdao.get_indexes_for_table(schema_name, table)

                for index in indexes:
                    index_name = index.get("name")
                    column_names = index.get("column_names")
                    columns_str = ', '.join(column_names)
                    unique = index.get("unique")
                    print(f"Creating index: {index_name} on columns: {columns_str} for table {schema_name}.{table}")
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
    
    except Exception as err:
        logger.error(
            f"Table and index copy failed with error: {err}")
        raise (err)
    else:
        logger.info(
            f"Schema '{schema_name}' successfully copied into duckdb database file!")
