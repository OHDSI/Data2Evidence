import torch.nn.functional as F
from torch import Tensor
from prefect.logging import get_run_logger
from psycopg2 import sql as pg_sql

DUCKDB_EXTENSIONS_FILEPATH = "/app/duckdb_extensions"

def average_pool(last_hidden_states: Tensor,
                 attention_mask: Tensor) -> Tensor:
    last_hidden = last_hidden_states.masked_fill(~attention_mask[..., None].bool(), 0.0)
    return last_hidden.sum(dim=1) / attention_mask.sum(dim=1)[..., None]

def embedding_concept_table(concept_name_list,tokenizer, model):
    # Tokenize the input texts
    batch_dict = tokenizer(concept_name_list, max_length=512, padding=True, truncation=True, return_tensors='pt')
    outputs = model(**batch_dict)
    embeddings = average_pool(outputs.last_hidden_state, batch_dict['attention_mask'])
    # (Optionally) normalize embeddings
    embeddings = F.normalize(embeddings, p=2, dim=1)
    return embeddings

def create_tmp_gte_table(trexdao, schema_name, gte_tmp_table, gte_tmp_cols):
    logger = get_run_logger()
    if trexdao.check_table_exists(schema_name, gte_tmp_table):
        if set(gte_tmp_cols.keys()) == set(trexdao.get_columns(schema_name, gte_tmp_table)):
            logger.info(f'Intermediate table {schema_name}.{gte_tmp_table} already exists, will truncate it.')
            trexdao.truncate_table(schema_name, gte_tmp_table)
        else: 
            logger.info(f'Intermediate table {schema_name}.{gte_tmp_table} exists but with different structure, will recreate it.')
            trexdao.drop_table(schema_name, gte_tmp_table, cascade=True)
            trexdao.create_table(schema_name, gte_tmp_table, gte_tmp_cols)
    else:
        trexdao.create_table(schema_name, gte_tmp_table, gte_tmp_cols)

def add_embedding_column(dbdao, schema_name, embedding_col):
    sql = pg_sql.SQL("ALTER TABLE {schema_name}.concept ADD COLUMN {column_name} FLOAT[384];").format(
    schema_name=pg_sql.Identifier(schema_name),
    column_name=pg_sql.Identifier(embedding_col)
    )
    dbdao.execute_sql(sql)
    
def drop_gte_index(dbdao, schema_name):
    sql = pg_sql.SQL("DROP INDEX IF EXISTS {schema_name}.gte_cos_idx;").format(
        schema_name=pg_sql.Identifier(schema_name)
        )
    dbdao.execute_sql(sql)
    
def update_concept_embedding(dbdao, schema_name, gte_tmp_table, embedding_col):
    sql = pg_sql.SQL("""
                    UPDATE {schema_name}.concept AS c
                    SET {embedding_col} = g.vec
                    FROM {schema_name}.{gte_tmp_table} AS g
                    WHERE c.concept_id = g.concept_id;
                    """).format(
        schema_name=pg_sql.Identifier(schema_name),
        embedding_col=pg_sql.Identifier(embedding_col),
        gte_tmp_table=pg_sql.Identifier(gte_tmp_table)
        )
    dbdao.execute_sql(sql)
    
def create_gte_index(dbdao, schema_name, embedding_col):
    dbdao.execute_sql("SET hnsw_enable_experimental_persistence=TRUE;")
    sql = pg_sql.SQL("CREATE INDEX gte_cos_idx ON {schema_name}.concept USING HNSW ({embedding_col}) WITH (metric = 'cosine')").format(
        schema_name=pg_sql.Identifier(schema_name),
        embedding_col=pg_sql.Identifier(embedding_col)
        )   
    dbdao.execute_sql(sql)

