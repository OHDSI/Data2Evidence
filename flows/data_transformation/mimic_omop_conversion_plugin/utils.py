import os

def execute_raw_sql_from_file(conn, dir_root, sql_files, log_messages):
    logger = get_run_logger()
    try:
         for (sql_file, log_message) in zip(sql_files, log_messages):
            logger.info(log_message)
            with open(os.path.join(dir_root, sql_file), 'r') as file:
                query = file.read()
                conn.execute(query)
    except Exception as e:
        logger.error(f"Error executing {sql_file}: {str(e)}")
        raise Exception()

def create_schema(conn, schema_name:str):
    conn.execute(f"""
    DROP SCHEMA IF EXISTS {schema_name} CASCADE ;
    CREATE SCHEMA {schema_name} ;
    """)