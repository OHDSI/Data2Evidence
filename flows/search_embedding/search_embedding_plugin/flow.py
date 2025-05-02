import pandas as pd
import duckdb
from prefect import flow
from prefect.logging import get_run_logger
from prefect.variables import Variable

from .types import *
from .utils import *
from _shared_flow_utils.dao.DBDao import DBDao

@flow(log_prints=True)
def search_embedding_plugin(options: SearchEmbeddingType):
    logger = get_run_logger()
    use_cache_db = options.use_cache_db
    database_code = options.database_code
    schema_name = options.schema_name
    recreate = options.recreate
    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code, 
                  connect_to_duckdb=True)
    
    duckdb_database_name = f"{database_code}"
    duckdb_file_path = f"{Variable.get('duckdb_data_folder')}/{duckdb_database_name}"
    vss_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/fts.duckdb_extension';

    with duckdb.connect(duckdb_file_path) as conn:
        conn.load_extension(vss_extension_path)
        if recreate:
            conn.execute(f"DROP TABLE IF EXISTS {schema_name}.gte_embeddings")
        elif dbdao.check_table_exists(schema=schema_name):
            raise "Embedding table exists"
        conn.execute(f"CREATE TABLE {schema_name}.gte_embeddings (concept_id int, vec FLOAT[384]);")

        concept = conn.execute(f"SELECT concept_id, concept_name FROM {schema_name}.concept;").fetchnumpy()
        logger.info("Start embedding")
        length = len(concept['concept_name'])
        for i in range(0, length, 100):
            concept_name = concept['concept_name'][i:i+100].tolist()
            concept_id = concept['concept_id'][i:i+100]
            embeddings = embedding_concept_table(concept_name).tolist()
            rst = pd.DataFrame({'concept_id':concept_id, 'gte-small_384': embeddings})
            conn.execute(f"""INSERT INTO {schema_name}.gte_embeddings SELECT concept_id, "gte-small_384" FROM rst""")
            percent = (i+1)/(int(length / 100) + (length % 100 > 0)) * 100
            logger.info(f'{round(percent,2)} % completed')
        conn.execute("SET hnsw_enable_experimental_persistence=TRUE;")
        conn.execute(f"CREATE INDEX {schema_name}.gte_cos_idx ON gte_embeddings USING HNSW (vec) WITH (metric = 'cosine')")

