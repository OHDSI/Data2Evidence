import pandas as pd
# from tqdm import tqdm
import concurrent.futures
import duckdb
from prefect import flow
from prefect.logging import get_run_logger
from prefect.variables import Variable
from tqdm import tqdm

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
                  schema_name=schema_name,
                  connect_to_duckdb=True)
    
    duckdb_database_name = f"{database_code}_{schema_name}"
    duckdb_file_path = f"{Variable.get('duckdb_data_folder')}/{duckdb_database_name}"
    with duckdb.connect(duckdb_file_path) as conn:
        conn.execute("INSTALL vss;")
        conn.execute("LOAD vss;")
        if recreate:
            conn.execute("DROP TABLE IF EXISTS gte_embeddings")
        elif DBDao.check_table_exists():
            raise "Embedding table exists"
        conn.execute(f"CREATE TABLE {duckdb_database_name}.gte_embeddings (concept_id int, vec FLOAT[384]);")

        concept = conn.execute('SELECT concept_id, concept_name FROM concept').fetchnumpy()
        logger.info("Start embedding")
        for i in tqdm(range(0, len(concept), 100)):
            concept_name = concept['concept_name'][i:i+100].tolist()
            concept_id = concept['concept_id'][i:i+100]
            embeddings = embedding_concept_table(concept_name).tolist()
            rst = pd.DataFrame({'concept_id':concept_id, 'gte-small_384': embeddings})
            conn.execute(f"""INSERT INTO gte_embeddings SELECT concept_id, "gte-small_384" FROM rst""")
        conn.execute("SET hnsw_enable_experimental_persistence=TRUE;")
        conn.execute("CREATE INDEX gte_cos_idx ON gte_embeddings USING HNSW (vec) WITH (metric = 'cosine')")

