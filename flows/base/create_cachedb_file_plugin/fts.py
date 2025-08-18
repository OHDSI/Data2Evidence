from typing import Union

from prefect import task
from prefect.logging import get_run_logger

from .utils import get_tables_for_fts, get_document_identifier, execute_statement


@task(log_prints=True, task_run_name="create_fts_index_{schema}")
def create_fts_index(write_conn: any, 
                     read_conn: any, 
                     schema: str, 
                     fts_tables_input: list[str]):
    '''
    Create duckdb full text search indexes based on columns specified in tables_to_create_duckdb_fts_index
    '''
        
    logger = get_run_logger()
    logger.info(f"Starting FTS index creation for schema '{schema}'.")

    # Todo: Use copied tables from cache catalog
    logger.debug(f"Fetching tables from schema '{schema}' in '{read_conn.database_code}'.")
    copied_tables = read_conn.get_table_names(schema)

    logger.info(f"Found {len(copied_tables)} tables in schema '{schema}'.")

    tables_for_fts = get_tables_for_fts(fts_tables_input, copied_tables)
    logger.info(f"Tables selected for FTS index creation: {tables_for_fts}")

    for vocab_table in tables_for_fts:
        logger.info(f"Processing table '{vocab_table}' for FTS index creation.")

        config_document_identifier = get_document_identifier(vocab_table)
        logger.debug(f"Using document identifier '{config_document_identifier}' for table '{vocab_table}'.")

        existing_columns = read_conn.get_columns(schema, vocab_table)
        logger.debug(f"Existing columns in '{schema}.{vocab_table}': {existing_columns}")

        if config_document_identifier not in existing_columns:
            logger.info(f"Column '{config_document_identifier}' not found in '{schema}.{vocab_table}'. Adding auto-increment column.")

            sequence_name = f"{vocab_table}_id_sequence"
            logger.debug(f"Creating sequence '{sequence_name}' for table '{vocab_table}'.")
            execute_statement(write_conn, create_sequence_query(schema, sequence_name))
            logger.info(f"Sequence '{sequence_name}' created.")

            execute_statement(write_conn, add_autoincrement_col_query(
                schema_name=schema,
                table_name=vocab_table,
                column_name=config_document_identifier,
                sequence_name=sequence_name
            ))
            logger.info(f"Auto-increment column '{config_document_identifier}' added to '{schema}.{vocab_table}'.")

        fts_creation_sql = get_duckdb_fts_creation_sql(
            schema_name=schema,
            table_name=vocab_table,
            document_identifier=config_document_identifier,
            columns=existing_columns
        )
        logger.debug(f"FTS creation SQL for '{schema}.{vocab_table}': {fts_creation_sql}")

        fts_creation_time = execute_statement(write_conn, fts_creation_sql)
        logger.info(f"DuckDB FTS index created for table '{vocab_table}' in schema '{schema}'. Execution took {fts_creation_time} seconds.")

    logger.info(f"Completed FTS index creation for schema '{schema}'.")


def get_duckdb_fts_creation_sql(schema_name: str, 
                                table_name: str, 
                                document_identifier: Union[str | int], 
                                columns: list[str]) -> str:
    # Todo: Add single quotes to ignore regex after upgrading to a duckdb version which has the fix
    return f""" PRAGMA
        create_fts_index({schema_name}.{table_name},
            {document_identifier},
            {", ".join(columns)},
            stemmer='english', 
            stopwords='english', 
            ignore='(\\.|[^a-z0-9])+',
            ignore='(\\.|[^a-z0-9!@#$%^&*()\-`.+,\\\/"])+', 
            strip_accents=1, 
            lower=1, 
            overwrite=1)
        """

def create_sequence_query(schema_name: str, sequence_name: str) -> str:
    """
    Create a SQL query to create a sequence if it does not exist.
    """
    return f"CREATE OR REPLACE SEQUENCE {schema_name}.{sequence_name} START 1;"


def add_autoincrement_col_query(schema_name: str, table_name: str, column_name: str, sequence_name: str) -> str:
    """
    Create a SQL query to add an auto-increment column to a table.
    """
    return f"ALTER TABLE {schema_name}.{table_name} ADD COLUMN {column_name} INTEGER DEFAULT NEXTVAL('{schema_name}.{sequence_name}');"