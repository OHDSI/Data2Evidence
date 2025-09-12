from prefect import task
from prefect.logging import get_run_logger

from .utils import get_tables_for_fts, get_document_identifier, execute_statement
from .config import CopyParameters

@task(log_prints=True, task_run_name="create_fts_index_{copy_params.target_schema}")
def create_fts_index(
    write_conn: any,
    copy_params: CopyParameters,
):
    """
    Create duckdb full text search indexes based on columns specified in tables_to_create_duckdb_fts_index
    """
    target_schema = copy_params.target_schema
    target_database = copy_params.target_database

    logger = get_run_logger()
    logger.info(f"Starting FTS index creation for schema '{copy_params.target_schema}'.")

    # Fetch tables in schema
    logger.debug(
        f"Fetching copied tables from schema '{target_database}'.'{target_schema}'.."
    )

    write_conn.execute(get_table_names_query(target_database, target_schema))
    copied_tables = [table for (table,) in write_conn.fetchall()]

    logger.info(f"Found {len(copied_tables)} tables in schema '{copy_params.source_schema}'.")

    tables_for_fts = get_tables_for_fts(copy_params.fts_tables, copied_tables)
    logger.info(f"Tables selected for FTS index creation: {tables_for_fts}")

    for vocab_table in tables_for_fts:
        logger.info(f"Processing table '{vocab_table}' for FTS index creation.")

        config_document_identifier = get_document_identifier(vocab_table)
        logger.debug(
            f"Using document identifier '{config_document_identifier}' for table '{vocab_table}'."
        )

        write_conn.execute(get_column_names_query(target_database, target_schema, vocab_table))
        existing_columns = [column for (column,) in write_conn.fetchall()]

        logger.debug(
            f"Existing columns in '{target_database}'.'{target_schema}'.'{vocab_table}': {existing_columns}"
        )

        if config_document_identifier not in existing_columns:
            logger.info(
                f"Column '{config_document_identifier}' not found in '{target_database}.{target_schema}.{vocab_table}'. Adding auto-increment column."
            )

            sequence_name = f"{vocab_table}_id_sequence"
            logger.debug(
                f"Creating sequence '{sequence_name}' for table '{vocab_table}'."
            )
            execute_statement(
                write_conn,
                create_sequence_query(
                    target_database, target_schema, sequence_name
                ),
            )
            logger.info(f"Sequence '{sequence_name}' created.")

            execute_statement(
                write_conn,
                add_autoincrement_col_query(
                    database_name=target_database,
                    schema_name=target_schema,
                    table_name=vocab_table,
                    column_name=config_document_identifier,
                    sequence_name=sequence_name,
                ),
            )
            logger.info(
                f"Auto-increment column '{config_document_identifier}' added to '{target_schema}.{vocab_table}'."
            )

        fts_creation_sql = get_duckdb_fts_creation_sql(
            database_name=target_database,
            schema_name=target_schema,
            table_name=vocab_table,
            document_identifier=config_document_identifier,
            columns=existing_columns,
        )
        logger.debug(
            f"FTS creation SQL for '{target_schema}.{vocab_table}': {fts_creation_sql}"
        )

        fts_creation_time = execute_statement(write_conn, fts_creation_sql)
        logger.info(
            f"DuckDB FTS index created for table '{vocab_table}' in schema '{target_schema}'. Execution took {fts_creation_time} seconds."
        )

    logger.info(f"Completed FTS index creation for schema '{target_schema}'.")


def get_duckdb_fts_creation_sql(
    database_name: str,
    schema_name: str,
    table_name: str,
    document_identifier: str | int,
    columns: list[str],
) -> str:
    # Todo: Add single quotes to ignore regex after upgrading to a duckdb version which has the fix
    return f''' PRAGMA
        create_fts_index("{database_name}"."{schema_name}"."{table_name}",
            {document_identifier},
            {", ".join(columns)},
            stemmer='english', 
            stopwords='english',
            ignore='(\\.|[^a-z!@#$%^&*()\-`.+,\\\/"])+', 
            strip_accents=1, 
            lower=1, 
            overwrite=1)
        '''


def create_sequence_query(
    database_name: str, schema_name: str, sequence_name: str
) -> str:
    """
    Create a SQL query to create a sequence if it does not exist.
    """
    return f'CREATE OR REPLACE SEQUENCE "{database_name}"."{schema_name}"."{sequence_name}" START 1;'


def add_autoincrement_col_query(
    database_name: str,
    schema_name: str,
    table_name: str,
    column_name: str,
    sequence_name: str,
) -> str:
    """
    Create a SQL query to add an auto-increment column to a table.
    """
    return f'ALTER TABLE "{database_name}"."{schema_name}"."{table_name}" ADD COLUMN "{column_name}" INTEGER DEFAULT NEXTVAL("{database_name}"."{schema_name}"."{sequence_name}");'


def get_table_names_query(database_name: str, schema_name: str) -> str:
    """
    Create a SQL query to fetch table names from a schema.
    """
    return f"""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_catalog = '{database_name}'
        AND table_schema = '{schema_name}'
    """


def get_column_names_query(database_name: str, schema_name: str, table_name: str) -> str:
    """
    Create a SQL query to fetch table names from a schema.
    """
    return f"""
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_catalog = '{database_name}'
        AND table_schema = '{schema_name}'
        AND table_name = '{table_name}'
    """