import duckdb
from typing import Union

from prefect import task
from prefect.logging import get_run_logger

from flows.create_cachedb_file_plugin.utils import resolve_duckdb_file_path, DUCKDB_EXTENSIONS_FILEPATH
from flows.create_cachedb_file_plugin.config import DUCKDB_FULLTEXT_SEARCH_CONFIG, DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM



def get_duckdb_fts_creation_sql(table_name: str, document_identifier: Union[str | int], columns: list[str]):
    # TODO: Add single quotes to ignore regex after upgrading to a duckdb version which has the fix. Ticket reference: https://github.com/alp-os/internal/issues/1115
    return f""" PRAGMA
    create_fts_index({table_name},
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
def create_duckdb_fts_index(db_dao: any, duckdb_database_name: str, tables_to_create_duckdb_fts_index: list[DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM], create_for_cdw_config_validation: bool):
    '''
    Create duckdb full text search indexes based on columns specified in DUCKDB_FULLTEXT_SEARCH_CONFIG
    '''
    logger = get_run_logger()

    fts_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/fts.duckdb_extension';

    for vocab_table_name in tables_to_create_duckdb_fts_index:
        logger.info(
            f"Creating duckdb fulltext search index for table:{vocab_table_name}...")
        config_document_identifier = DUCKDB_FULLTEXT_SEARCH_CONFIG[
            vocab_table_name]["document_identifier"]
        columns = db_dao.get_columns(vocab_table_name)

        fts_creation_sql = get_duckdb_fts_creation_sql(
            table_name=vocab_table_name,
            document_identifier=DUCKDB_FULLTEXT_SEARCH_CONFIG[vocab_table_name]["document_identifier"],
            columns=columns
        )

        duckdb_file_path = resolve_duckdb_file_path(
            duckdb_database_name, create_for_cdw_config_validation)
        with duckdb.connect(duckdb_file_path) as con:
            # If document_identifier is not in table columns, add a new column fts_document_identifier_id which is a auto-increment integer column to act as the table's unique id column.
            # This is required as duckdb FTS requires a unique conlumn as the document identifier
            if config_document_identifier not in columns:
                logger.info(
                    f"Adding unique auto increment column...")
                sequence_name = f"{vocab_table_name}_id_sequence"
                con.execute(f"CREATE SEQUENCE {sequence_name} START 1;")
                con.execute(
                    f"ALTER TABLE {vocab_table_name} ADD COLUMN {config_document_identifier} INTEGER DEFAULT nextval('{sequence_name}');")
                logger.info(
                    f"Colum successfully addded")
            con.load_extension(fts_extension_path)
            con.execute(fts_creation_sql)
            logger.info(
                f"Fulltext search index created successfully")
    logger.info(
        f"""Duckdb fulltext search indexes successfully created.""")
