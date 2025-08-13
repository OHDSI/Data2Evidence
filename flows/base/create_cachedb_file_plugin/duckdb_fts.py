from typing import Union

from prefect import task
from prefect.logging import get_run_logger

from .config import DUCKDB_FULLTEXT_SEARCH_CONFIG, DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM


def get_duckdb_fts_creation_sql(dbname: str, schema_name: str, table_name: str, document_identifier: Union[str | int], columns: list[str]):
    # TODO: Add single quotes to ignore regex after upgrading to a duckdb version which has the fix. Ticket reference: https://github.com/alp-os/internal/issues/1115
    return f""" PRAGMA
        create_fts_index({dbname}.{schema_name}.{table_name},
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


@task(log_prints=True)
def create_duckdb_fts_index(con, dbdao: any, schema_name: str, tables_to_create_duckdb_fts_index: list[DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM]):
    '''
    Create duckdb full text search indexes based on columns specified in DUCKDB_FULLTEXT_SEARCH_CONFIG
    '''
    logger = get_run_logger()

    schema_tables = dbdao.get_table_names(schema_name, include_views=False)

    dbname = dbdao.database_code

    for vocab_table_name in tables_to_create_duckdb_fts_index:
        if vocab_table_name.value in schema_tables:
            logger.info(
                f"Creating duckdb fulltext search index for table: {vocab_table_name}...")

            config_document_identifier = DUCKDB_FULLTEXT_SEARCH_CONFIG[
                vocab_table_name.value]["document_identifier"]

            columns = dbdao.get_columns(schema_name, vocab_table_name.value)

            fts_creation_sql = get_duckdb_fts_creation_sql(
                dbname=dbname,
                schema_name=schema_name,
                table_name=vocab_table_name.value,
                document_identifier=DUCKDB_FULLTEXT_SEARCH_CONFIG[
                    vocab_table_name.value]["document_identifier"],
                columns=columns
            )

            # If document_identifier is not in table columns, add a new column fts_document_identifier_id which is a auto-increment integer column to act as the table's unique id column.
            # This is required as duckdb FTS requires a unique conlumn as the document identifier
            if config_document_identifier not in columns:
                logger.info(
                    f"Adding unique auto increment column...")
                sequence_name = f"{vocab_table_name.value}_id_sequence"
                con.execute(
                    f"CREATE SEQUENCE {dbname}.{schema_name}.{sequence_name} START 1;")
                con.execute(
                    f"ALTER TABLE {dbname}.{schema_name}.{vocab_table_name} ADD COLUMN {config_document_identifier} INTEGER DEFAULT nextval('{sequence_name}');")
                logger.info(
                    f"Colum successfully addded")

            con.execute(fts_creation_sql)
            # logger.info(
            #     f"Fulltext search index created successfully")
            logger.info(
                f"""Duckdb fulltext search indexes successfully created.""")
        else:
            logger.info(
                    f"Table {vocab_table_name.value} not found in schema {schema_name}. Skipping fulltext search index creation.")

        
