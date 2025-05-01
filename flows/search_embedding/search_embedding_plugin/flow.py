import pandas as pd
import duckdb
from prefect import flow
from prefect.logging import get_run_logger
from prefect.variables import Variable
import time

from .types import *
from .utils import *
from _shared_flow_utils.dao.DBDao import DBDao

@flow(log_prints=True)
def search_embedding_plugin(options: SearchEmbeddingType):
    # time.sleep(600)
    logger = get_run_logger()
    use_cache_db = options.use_cache_db
    database_code = options.database_code
    schema_name = options.schema_name
    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code, 
                  schema_name=schema_name,
                  connect_to_duckdb=True)
    
    duckdb_database_name = f"{database_code}_{schema_name}"
    duckdb_file_path = f"{Variable.get('duckdb_data_folder')}/{duckdb_database_name}"
    vss_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/vss.duckdb_extension';

    with duckdb.connect(duckdb_file_path) as conn:
        conn.load_extension(vss_extension_path)
        concept = conn.execute('SELECT concept_id, concept_name FROM concept').fetchnumpy()
        logger.info("Start embedding")
        length = len(concept['concept_name'])
        step = 100
        conn.execute("DROP TABLE IF EXISTS gte_embeddings")
        conn.execute("CREATE TABLE gte_embeddings (concept_id int, vec FLOAT[384]);")
        tokenizer = AutoTokenizer.from_pretrained("Supabase/gte-small")
        model = AutoModel.from_pretrained("Supabase/gte-small")
        for i in range(0, length, step):
            concept_name = concept['concept_name'][i:i+step].tolist()
            concept_id = concept['concept_id'][i:i+step]
            embeddings = embedding_concept_table(concept_name, tokenizer, model).tolist()
            rst = pd.DataFrame({'concept_id':concept_id, 'gte-small_384': embeddings})
            conn.execute(f"""INSERT INTO gte_embeddings SELECT concept_id, "gte-small_384" FROM rst""")
            percent = (i/step + 1)/(int(length / step) + (length % step > 0)) * 100
            logger.info(f'{round(percent,2)} % completed')

        if not check_duckdb_column_exists(conn, 'concept', 'concept_name_embedding'):
            conn.execute(f"""
                            ALTER TABLE concept
                            ADD COLUMN concept_name_embedding FLOAT[384];
                        """)

        conn.execute(f"""
                        UPDATE concept AS c
                        SET concept_name_embedding = g.vec
                        FROM gte_embeddings AS g
                        WHERE c.concept_id = g.concept_id;
                     """)
        
        conn.execute("DROP TABLE gte_embeddings;")
        conn.execute("SET hnsw_enable_experimental_persistence=TRUE;")
        conn.execute("DROP INDEX IF EXISTS gte_cos_idx;")
        conn.execute("CREATE INDEX gte_cos_idx ON concept USING HNSW (concept_name_embedding) WITH (metric = 'cosine')")

