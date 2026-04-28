import torch.nn.functional as F
from torch import Tensor
import torch
from prefect.logging import get_run_logger
from psycopg2 import sql as pg_sql
from pathlib import Path
from typing import List, Dict, Any
import duckdb
import sqlalchemy as sqla
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
    batch_dict = tokenizer(concept_name_list, max_length=128, padding=True, truncation=True, return_tensors='pt') # max_length based on longest concept name (255 chars ~ 64 token), set to 128 for some buffer    
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
    
def drop_embedding_index(dbdao: DBDao, schema_name: str, index_col: str)-> None:
    """ 
    Drop the existing GTE index on the concept table if it exists.
    """
    sql = pg_sql.SQL("DROP INDEX IF EXISTS {schema_name}.{index_col};").format(
        schema_name=pg_sql.Identifier(schema_name),
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
    
def create_embedding_index(dbdao, schema_name:str, embedding_col:str, index_col: str) -> None:
    """ 
    Create a GTE index on the embedding column of the concept table.
    """ 
    sql = pg_sql.SQL("""
                     SET hnsw_enable_experimental_persistence=TRUE;
                     CREATE INDEX {index_col} ON {schema_name}.concept USING HNSW ({embedding_col}) WITH (metric = 'cosine');
                     """).format(
        index_col=pg_sql.Identifier(index_col),
        schema_name=pg_sql.Identifier(schema_name),
        embedding_col=pg_sql.Identifier(embedding_col),
        )   
    dbdao.execute_sql(sql)

def resolve_duckdb_file_path(duckdb_database_name: str, folder_path: str) -> str:
    """
    Returns the full path to the DuckDB database file
    """
    return str(Path(folder_path) / f"{duckdb_database_name}.db")


# ── HANA-specific helpers ──────────────────────────────────────────────────────

def create_hana_tmp_embedding_table(dbdao: DBDao, schema_name: str, tmp_table: str) -> None:
    with dbdao.engine.connect() as conn:
        conn.execute(sqla.text(
            f'DROP TABLE IF EXISTS "{schema_name}"."{tmp_table}"'
        ))
        conn.execute(sqla.text(
            f'CREATE TABLE "{schema_name}"."{tmp_table}" '
            f'(CONCEPT_ID INTEGER, VEC REAL_VECTOR(384))'
        ))
        conn.commit()


def batch_insert_hana_tmp(dbdao: DBDao, schema_name: str, tmp_table: str,
                           concept_ids: List[int], embeddings: List[List[float]]) -> None:
    rows = [
        {"cid": int(cid), "vec": f"[{','.join(str(v) for v in emb)}]"}
        for cid, emb in zip(concept_ids, embeddings)
    ]
    with dbdao.engine.connect() as conn:
        conn.execute(
            sqla.text(
                f'INSERT INTO "{schema_name}"."{tmp_table}" (CONCEPT_ID, VEC) '
                f'VALUES (:cid, TO_REAL_VECTOR(:vec))'
            ),
            rows,
        )
        conn.commit()


def add_embedding_column_hana(dbdao: DBDao, schema_name: str, embedding_col: str) -> None:
    with dbdao.engine.connect() as conn:
        conn.execute(sqla.text(
            f'ALTER TABLE "{schema_name}".CONCEPT '
            f'ADD ("{embedding_col}" REAL_VECTOR(384))'
        ))
        conn.commit()


def merge_hana_embeddings(dbdao: DBDao, schema_name: str, tmp_table: str, embedding_col: str) -> None:
    with dbdao.engine.connect() as conn:
        conn.execute(sqla.text(
            f'MERGE INTO "{schema_name}".CONCEPT c '
            f'USING "{schema_name}"."{tmp_table}" t '
            f'ON c.CONCEPT_ID = t.CONCEPT_ID '
            f'WHEN MATCHED THEN UPDATE SET c."{embedding_col}" = t.VEC'
        ))
        conn.commit()

