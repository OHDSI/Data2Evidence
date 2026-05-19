import torch.nn.functional as F
from torch import Tensor
import torch
from prefect.logging import get_run_logger
from psycopg2 import sql as pg_sql
from pathlib import Path
from typing import List, Dict, Any
import duckdb
from _shared_flow_utils.dao.DBDao import DBDao

DUCKDB_EXTENSIONS_FILEPATH = "/app/duckdb_extensions"

def average_pool(last_hidden_states: Tensor,
                 attention_mask: Tensor) -> Tensor:
    """
    Performs average pooling on the token embeddings.
    """
    last_hidden = last_hidden_states.masked_fill(~attention_mask[..., None].bool(), 0.0)
    return last_hidden.sum(dim=1) / attention_mask.sum(dim=1)[..., None]

def embedding_concept_table(concept_name_list: List[str],tokenizer:Any, model:Any, device:str)  -> Tensor:
    """
    Generate embeddings for a list of concept names using the provided tokenizer and model.
    """
    # Tokenize the input texts
    batch_dict = tokenizer(concept_name_list, max_length=64, padding=True, truncation=True, return_tensors='pt') # max_length based on longest concept name (255 chars ~ 64 token), set to 128 for some buffer    
    batch_dict = {k: v.to(device) for k, v in batch_dict.items()} 
    with torch.no_grad():  # prevents building the computation graph
        outputs = model(**batch_dict)
    embeddings = average_pool(outputs.last_hidden_state, batch_dict['attention_mask'])
    # (Optionally) normalize embeddings
    embeddings = F.normalize(embeddings, p=2, dim=1)
    return embeddings.cpu() # move back to CPU for numpy/list conversion      

def check_duckdb_column_exists(conn: duckdb.DuckDBPyConnection, table_name: str, column: str) -> bool:
    """
    Check if a column exists in a DuckDB table.
    """
    rst = conn.execute(f'PRAGMA table_info({table_name});').fetchall()
    columns = [row[1] for row in rst]
    return any(col.lower() == column.lower() for col in columns)

def create_tmp_embedding_table(trexdao: DBDao, schema_name: str, emb_tmp_table:str, embedding_cols: Dict[str, str]) -> None:
    """
    Create a temporary table to store intermediate embeddings.
    If the table already exists, it will be truncated.
    """
    logger = get_run_logger()
    if trexdao.check_table_exists(schema_name, emb_tmp_table):
        if set(embedding_cols.keys()) == set(trexdao.get_columns(schema_name, emb_tmp_table)):
            logger.info(f'Intermediate table {schema_name}.{emb_tmp_table} already exists, will truncate it.')
            trexdao.truncate_table(schema_name, emb_tmp_table)
        else: 
            logger.info(f'Intermediate table {schema_name}.{emb_tmp_table} exists but with different structure, will recreate it.')
            trexdao.drop_table(schema_name, emb_tmp_table, cascade=True)
            trexdao.create_table(schema_name, emb_tmp_table, embedding_cols)
    else:
        trexdao.create_table(schema_name, emb_tmp_table, embedding_cols)

def add_embedding_column(dbdao: DBDao, schema_name: str, embedding_col: str) -> None:
    """ 
    Add a new column to the concept table to store embeddings.
    """
    sql = pg_sql.SQL("ALTER TABLE {schema_name}.concept ADD COLUMN {column_name} FLOAT[384];").format(
    schema_name=pg_sql.Identifier(schema_name),
    column_name=pg_sql.Identifier(embedding_col)
    )
    dbdao.execute_sql(sql)
    
def count_concept_rows(dbdao: DBDao, schema_name: str) -> int:
    """
    Return COUNT(*) of `{schema_name}.concept`, with the schema identifier
    safely quoted via psycopg2.sql. `schema_name` may be dotted
    (catalog.schema); each part is quoted separately.
    """
    sql = pg_sql.SQL("SELECT COUNT(*) FROM {schema}.{table}").format(
        schema=pg_sql.Identifier(*schema_name.split(".")),
        table=pg_sql.Identifier("concept"),
    )
    return dbdao.execute_sql(sql, fetch=True)[0][0]

def build_concept_select_sql(schema_name: str) -> pg_sql.Composable:
    """
    Build a safely-quoted `SELECT concept_id, concept_name FROM {schema}.concept`
    Composable for use with a psycopg2 cursor. `schema_name` may be dotted.
    """
    return pg_sql.SQL("SELECT concept_id, concept_name FROM {schema}.{table}").format(
        schema=pg_sql.Identifier(*schema_name.split(".")),
        table=pg_sql.Identifier("concept"),
    )

def drop_embedding_index(dbdao: DBDao, schema_name: str, index_col: str)-> None:
    """ 
    Drop the existing GTE index on the concept table if it exists.
    """
    sql = pg_sql.SQL("DROP INDEX IF EXISTS {schema_name}.{index_col};").format(
        schema_name=pg_sql.Identifier(*schema_name.split(".")),
        index_col=pg_sql.Identifier(index_col)
        )
    dbdao.execute_sql(sql)
    
def update_concept_embedding(dbdao:DBDao, schema_name:str, emb_tmp_table:str, embedding_col:str) -> None:
    """ 
    Update the concept table with embeddings from the temporary GTE table.
    """ 
    sql = pg_sql.SQL("""
                    UPDATE {schema_name}.concept AS c
                    SET {embedding_col} = g.vec
                    FROM {schema_name}.{emb_tmp_table} AS g
                    WHERE c.concept_id = g.concept_id;
                    """).format(
        schema_name=pg_sql.Identifier(schema_name),
        embedding_col=pg_sql.Identifier(embedding_col),
        emb_tmp_table=pg_sql.Identifier(emb_tmp_table)
        )
    dbdao.execute_sql(sql)
    
def create_embedding_index(dbdao, schema_name:str, embedding_table: str, embedding_col:str, index_col: str) -> None:
    """ 
    Create a GTE index on the embedding column of the concept embedding table.
    """ 
    sql = pg_sql.SQL("""
                     SET hnsw_enable_experimental_persistence=TRUE;
                     CREATE INDEX {index_col} ON {schema_name}.{embedding_table} USING HNSW ({embedding_col}) WITH (metric = 'cosine');
                     """).format(
        index_col=pg_sql.Identifier(index_col),
        schema_name=pg_sql.Identifier(*schema_name.split(".")),
        embedding_table=pg_sql.Identifier(embedding_table),
        embedding_col=pg_sql.Identifier(embedding_col),
        )   
    dbdao.execute_sql(sql)

def resolve_duckdb_file_path(duckdb_database_name: str, folder_path: str) -> str:
    """
    Returns the full path to the DuckDB database file
    """
    return str(Path(folder_path) / f"{duckdb_database_name}.db")

