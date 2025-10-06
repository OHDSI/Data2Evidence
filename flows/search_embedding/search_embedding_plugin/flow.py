import pandas as pd
import os
from transformers import AutoTokenizer, AutoModel
import duckdb

from prefect import flow, task
from prefect.logging import get_run_logger
from prefect.variables import Variable

from .types import *
from .utils import *
from _shared_flow_utils.dao.DBDao import DBDao, SupportedDatabaseDialects
import time

os.environ['plugin_name'] = 'search_embedding_plugin'

@flow(log_prints=True)
def search_embedding_plugin(options: SearchEmbeddingType):
    # time.sleep(600)  # Ensure all services are up
    schema_name = options.schema_name
    database_code = options.database_code
    use_trex_connection = options.use_trex_connection
    if use_trex_connection:
        # -------------------- Trex connection to cache --------------------
        dbdao = DBDao(
            dialect=SupportedDatabaseDialects.TREX,
            use_cache_db=use_trex_connection,
            database_code=database_code,
        )
        ## Vss extension is installed by default in trex, just need to load it
        dbdao.execute_sql("LOAD vss")
        create_embeddings_trex(dbdao, schema_name)
    else:
        # -------------------- Direct file connection to cache --------------------
        duckdb_file_path = resolve_duckdb_file_path(database_code, Variable.get("duckdb_data_folder"))
        vss_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/vss.duckdb_extension';
        conn = duckdb.connect(duckdb_file_path, read_only=True)
        conn.close()
        with duckdb.connect(duckdb_file_path, read_only=True) as conn:
            conn.load_extension(vss_extension_path)
            create_embeddings_duckdb(conn, schema_name)

@task(log_prints=True, task_run_name="embedding_concept_table_{schema_name}.concept")
def create_embeddings_trex(dbdao, schema_name):
    logger = get_run_logger()
    logger.info("***************** Start embedding *****************")
    
    ## Load concept table
    concept = dbdao.execute_sql(f'SELECT concept_id, concept_name FROM {schema_name}.concept', fetch=True)
    concept = pd.DataFrame(concept, columns=['concept_id','concept_name'])
    step, length =100, len(concept)
    
    ## Create tmp gte table
    gte_tmp_table = 'gte_embeddings'
    gte_tmp_cols = {'concept_id':'int', 'vec':'FLOAT[384]'}
    create_tmp_gte_table(dbdao, schema_name, gte_tmp_table, gte_tmp_cols)

    ## Generate embedding
    tokenizer = AutoTokenizer.from_pretrained("Supabase/gte-small")
    model = AutoModel.from_pretrained("Supabase/gte-small")
    for i in range(0, length, step):
        concept_name = concept['concept_name'][i:i+step].tolist()
        concept_id = concept['concept_id'][i:i+step].tolist()
        embeddings = embedding_concept_table(concept_name, tokenizer, model).tolist()
        columns = list(gte_tmp_cols.keys())
        col_values = list(zip(concept_id, embeddings))    
        ## Insert embedding into tmp gte table
        dbdao.batch_insert_values(schema_name, gte_tmp_table, columns, col_values)
        ## Monitoring embedding progress
        percent = (i/step + 1)/(int(length / step) + (length % step > 0)) * 100
        logger.info(f'{round(percent,2)} % completed')
    
    logger.info("***************** Insert embedding *****************")
    ## Add embedding column to concept table
    embedding_col = 'concept_name_embedding'
    if embedding_col not in dbdao.get_columns(schema_name, 'concept'):
        add_embedding_column(dbdao, schema_name, embedding_col)

    ## Copy embedding column from intermediate table to concept table, must drop vss index (if exist) before update embedding column
    drop_gte_index(dbdao, schema_name)
    update_concept_embedding(dbdao, schema_name, gte_tmp_table, embedding_col)
    dbdao.drop_table(schema_name, gte_tmp_table, cascade=True)
    
    ## Create vss index on embedding column
    create_gte_index(dbdao, schema_name, embedding_col)
    
@task(log_prints=True, task_run_name="embedding_concept_table_duckdb")
def create_embeddings_duckdb(conn, schema_name):
    logger = get_run_logger()
    logger.info("***************** Start embedding *****************")
    concept = conn.execute('SELECT concept_id, concept_name FROM "?".concept', [schema_name]).fetchnumpy()
    length = len(concept['concept_name'])
    step = 100
    
    ## Create temporary table for embeddings
    conn.execute("DROP TABLE IF EXISTS ?.gte_embeddings", [schema_name])
    conn.execute("CREATE TABLE ?.gte_embeddings (concept_id int, vec FLOAT[384]);", [schema_name])
    
    ## Generate embedding
    tokenizer = AutoTokenizer.from_pretrained("Supabase/gte-small")
    model = AutoModel.from_pretrained("Supabase/gte-small")
    for i in range(0, length, step):
        concept_name = concept['concept_name'][i:i+step].tolist()
        concept_id = concept['concept_id'][i:i+step]
        embeddings = embedding_concept_table(concept_name, tokenizer, model).tolist()
        rst = pd.DataFrame({'concept_id':concept_id, 'gte-small_384': embeddings})
        ## Insert embedding into tmp gte table
        conn.execute("INSERT INTO ?.gte_embeddings SELECT concept_id, gte-small_384 FROM rst", [schema_name])
        percent = (i/step + 1)/(int(length / step) + (length % step > 0)) * 100
        logger.info(f'{round(percent,2)} % completed')

    logger.info("***************** Insert embedding *****************")
    ## Check if column exists using parameterized query
    embedding_col_name = 'concept_name_embedding'
    column_exists = check_duckdb_column_exists(conn, f"{schema_name}.concept", embedding_col_name)
    if not column_exists:
        conn.execute(f"ALTER TABLE ?.concept ADD COLUMN {embedding_col_name} FLOAT[384];", [schema_name])
        
    ## Drop index if exists
    conn.execute(f"DROP INDEX IF EXISTS ?.gte_cos_idx;", [schema_name])
    
    ## Update embedding column safely
    conn.execute(f"""
        UPDATE ?.concept AS c
        SET {embedding_col_name} = g.vec
        FROM ?.gte_embeddings AS g
        WHERE c.concept_id = g.concept_id;
        """, 
        [schema_name, schema_name]
    )
    
    # Clean up temporary table
    conn.execute("DROP TABLE ?.gte_embeddings;", [schema_name])
    
    # Create index
    conn.execute("SET hnsw_enable_experimental_persistence=TRUE;")
    conn.execute(f"CREATE INDEX gte_cos_idx ON ?.concept USING HNSW ({embedding_col_name}) WITH (metric = 'cosine')",[schema_name])
