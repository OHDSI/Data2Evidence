import pandas as pd
import os
from transformers import AutoTokenizer, AutoModel

from prefect import flow, task
from prefect.logging import get_run_logger

from .types import *
from .utils import *
from _shared_flow_utils.dao.DBDao import DBDao, SupportedDatabaseDialects

os.environ['plugin_name'] = 'search_embedding_plugin'

@flow(log_prints=True)
def search_embedding_plugin(options: SearchEmbeddingType):
    schema_name = options.schema_name
    dbdao = DBDao(
        dialect=SupportedDatabaseDialects.TREX if options.use_trex_connection else None,
        use_cache_db=options.use_cache_db,
        database_code=options.database_code,
    )
    ## Vss extension is installed by default in trex, just need to load it
    dbdao.execute_sql(f"LOAD vss")
    create_embeddings(dbdao, schema_name)

@task(log_prints=True, task_run_name="embedding_concept_table_{schema_name}.concept")
def create_embeddings(dbdao, schema_name):
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


