import torch.nn.functional as F
from torch import Tensor
from transformers import AutoTokenizer, AutoModel

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

def check_duckdb_column_exists(conn, table_name, column):
    rst = conn.execute(f'PRAGMA table_info({table_name});').fetchall()
    columns = [row[1] for row in rst]
    return any(col.lower() == column.lower() for col in columns)

