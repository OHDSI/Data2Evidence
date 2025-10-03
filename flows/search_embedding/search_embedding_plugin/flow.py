import pandas as pd
import os
from transformers import AutoTokenizer, AutoModel

from prefect import flow, task
from prefect.logging import get_run_logger

from .types import *
from .utils import *
from _shared_flow_utils.dao.trexdao import TrexDao

os.environ['plugin_name'] = 'search_embedding_plugin'

@flow(log_prints=True)
def search_embedding_plugin(options: SearchEmbeddingType):
    database_code = options.database_code
    schema_name = options.schema_name
    trexdao = TrexDao(
        database_code=database_code,
        use_cache_db=options.use_cache_db)
    
    ## Vss extension is installed by default in trex, just need to load it
    trexdao.execute_sql(f"LOAD vss")
    create_embeddings(trexdao, schema_name)

@task(log_prints=True, task_run_name="embedding_concept_table_{schema_name}.concept")
def create_embeddings(trexdao, schema_name):
    logger = get_run_logger()
    logger.info("***************** Start embedding *****************")
    
    ## Load concept table
    concept = trexdao.execute_sql(f'SELECT concept_id, concept_name FROM {schema_name}.concept', fetch=True)
    concept = pd.DataFrame(concept, columns=['concept_id','concept_name'])
    step, length =100, len(concept)
    
    ## Create tmp gte table
    gte_tmp_table = 'gte_embeddings'
    gte_tmp_cols = {'concept_id':'int', 'vec':'FLOAT[384]'}
    create_tmp_gte_table(trexdao, schema_name, gte_tmp_table, gte_tmp_cols)

    ## Generate embedding
    tokenizer = AutoTokenizer.from_pretrained("Supabase/gte-small")
    model = AutoModel.from_pretrained("Supabase/gte-small")
    for i in range(0, length, step):
        concept_name = concept['concept_name'][i:i+step].tolist()
        concept_id = concept['concept_id'][i:i+step].tolist()
        embeddings = embedding_concept_table(concept_name, tokenizer, model).tolist()
        colunms = list(gte_tmp_cols.keys())
        col_values = list(zip(concept_id, embeddings))    
            
        ## Insert embedding into tmp gte table
        trexdao.batch_insert_values(schema_name, gte_tmp_table, colunms, col_values)
        
        ## Monitoring embedding progress
        percent = (i/step + 1)/(int(length / step) + (length % step > 0)) * 100
        logger.info(f'{round(percent,2)} % completed')
    
    logger.info("***************** Insert embedding *****************")
    ## Update concept table with tmp gte embedding column
    embedding_col = 'concept_name_embedding'
    if embedding_col not in trexdao.get_columns(schema_name, 'concept'):
        trexdao.execute_sql(f"""
                        ALTER TABLE {schema_name}.concept
                        ADD COLUMN {embedding_col} FLOAT[384];
                    """)

    # Must drop index before update embedding column
    trexdao.execute_sql(f"DROP INDEX IF EXISTS {schema_name}.gte_cos_idx;")
    trexdao.execute_sql(f"""
                    UPDATE {schema_name}.concept AS c
                    SET {embedding_col} = g.vec
                    FROM {schema_name}.{gte_tmp_table} AS g
                    WHERE c.concept_id = g.concept_id;
                    """)
    
    trexdao.execute_sql(f"DROP TABLE {schema_name}.{gte_tmp_table};")
    trexdao.execute_sql("SET hnsw_enable_experimental_persistence=TRUE;")
    trexdao.execute_sql(f"CREATE INDEX gte_cos_idx ON {schema_name}.concept USING HNSW ({embedding_col}) WITH (metric = 'cosine')")


