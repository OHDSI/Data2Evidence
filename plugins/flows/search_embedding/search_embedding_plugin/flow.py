import pandas as pd
import os
from transformers import AutoTokenizer, AutoModel
import duckdb
import torch
import time
from concurrent.futures import ThreadPoolExecutor
import sqlalchemy as sqla

from prefect import flow, task
from prefect.logging import get_run_logger
from prefect.variables import Variable

from .types import *
from .utils import *
from _shared_flow_utils.dao.DBDao import DBDao, SupportedDatabaseDialects

os.environ['plugin_name'] = 'search_embedding_plugin'

# Define global variables for shared configurations
device = 'cuda' if torch.cuda.is_available() else 'cpu'
if device == 'cpu':
    torch.set_num_threads(max(1, (os.cpu_count() or 1) // 2))
tokenizer = AutoTokenizer.from_pretrained("Supabase/gte-small")
model = AutoModel.from_pretrained("Supabase/gte-small", attn_implementation="sdpa").to(device).eval()
embedding_col_name = 'concept_name_embedding'
index_col = 'embedding_cos_idx'

@flow(log_prints=True)
def search_embedding_plugin(options: SearchEmbeddingType):
    logger = get_run_logger()
    logger.info(f'Device: {device} | PyTorch threads: {torch.get_num_threads()}')
    schema_name = options.schema_name
    database_code = options.database_code
    cache_id = options.cache_id
    use_trex_connection = options.use_trex_connection
    chunksize = options.chunksize
    db_parameters = {
        'database_code': database_code,
        'cache_id': cache_id,
        'use_cache_db': False
    }
    if use_trex_connection:
        # -------------------- Trex connection to cache --------------------
        dbdao = DBDao(**db_parameters)
        if dbdao.dialect == SupportedDatabaseDialects.HANA:
            create_embeddings_hana(dbdao, database_code, schema_name, chunksize)
        else:
            db_parameters['dialect'] = SupportedDatabaseDialects.TREX
            dbdao = DBDao(**db_parameters)
            ## Vss extension is installed by default in trex, just need to load it before use
            dbdao.execute_sql("LOAD vss")
            create_embeddings_cache(dbdao, schema_name, chunksize)
    else:
        # -------------------- Direct file connection to cache --------------------
        duckdb_file_path = resolve_duckdb_file_path(database_code, Variable.get("duckdb_data_folder"))
        vss_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/vss.duckdb_extension';
        with duckdb.connect(duckdb_file_path) as conn:
            conn.load_extension(vss_extension_path)
            create_embeddings_duckdb(conn, schema_name, chunksize)

@task(log_prints=True, task_run_name="embedding_concept_table_hana_{schema_name}.concept")
def create_embeddings_hana(dbdao_hana, database_code, schema_name, chunksize):
    """
    HANA flow: stream concept_id/concept_name from the HANA source via a
    SQLAlchemy server-side cursor, then write
    (concept_id, concept_name_embedding) into the DuckDB cache via a Trex
    pgwire connection. HANA is the read side, the cache is the write side.
    """

    logger = get_run_logger()
    logger.info("***************** Start embedding (HANA -> cache) *****************")

    # schema_name is an identifier (cannot be a bind parameter), so let
    # SQLAlchemy's HANA dialect quote/escape it instead of f-stringing raw.
    quoted_schema = dbdao_hana.engine.dialect.identifier_preparer.quote_schema(schema_name)
    select_sql = sqla.text(f'SELECT CONCEPT_ID, CONCEPT_NAME FROM {quoted_schema}.CONCEPT')
    count_sql = sqla.text(f'SELECT COUNT(*) FROM {quoted_schema}.CONCEPT')

    cache_dao = DBDao(dialect=SupportedDatabaseDialects.TREX, use_cache_db=False, database_code=database_code)
    cache_dao.execute_sql("LOAD vss")

    embedding_table = 'concept_name_embeddings'
    embedding_cols = {'concept_id': 'INTEGER', embedding_col_name: 'FLOAT[384]'}
    db_schema = f"{database_code}.{schema_name}"

    # Stream HANA rows server-side
    with dbdao_hana.engine.connect().execution_options(stream_results=True) as conn:
        total_row = conn.execute(count_sql).scalar()
        result = conn.execute(select_sql)

        def hana_batches():
            for partition in result.partitions(chunksize):
                yield [row[0] for row in partition], [row[1] for row in partition]

        batch_embedding_concept_table(
            hana_batches(), total_row, tokenizer, model, device,
            cache_dao, db_schema, embedding_table, embedding_cols,
        )

    drop_embedding_index(cache_dao, db_schema, index_col)
    create_embedding_index(cache_dao, db_schema, embedding_table, embedding_col_name, index_col)
    logger.info("***************** HANA embedding cache complete *****************")


@task(log_prints=True, task_run_name="embedding_concept_table_{schema_name}.concept")
def create_embeddings_cache(dbdao, schema_name, chunksize):
    logger = get_run_logger()
    logger.info("***************** Start embedding *****************")
    logger.info(f'Loading concept table from cache for schema {schema_name}')

    total_row = dbdao.execute_sql(
        f'SELECT COUNT(*) FROM {schema_name}.concept', fetch=True
    )[0][0]

    embedding_table = 'concept_name_embeddings'
    embedding_cols = {'concept_id': 'int', embedding_col_name: 'FLOAT[384]'}

    # Stream the concept table via psycopg2 fetchmany
    def cache_batches():
        with dbdao._get_connection() as con:
            with con.cursor() as cur:
                cur.execute(f'SELECT concept_id, concept_name FROM {schema_name}.concept')
                while True:
                    rows = cur.fetchmany(chunksize)
                    if not rows:
                        break
                    yield [r[0] for r in rows], [r[1] for r in rows]

    batch_embedding_concept_table(
        cache_batches(), total_row, tokenizer, model, device,
        dbdao, schema_name, embedding_table, embedding_cols,
    )

    drop_embedding_index(dbdao, schema_name, index_col)
    create_embedding_index(dbdao, schema_name, embedding_table, embedding_col_name, index_col)
    logger.info("***************** Cache embedding complete *****************")

    
@task(log_prints=True, task_run_name="embedding_concept_table_duckdb")
def create_embeddings_duckdb(conn, schema_name, chunksize, tmp_embedding_table='tmp_embeddings'):
    logger = get_run_logger()
    logger.info("***************** Start embedding *****************")
    logger.info(f'Loading concept table from duckdb for schema {schema_name}')

    total = conn.execute(f'SELECT COUNT(*) FROM "{schema_name}".concept').fetchone()[0]

    ## Create temporary table for embeddings
    conn.execute(f'DROP TABLE IF EXISTS "{schema_name}"."{tmp_embedding_table}"')
    conn.execute(f'CREATE TABLE "{schema_name}"."{tmp_embedding_table}" (concept_id int, vec FLOAT[384]);')

    ## Stream concept rows in Arrow RecordBatches of ~chunksize rows so we
    ## never materialize the full 6M-row table in memory.
    reader = conn.execute(
        f'SELECT concept_id, concept_name FROM "{schema_name}".concept'
    ).fetch_record_batch(chunksize)

    processed = 0
    for batch in reader:
        concept_id = batch.column('concept_id').to_pylist()
        concept_name = batch.column('concept_name').to_pylist()
        embeddings = embedding_concept_table(concept_name, tokenizer, model, device).tolist()
        rst = pd.DataFrame({'concept_id': concept_id, 'embedding': embeddings})
        ## Insert embedding into tmp embedding table
        conn.execute(f"INSERT INTO {schema_name}.{tmp_embedding_table} SELECT concept_id, embedding FROM rst")
        processed += len(concept_id)
        percent = round(processed / total * 100, 2) if total else 100.0
        logger.info(f'{percent} % completed ({processed}/{total})')

    logger.info("***************** Insert embedding *****************")
    ## Check if column exists using parameterized query
    column_exists = check_duckdb_column_exists(conn, f"{schema_name}.concept", embedding_col_name)
    if not column_exists:
        conn.execute(f"ALTER TABLE \"{schema_name}\".concept ADD COLUMN {embedding_col_name} FLOAT[384];")

    conn.execute(f"DROP INDEX IF EXISTS \"{schema_name}\".{index_col};")

    conn.execute(f"""
        UPDATE \"{schema_name}\".concept AS c
        SET {embedding_col_name} = t.vec
        FROM \"{schema_name}\".\"{tmp_embedding_table}\" AS t
        WHERE c.concept_id = t.concept_id;
        """)

    conn.execute(f"DROP TABLE \"{schema_name}\".\"{tmp_embedding_table}\";")

    conn.execute("SET hnsw_enable_experimental_persistence=TRUE;")
    conn.execute(f"CREATE INDEX {index_col} ON \"{schema_name}\".concept USING HNSW ({embedding_col_name}) WITH (metric = 'cosine')")

def batch_embedding_concept_table(batch_iter, total_rows, tokenizer, model, device, dbdao, schema_name, embedding_table, embedding_cols):
    """
    Stream-embed concept rows into `schema_name.embedding_table`.

    Args:
        batch_iter:   Iterable yielding (concept_ids, concept_names) tuples
        total_rows:   Total row count for progress logging; None if unknown.
        dbdao:        DAO with `batch_insert_values` — the write target.
        schema_name:  Schema holding the embedding_table.
        embedding_table: Destination table for (concept_id, embedding) rows.
        embedding_cols:  Column-name -> SQL-type dict used to (re)create the table.

    Insert runs in a single background thread so embedding the next batch
    overlaps with inserting the previous one.
    """
    logger = get_run_logger()
    logger.info(f'Creating embedding table {schema_name}.{embedding_table}')
    create_tmp_embedding_table(dbdao, schema_name, embedding_table, embedding_cols)

    columns = list(embedding_cols.keys())
    processed = 0

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = None
        for concept_id, concept_name in batch_iter:
            t0 = time.time()
            embeddings = embedding_concept_table(concept_name, tokenizer, model, device).tolist()
            embed_time = time.time() - t0

            col_values = list(zip(concept_id, embeddings))

            t1 = time.time()
            if future is not None:
                future.result()
            insert_wait_time = time.time() - t1

            future = executor.submit(dbdao.batch_insert_values, schema_name, embedding_table, columns, col_values)

            processed += len(concept_id)
            if total_rows:
                percent = round(processed / total_rows * 100, 2)
                logger.info(f'{percent} % completed ({processed}/{total_rows}) | embed: {embed_time:.2f}s | wait_for_insert: {insert_wait_time:.2f}s')
            else:
                logger.info(f'{processed} rows completed | embed: {embed_time:.2f}s | wait_for_insert: {insert_wait_time:.2f}s')

        if future is not None:
            future.result()