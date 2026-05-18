import pandas as pd
import os
from transformers import AutoTokenizer, AutoModel
import duckdb
import torch
import time
from concurrent.futures import ThreadPoolExecutor

from prefect import flow, task
from prefect.logging import get_run_logger
from prefect.variables import Variable

from .types import *
from .utils import *
from _shared_flow_utils.dao.DBDao import DBDao, SupportedDatabaseDialects

os.environ['plugin_name'] = 'search_embedding_plugin'

# Define global variables for shared configurations
STEP = 1024
device = 'cuda' if torch.cuda.is_available() else 'cpu'
if device == 'cpu':
    torch.set_num_threads(max(1, (os.cpu_count() or 1) // 2))
tokenizer = AutoTokenizer.from_pretrained("Supabase/gte-small")
model = AutoModel.from_pretrained("Supabase/gte-small").to(device).eval()
tmp_embedding_table = 'tmp_embeddings'
embedding_col_name = 'concept_name_embedding'
index_col = 'embedding_cos_idx'

@flow(log_prints=True)
def search_embedding_plugin(options: SearchEmbeddingType):
    logger = get_run_logger()
    logger.info(f"Flow parameters: {options.json()}")
    logger.info(f'Device: {device} | PyTorch threads: {torch.get_num_threads()}')
    schema_name = options.schema_name
    database_code = options.database_code
    cache_id = options.cache_id
    use_trex_connection = options.use_trex_connection
    if use_trex_connection:
        logger.info("Using TREX connection")
        # -------------------- Trex connection to cache --------------------
        dbdao = DBDao(
            dialect=SupportedDatabaseDialects.TREX,
            use_cache_db=use_trex_connection,
            database_code=database_code,
            cache_id=cache_id,
        )
        ## Vss extension is installed by default in trex, just need to load it
        logger.info("Loading vss extension in TREX...")
        dbdao.execute_sql("LOAD vss")
        logger.info("Vss extension loaded in TREX")
        create_embeddings_trex(dbdao, schema_name)
    else:
        logger.info("Using direct DuckDB connection")
        # -------------------- Direct file connection to cache --------------------
        duckdb_file_path = resolve_duckdb_file_path(database_code, Variable.get("duckdb_data_folder"))
        vss_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/vss.duckdb_extension';
        with duckdb.connect(duckdb_file_path) as conn:
            conn.load_extension(vss_extension_path)
            create_embeddings_duckdb(conn, schema_name)

@task(log_prints=True, task_run_name="embedding_concept_table_{schema_name}.concept")
def create_embeddings_trex(dbdao, schema_name):
    logger = get_run_logger()
    logger.info("***************** Start embedding *****************")
    logger.info(f"Schema name: {schema_name}")
    ## Load concept table
    concept = dbdao.execute_sql(f'SELECT concept_id, concept_name FROM {schema_name}.concept', fetch=True)
    concept = pd.DataFrame(concept, columns=['concept_id','concept_name'])
    length = len(concept)
    logger.info(f"Number of concepts: {length}")
    
    ## Create tmp embedding table
    embedding_cols = {'concept_id':'int', 'vec':'FLOAT[384]'}
    create_tmp_embedding_table(dbdao, schema_name, tmp_embedding_table, embedding_cols)

    ## Generate embedding
    columns = list(embedding_cols.keys())
    total_batches = int(length / STEP) + (length % STEP > 0)

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = None
        for i in range(0, length, STEP):
            concept_name = concept['concept_name'][i:i+STEP].tolist()
            concept_id = concept['concept_id'][i:i+STEP].tolist()

            t0 = time.time()
            embeddings = embedding_concept_table(concept_name, tokenizer, model, device).tolist()
            embed_time = time.time() - t0

            col_values = list(zip(concept_id, embeddings))

            t1 = time.time()
            if future is not None:
                future.result()
            insert_wait_time = time.time() - t1

            future = executor.submit(dbdao.batch_insert_values, schema_name, tmp_embedding_table, columns, col_values)

            percent = round((i // STEP + 1) / total_batches * 100, 2)
            logger.info(f'{percent} % completed | embed: {embed_time:.2f}s | wait_for_insert: {insert_wait_time:.2f}s')

        if future is not None:
            future.result()
    
    logger.info("***************** Insert embedding *****************")
    ## Add embedding column to concept table
    if embedding_col_name not in dbdao.get_columns(schema_name, 'concept'):
        add_embedding_column(dbdao, schema_name, embedding_col_name)

    ## Copy embedding column from intermediate table to concept table, must drop vss index (if exist) before update embedding column
    drop_embedding_index(dbdao, schema_name, index_col)
    update_concept_embedding(dbdao, schema_name, tmp_embedding_table, embedding_col_name)
    dbdao.drop_table(schema_name, tmp_embedding_table, cascade=True)
    
    ## Create vss index on embedding column
    create_embedding_index(dbdao, schema_name, embedding_col_name, index_col)
    
@task(log_prints=True, task_run_name="embedding_concept_table_duckdb")
def create_embeddings_duckdb(conn, schema_name):
    logger = get_run_logger()
    logger.info("***************** Start embedding *****************")
    concept = conn.execute(f'SELECT concept_id, concept_name FROM "{schema_name}".concept').fetchnumpy()
    length = len(concept['concept_name'])
    
    ## Create temporary table for embeddings
    conn.execute(f'DROP TABLE IF EXISTS "{schema_name}"."{tmp_embedding_table}"')
    conn.execute(f'CREATE TABLE "{schema_name}"."{tmp_embedding_table}" (concept_id int, vec FLOAT[384]);')
    
    ## Generate embedding
    for i in range(0, length, STEP):
        concept_name = concept['concept_name'][i:i+STEP].tolist()
        concept_id = concept['concept_id'][i:i+STEP]
        embeddings = embedding_concept_table(concept_name, tokenizer, model, device).tolist()
        rst = pd.DataFrame({'concept_id':concept_id, 'embedding': embeddings})
        ## Insert embedding into tmp embedding table
        conn.execute(f"INSERT INTO {schema_name}.{tmp_embedding_table} SELECT concept_id, embedding FROM rst")
        percent = (i/STEP + 1)/(int(length / STEP) + (length % STEP > 0)) * 100
        logger.info(f'{round(percent,2)} % completed')

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
