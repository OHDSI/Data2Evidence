# Search Embedding Flow

Generates `Supabase/gte-small` embeddings (384-dim, cosine-normalised) for every row in
`{schema}.concept.concept_name` and stores them in a `FLOAT[384]` column backed by a DuckDB
HNSW index. Required before hybrid search works in the terminology service.

---

## Flow parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `database_code` | string | Dataset identifier (e.g. `alpdev_pg`, `demo_cdm`) |
| `schema_name` | string | Vocab schema to embed (e.g. `cdmvocab`, `demo_cdm`) |

---

## Python dependencies

Declared in `pyproject.toml`. Requires **Python 3.12.\***.

| Package | Version | Role |
|---------|---------|------|
| `torch` | 2.6.0 | Model inference (CPU or CUDA) |
| `transformers` | 4.44.2 | `AutoTokenizer` / `AutoModel` for gte-small |
| `pandas` | 2.2.2 | In-memory batch handling |
| `duckdb` | 1.4.0 | Direct DuckDB connection path (non-Trex) |
| `prefect[docker,shell]` | 3.0.3 | Flow orchestration |
| `psycopg2-binary` | 2.9.6 | Trex DAO SQL parameterisation |
| `pydantic` | 2.10.6 | Flow parameter validation |
| `sqlalchemy` | 2.0.38 | DBDao internals |

The `vss` DuckDB extension must be available in the container at
`/app/duckdb_extensions/vss.duckdb_extension` (Trex path) or pre-installed in the DuckDB
build (direct-connect path). It is loaded — not installed — at runtime.

---

## CPU thread configuration

The flow auto-tunes PyTorch threads at startup (line 23 of `flow.py`):

```python
torch.set_num_threads(max(1, (os.cpu_count() or 1) // 2))
```

Half the logical CPU count is reserved for the OS and the concurrent insert thread.
A GPU is used automatically if CUDA is available; otherwise CPU is used. 

### Effect of CPU core count on throughput

The benchmark below was measured on a 20-core CPU (10 PyTorch threads) against a ~9,000-concept demo vocab, with embed and insert running concurrently

Each iteration's wall time = `embed_time + wait_for_insert`. The insert runs concurrently and costs `~2 s` per `1,024-row` batch.

Approximate throughput by CPU allocation (scaling embed time linearly with thread count,
holding insert cost fixed at ~2 s/batch):

| Thread_num | Approximate time against 1024-row |
|-----------|----------------|
| 5 | ~6.9s |
| 7 | ~6.2s |
| 10 | ~6.3s |

A standard OMOP vocabulary (~6 M concepts) is a long-running job on CPU. Schedule it during off-peak hours. GPU is the practical option for full-vocab deployments.

---

## Memory requirements

| Component | Approximate size |
|-----------|----------------|
| `gte-small` model weights | ~66 MB |
| Tokenizer vocab | ~5 MB |
| Batch working memory (1,024 rows × 384 floats) | ~1.5 MB |
| Pandas concept DataFrame (5 M rows) | ~400 MB |
| **Minimum container memory** | **~1 GB** |
| **Recommended** | **2 GB** (headroom for Trex DAO + OS) |

---

## Disk space requirements

The embedding column and HNSW index are stored inside the DuckDB cache file.

| Item | Size per concept |
|------|----------------|
| `concept_name_embedding FLOAT[384]` column | 1,536 bytes |
| Intermediate `tmp_embeddings` table (dropped after run) | 1,536 bytes (transient) |
