# Cache Chunk Planning, Resume, and Fresh Copy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `create_cachedb_file_plugin` chunk large tables by row count rather than ID span, resume a failed copy at chunk granularity, and offer an opt-in `freshCopy` parameter that discards a distrusted partial copy — for both BigQuery and PostgreSQL sources.

**Architecture:** `chunk_utils.py` becomes a pure, database-free planner. A new `source_stats.py` holds every source-side SQL string and the two dialect adapters. A new `checkpoint.py` owns the two ephemeral status tables, the reset routine, and the fresh-copy arbitration. `copy.py` shrinks to orchestration. Only `copy.py` and `flow.py` import Prefect, so the planner, adapters, and checkpoint modules are testable with nothing but `pytest` and `duckdb`.

**Tech Stack:** Python 3.12, Prefect 3.6.10, DuckDB 1.4.0 (target, reached through Trex pgwire via psycopg2), SQLAlchemy 2.0.38 + `sqlalchemy-bigquery` 1.14.1 (source, direct), pytest 9.0.3.

**Spec:** `trex/specs/2026-08-06-cache-chunk-resume-design.md` (commit `3219ab85c`)

**Issue:** https://github.com/OHDSI/Data2Evidence/issues/3033

---

## Background: the defect

`plan_chunks()` at `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py:56-61` builds one predicate string per chunk in a loop bounded by the **span** of the chunk column:

```python
current = min_val
while current <= max_val:
    end = min(current + chunk_size - 1, max_val)
    chunks.append(f'"{chunk_col}" BETWEEN {current} AND {end}')
    current = end + 1
```

`len(chunks) == ceil((max_val - min_val + 1) / chunk_size)`. `row_count` is a parameter but is only consulted afterwards, at lines 67-71. A hash-generated `INT64` key spans ~1.8e19, so with BigQuery's fixed 5,000,000-row chunk size the loop runs ~3.7e12 times and the worker dies of memory exhaustion before copying a single row.

Two consequences shape the whole plan:

1. When `plan_chunks` returns `None`, `copy.py:340-344` runs `CREATE OR REPLACE TABLE … AS <select>` over the entire table. The team has banned that path after it failed above ~900M rows, so **every** route into it must be closed: the missing-`CHUNK_COLUMN_MAP` case, the `int()` cast bail at `chunk_utils.py:49-54`, and the density guard at `chunk_utils.py:67-71`.
2. `cleanup()` (`copy.py:67-74`) drops the target table on failure and the status table tracks whole tables only, so `retries=3` on `create_schema_tables_task` restarts a large table from chunk 0 every attempt. Bounded chunking alone would not make a 900M-row copy finish.

---

## File structure

**Create**

| Path | Responsibility |
|---|---|
| `plugins/flows/base/create_cachedb_file_plugin/errors.py` | Exception taxonomy. No imports beyond stdlib. |
| `plugins/flows/base/create_cachedb_file_plugin/planner_types.py` | `ChunkConfig`, `ChunkColumnCandidate`, `ChunkStats`, `ChunkPlan`, `ColumnKind`, `ChunkStrategy`. Dataclasses only. |
| `plugins/flows/base/create_cachedb_file_plugin/source_stats.py` | Every source-side SQL string, plus `PostgresSourceAdapter` / `BigQuerySourceAdapter` / `build_source_adapter`. |
| `plugins/flows/base/create_cachedb_file_plugin/checkpoint.py` | Status-table DDL, legacy detection, checkpoint CRUD, `reset_table`, `apply_fresh_copy`. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/__init__.py` | Test package marker. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/README.md` | How to run the suite. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py` | Pure planner unit tests, including the #3033 regression. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/test_planner_properties.py` | Disjointness/totality property tests against in-memory DuckDB. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py` | Golden-string tests for both dialects' SQL. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/test_checkpoint.py` | Checkpoint CRUD, legacy migration, reset. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/test_fresh_copy.py` | `freshCopy` semantics and once-per-run arbitration. |
| `plugins/flows/base/create_cachedb_file_plugin/tests/test_copy_integration.py` | End-to-end copy + kill + resume against local DuckDB. |

**Modify**

| Path | Change |
|---|---|
| `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py` | Rewritten as a pure planner. |
| `plugins/flows/base/create_cachedb_file_plugin/copy.py` | Orchestration only; status helpers move to `checkpoint.py`. |
| `plugins/flows/base/create_cachedb_file_plugin/types.py` | `fresh_copy` / `dry_run` on `CreateCacheOptions` and `CopyParameters`. |
| `plugins/flows/base/create_cachedb_file_plugin/flow.py` | Thread the two new parameters into `CopyParameters`. |
| `plugins/functions/alp-dataflow-gen-init/src/env.ts` | New `cache_chunk_timeout` Prefect variable. |
| `docker-compose.yml`, `plugins/functions/package.json`, `plugins/functions/package.org.json`, `charts/d2e-services/templates/d2e-deployment.yaml` | Mirror `CACHE_CHUNK_TIMEOUT` wherever `CACHE_TASK_TIMEOUT` appears. |

**Import discipline (load-bearing):** `errors.py`, `planner_types.py`, `chunk_utils.py`, `source_stats.py`, and `checkpoint.py` must never import `prefect`. They take a `logger` argument instead. This is what lets the bulk of the suite run in a bare virtualenv.

---

## Task 0: Test harness and package skeleton

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/__init__.py`
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/README.md`

- [ ] **Step 1: Create the virtualenv used by every later task**

```bash
python3 -m venv /tmp/cachevenv
/tmp/cachevenv/bin/pip install -q pytest==9.0.3 duckdb==1.4.0
/tmp/cachevenv/bin/pytest --version
```

Expected: `pytest 9.0.3`

- [ ] **Step 2: Create the test package marker**

`plugins/flows/base/create_cachedb_file_plugin/tests/__init__.py` — empty file.

```bash
touch plugins/flows/base/create_cachedb_file_plugin/tests/__init__.py
```

- [ ] **Step 3: Write the tests README**

`plugins/flows/base/create_cachedb_file_plugin/tests/README.md`:

````markdown
# create_cachedb_file_plugin tests

Two layers:

- **Pure suite** — `test_chunk_planner.py`, `test_planner_properties.py`,
  `test_source_adapter_sql.py`, `test_checkpoint.py`, `test_fresh_copy.py`.
  These import only `pytest` and `duckdb`; the modules under test never import
  `prefect`. Safe to run anywhere.
- **Integration** — `test_copy_integration.py`. Uses a local DuckDB file as both
  source and target. Slower; still no external services.

## Running

```sh
python3 -m venv /tmp/cachevenv
/tmp/cachevenv/bin/pip install pytest==9.0.3 duckdb==1.4.0

cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

`PYTHONPATH` needs both `plugins/flows/base` (for the plugin package) and
`plugins/flows` (for `_shared_flow_utils`), matching the convention in
`cohort_discovery_plugin/tests/README.md`.
````

- [ ] **Step 4: Verify collection works on an empty package**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

Expected: `no tests ran` (exit code 5), no collection errors.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/tests/
git commit -m "test: add test package for create_cachedb_file_plugin"
```

---

## Task 1: Error taxonomy and planner types

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/errors.py`
- Create: `plugins/flows/base/create_cachedb_file_plugin/planner_types.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py`

- [ ] **Step 1: Write the failing test**

`tests/test_chunk_planner.py`:

```python
from create_cachedb_file_plugin.errors import (
    CacheCopyError,
    ChunkCopyError,
    FreshCopyResetError,
    PlannerError,
    ReconciliationError,
)
from create_cachedb_file_plugin.planner_types import (
    ChunkColumnCandidate,
    ChunkConfig,
    ChunkStrategy,
    ColumnKind,
)


def test_all_errors_share_a_base():
    for err in (PlannerError, ChunkCopyError, ReconciliationError, FreshCopyResetError):
        assert issubclass(err, CacheCopyError)


def test_chunk_config_defaults():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    assert config.max_chunks == 2_000
    assert config.min_chunk_rows == 100_000
    assert config.small_table_threshold == 500_000
    assert config.dry_run is False


def test_chunk_column_candidate_is_hashable():
    column = ChunkColumnCandidate(
        name="measurement_id", kind=ColumnKind.MAPPED_ID, data_type="INT64", nullable=False
    )
    assert {column}
    assert ChunkStrategy.CHUNKED.value == "CHUNKED"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'create_cachedb_file_plugin.errors'`

- [ ] **Step 3: Write the implementation**

`plugins/flows/base/create_cachedb_file_plugin/errors.py`:

```python
class CacheCopyError(Exception):
    """Base class for every failure raised by the cache copy plugin."""


class PlannerError(CacheCopyError):
    """Chunk planning could not produce a usable plan."""


class ChunkCopyError(CacheCopyError):
    """A single chunk failed to copy after its retries were exhausted."""


class ReconciliationError(CacheCopyError):
    """Target row count did not match the source after all chunks completed."""


class FreshCopyResetError(CacheCopyError):
    """A freshCopy reset could not be applied cleanly; nothing was copied."""
```

`plugins/flows/base/create_cachedb_file_plugin/planner_types.py`:

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ColumnKind(str, Enum):
    """Why a column was chosen for chunking. Ordered by preference."""

    PARTITION = "PARTITION"
    CLUSTER = "CLUSTER"
    PRIMARY_KEY = "PRIMARY_KEY"
    MAPPED_ID = "MAPPED_ID"


class ChunkStrategy(str, Enum):
    SINGLE_STATEMENT = "SINGLE_STATEMENT"
    CHUNKED = "CHUNKED"


@dataclass(frozen=True)
class ChunkConfig:
    target_chunk_rows: int
    max_chunks: int = 2_000
    min_chunk_rows: int = 100_000
    small_table_threshold: int = 500_000
    dry_run: bool = False


@dataclass(frozen=True)
class ChunkColumnCandidate:
    name: str
    kind: ColumnKind
    data_type: str
    nullable: bool


@dataclass(frozen=True)
class ChunkStats:
    row_count: int
    row_count_is_exact: bool
    column: ChunkColumnCandidate | None
    boundaries: tuple[Any, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ChunkPlan:
    plan_id: str
    strategy: ChunkStrategy
    column_name: str | None
    column_kind: ColumnKind | None
    predicates: tuple[str, ...]
    estimated_rows_per_chunk: int
    includes_null_chunk: bool
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/errors.py \
        plugins/flows/base/create_cachedb_file_plugin/planner_types.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py
git commit -m "feat: add planner types and error taxonomy for cache chunking"
```

---

## Task 2: Row-count-driven, capped chunk count — the #3033 fix

This is the task that closes the issue. Everything else makes it safe and usable.

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_chunk_planner.py`:

```python
import pytest

from create_cachedb_file_plugin.chunk_utils import (
    resolve_chunk_count,
    resolve_target_chunk_rows,
)


def test_chunk_count_follows_row_count_not_span():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    assert resolve_chunk_count(900_000_000, config) == 180


def test_chunk_count_is_capped_for_hash_distributed_keys():
    """Regression for issue 3033.

    The old planner derived the count from the ID span, so a FARM_FINGERPRINT
    style INT64 key produced ~3.7e12 predicates and exhausted memory. The count
    must depend only on row_count and the cap.
    """
    config = ChunkConfig(target_chunk_rows=5_000_000, max_chunks=2_000)
    assert resolve_chunk_count(50_000_000_000, config) == 2_000


def test_chunk_count_respects_min_chunk_rows_floor():
    config = ChunkConfig(target_chunk_rows=1_000, min_chunk_rows=100_000)
    assert resolve_chunk_count(1_000_000, config) == 10


def test_chunk_count_never_below_one():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    assert resolve_chunk_count(0, config) == 1
    assert resolve_chunk_count(1, config) == 1


@pytest.mark.parametrize(
    "dialect,expected",
    [("bigquery", 5_000_000), ("postgres", 1_000_000), ("duckdb", 1_000_000)],
)
def test_target_chunk_rows_defaults_per_dialect(dialect, expected):
    assert resolve_target_chunk_rows(dialect, None) == expected


def test_target_chunk_rows_override_wins():
    assert resolve_target_chunk_rows("bigquery", 250_000) == 250_000
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: FAIL — `ImportError: cannot import name 'resolve_chunk_count'`

- [ ] **Step 3: Replace the head of `chunk_utils.py`**

Replace the whole file `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py` with:

```python
"""Pure chunk planning. This module must never import prefect or touch a database."""

from .planner_types import ChunkConfig

PLANNER_VERSION = 2

DEFAULT_TARGET_CHUNK_ROWS = {
    "bigquery": 5_000_000,
    "postgres": 1_000_000,
}
FALLBACK_TARGET_CHUNK_ROWS = 1_000_000


def resolve_target_chunk_rows(dialect: str, override: int | None) -> int:
    """Rows per chunk. An explicit chunkSize from the caller always wins."""
    if override is not None:
        return override
    return DEFAULT_TARGET_CHUNK_ROWS.get(dialect, FALLBACK_TARGET_CHUNK_ROWS)


def resolve_chunk_count(row_count: int, config: ChunkConfig) -> int:
    """Number of chunks, derived from row count and hard-capped.

    Deliberately independent of the chunk column's min/max span: deriving the
    count from the span is what made the planner allocate an unbounded list for
    hash-distributed keys (issue 3033).
    """
    if row_count <= 0:
        return 1
    n = -(-row_count // config.target_chunk_rows)  # ceil division
    n = min(n, config.max_chunks)
    n = min(n, max(1, row_count // config.min_chunk_rows))
    return max(1, n)


def find_column_case_insensitive(columns: list[str], target: str) -> str | None:
    if not target:
        return None
    for col in columns:
        if col.lower() == target.lower():
            return col
    return None
```

Note: `determine_chunk_size`, `plan_chunks`, and `COPY_STATUS_TABLE_NAME` are deliberately gone. `copy.py` still imports them and will not import until Task 6; that is expected and the pure tests do not touch `copy.py`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py
git commit -m "fix: derive chunk count from row count and cap it (#3033)"
```

---

## Task 3: SQL literals and half-open predicates

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_chunk_planner.py`:

```python
from datetime import date

from create_cachedb_file_plugin.chunk_utils import build_predicates, sql_literal
from create_cachedb_file_plugin.errors import PlannerError


def _column(nullable=False, name="measurement_id", data_type="INT64"):
    return ChunkColumnCandidate(
        name=name, kind=ColumnKind.MAPPED_ID, data_type=data_type, nullable=nullable
    )


def test_sql_literal_quotes_and_escapes():
    assert sql_literal(42) == "42"
    assert sql_literal("o'brien") == "'o''brien'"
    assert sql_literal(date(2020, 1, 31)) == "'2020-01-31'"


def test_sql_literal_rejects_unsupported_types():
    with pytest.raises(PlannerError):
        sql_literal(None)
    with pytest.raises(PlannerError):
        sql_literal(1.5)
    with pytest.raises(PlannerError):
        sql_literal(True)


def test_predicates_are_half_open_and_drop_outer_endpoints():
    # Quantile endpoints: min=0, cuts at 10 and 20, max=30.
    predicates = build_predicates(_column(), [0, 10, 20, 30])
    assert predicates == (
        '"measurement_id" < 10',
        '"measurement_id" >= 10 AND "measurement_id" < 20',
        '"measurement_id" >= 20',
    )


def test_nullable_column_gets_an_explicit_null_chunk():
    predicates = build_predicates(_column(nullable=True), [0, 10, 20])
    assert predicates[-1] == '"measurement_id" IS NULL'


def test_ties_collapse_to_a_single_chunk():
    predicates = build_predicates(_column(), [7, 7, 7, 7])
    assert predicates == ('"measurement_id" IS NOT NULL',)


def test_two_distinct_values_collapse_to_a_single_chunk():
    predicates = build_predicates(_column(), [1, 9])
    assert predicates == ('"measurement_id" IS NOT NULL',)


def test_date_boundaries_are_supported():
    predicates = build_predicates(
        _column(name="measurement_date", data_type="DATE"),
        [date(2019, 1, 1), date(2020, 1, 1), date(2021, 1, 1)],
    )
    assert predicates == (
        "\"measurement_date\" < '2020-01-01'",
        "\"measurement_date\" >= '2020-01-01'",
    )
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: FAIL — `ImportError: cannot import name 'build_predicates'`

- [ ] **Step 3: Append to `chunk_utils.py`**

Add these imports at the top of `chunk_utils.py`, merging with the existing import block:

```python
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Sequence

from .errors import PlannerError
from .planner_types import ChunkColumnCandidate, ChunkConfig
```

Then append:

```python
def sql_literal(value: Any) -> str:
    """Render a boundary value as a SQL literal for a DuckDB-side predicate."""
    if value is None:
        raise PlannerError("NULL cannot be used as a chunk boundary")
    if isinstance(value, bool):
        raise PlannerError("Boolean chunk boundaries are not supported")
    if isinstance(value, float):
        raise PlannerError(
            "Floating-point chunk boundaries are not supported: equality at the "
            "boundary is not reliable across the source and DuckDB"
        )
    if isinstance(value, (int, Decimal)):
        return str(value)
    if isinstance(value, (datetime, date)):
        return "'" + value.isoformat() + "'"
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    raise PlannerError(f"Unsupported chunk boundary type: {type(value).__name__}")


def build_predicates(
    column: ChunkColumnCandidate, raw_boundaries: Sequence[Any]
) -> tuple[str, ...]:
    """Turn quantile endpoints into disjoint, total, half-open predicates.

    `raw_boundaries` is the adapter's quantile output, which includes the
    minimum and maximum. Those outer endpoints are dropped: a `col < min`
    chunk is always empty, and `col >= max` is already covered by the final
    open-ended chunk.
    """
    quoted = f'"{column.name}"'
    cuts = sorted({value for value in raw_boundaries if value is not None})
    interior = cuts[1:-1] if len(cuts) > 2 else []

    predicates: list[str] = []
    if not interior:
        predicates.append(f"{quoted} IS NOT NULL")
    else:
        literals = [sql_literal(value) for value in interior]
        predicates.append(f"{quoted} < {literals[0]}")
        for low, high in zip(literals, literals[1:]):
            predicates.append(f"{quoted} >= {low} AND {quoted} < {high}")
        predicates.append(f"{quoted} >= {literals[-1]}")

    if column.nullable:
        predicates.append(f"{quoted} IS NULL")

    return tuple(predicates)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: 16 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py
git commit -m "feat: build half-open chunk predicates with an explicit NULL chunk"
```

---

## Task 4: `plan_chunks` and the plan identity hash

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_chunk_planner.py`:

```python
from create_cachedb_file_plugin.chunk_utils import compute_plan_id, plan_chunks
from create_cachedb_file_plugin.planner_types import ChunkStats


def _stats(row_count, boundaries=(), column=None, nullable=False):
    return ChunkStats(
        row_count=row_count,
        row_count_is_exact=True,
        column=column if column is not None else _column(nullable=nullable),
        boundaries=tuple(boundaries),
    )


def test_small_table_uses_a_single_statement():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    plan = plan_chunks("bigquery", "cdm", "person", _stats(499_999), config)
    assert plan.strategy is ChunkStrategy.SINGLE_STATEMENT
    assert plan.predicates == ()


def test_large_table_without_a_chunk_column_raises_rather_than_single_copying():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    stats = ChunkStats(
        row_count=900_000_000, row_count_is_exact=True, column=None, boundaries=()
    )
    with pytest.raises(PlannerError, match="no usable chunk column"):
        plan_chunks("bigquery", "cdm", "measurement", stats, config)


def test_large_table_is_chunked():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    boundaries = tuple(range(0, 181))
    plan = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, boundaries), config
    )
    assert plan.strategy is ChunkStrategy.CHUNKED
    assert plan.column_name == "measurement_id"
    assert len(plan.predicates) == 180
    assert plan.includes_null_chunk is False


def test_plan_never_exceeds_the_cap_plus_null_chunk():
    config = ChunkConfig(target_chunk_rows=5_000_000, max_chunks=10)
    boundaries = tuple(range(0, 12))
    plan = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, boundaries, nullable=True), config
    )
    assert len(plan.predicates) <= config.max_chunks + 1


def test_plan_id_is_stable_and_distribution_sensitive():
    a = compute_plan_id("bigquery", "cdm", "measurement", "measurement_id", 3, (1, 2, 3))
    b = compute_plan_id("bigquery", "cdm", "measurement", "measurement_id", 3, (1, 2, 3))
    c = compute_plan_id("bigquery", "cdm", "measurement", "measurement_id", 3, (1, 2, 4))
    assert a == b
    assert a != c
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: FAIL — `ImportError: cannot import name 'compute_plan_id'`

- [ ] **Step 3: Append to `chunk_utils.py`**

Add `import hashlib` to the top of the file, and extend the `planner_types` import to
`from .planner_types import ChunkColumnCandidate, ChunkConfig, ChunkPlan, ChunkStats, ChunkStrategy`.
Then append:

```python
def compute_plan_id(
    dialect: str,
    schema: str,
    table: str,
    column_name: str | None,
    chunk_count: int,
    boundaries: Sequence[Any],
) -> str:
    """Identity of a plan. A different id means the stored checkpoint is unusable."""
    parts = [
        str(PLANNER_VERSION),
        dialect,
        schema,
        table,
        str(column_name),
        str(chunk_count),
    ]
    parts.extend(repr(value) for value in boundaries)
    return hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()


def plan_chunks(
    dialect: str,
    schema: str,
    table: str,
    stats: ChunkStats,
    config: ChunkConfig,
) -> ChunkPlan:
    if stats.row_count < config.small_table_threshold:
        return ChunkPlan(
            plan_id=compute_plan_id(dialect, schema, table, None, 1, ()),
            strategy=ChunkStrategy.SINGLE_STATEMENT,
            column_name=None,
            column_kind=None,
            predicates=(),
            estimated_rows_per_chunk=stats.row_count,
            includes_null_chunk=False,
        )

    if stats.column is None:
        raise PlannerError(
            f"Table '{schema}.{table}' has {stats.row_count:,} rows but no usable "
            "chunk column was found. Refusing to fall back to an unbounded "
            "single-statement copy; see issue 3033."
        )

    chunk_count = resolve_chunk_count(stats.row_count, config)
    predicates = build_predicates(stats.column, stats.boundaries)

    return ChunkPlan(
        plan_id=compute_plan_id(
            dialect, schema, table, stats.column.name, chunk_count, stats.boundaries
        ),
        strategy=ChunkStrategy.CHUNKED,
        column_name=stats.column.name,
        column_kind=stats.column.kind,
        predicates=predicates,
        estimated_rows_per_chunk=max(1, stats.row_count // max(1, len(predicates))),
        includes_null_chunk=stats.column.nullable,
    )


def describe_plan(plan: ChunkPlan, schema: str, table: str) -> str:
    """One-line, log-friendly summary. Used by dry-run and by normal logging."""
    if plan.strategy is ChunkStrategy.SINGLE_STATEMENT:
        return f"{schema}.{table}: single statement (below small-table threshold)"
    return (
        f"{schema}.{table}: {len(plan.predicates)} chunks on "
        f"{plan.column_name} ({plan.column_kind.value}), "
        f"~{plan.estimated_rows_per_chunk:,} rows/chunk, "
        f"null_chunk={plan.includes_null_chunk}, plan_id={plan.plan_id[:12]}"
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: 21 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py
git commit -m "feat: assemble chunk plans with a stable plan identity hash"
```

---

## Task 5: Property tests — predicates are disjoint and total

Unit tests check shapes. This task mechanically proves the two invariants that make
chunking correct, against a real SQL engine.

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/test_planner_properties.py`

- [ ] **Step 1: Write the failing test**

`tests/test_planner_properties.py`:

```python
"""Every planned chunk set must partition the table exactly once.

Builds a real DuckDB table from a synthetic distribution, evaluates each
predicate, and asserts the per-predicate counts sum to the total including
NULLs. This is what catches boundary off-by-ones and dropped NULL rows.
"""

import duckdb
import pytest

from create_cachedb_file_plugin.chunk_utils import build_predicates, resolve_chunk_count
from create_cachedb_file_plugin.planner_types import (
    ChunkColumnCandidate,
    ChunkConfig,
    ColumnKind,
)

DISTRIBUTIONS = {
    "dense_sequential": [i for i in range(10_000)],
    "hash_uniform_int64": [(i * 6364136223846793005) % (2**62) for i in range(10_000)],
    "offset_sharded": (
        [10**12 + i for i in range(3_000)]
        + [2 * 10**12 + i for i in range(3_000)]
        + [3 * 10**12 + i for i in range(4_000)]
    ),
    "heavy_ties": [i % 25 for i in range(10_000)],
    "single_value": [7] * 10_000,
}


def _quantiles(con, n):
    rows = con.execute(
        f"SELECT quantile_disc(chunk_col, [{', '.join(str(i / n) for i in range(n + 1))}]) "
        "FROM t WHERE chunk_col IS NOT NULL"
    ).fetchone()[0]
    return list(rows)


@pytest.mark.parametrize("name", sorted(DISTRIBUTIONS))
@pytest.mark.parametrize("null_fraction", [0.0, 0.1])
def test_predicates_partition_the_table(name, null_fraction):
    values = list(DISTRIBUTIONS[name])
    nullable = null_fraction > 0.0
    if nullable:
        for i in range(0, len(values), int(1 / null_fraction)):
            values[i] = None

    con = duckdb.connect()
    con.execute("CREATE TABLE t (chunk_col BIGINT)")
    con.executemany("INSERT INTO t VALUES (?)", [(v,) for v in values])

    total = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
    config = ChunkConfig(target_chunk_rows=1_000, min_chunk_rows=100, max_chunks=50)
    n = resolve_chunk_count(total, config)

    column = ChunkColumnCandidate(
        name="chunk_col", kind=ColumnKind.MAPPED_ID, data_type="BIGINT", nullable=nullable
    )
    predicates = build_predicates(column, _quantiles(con, n))

    counts = [
        con.execute(f"SELECT COUNT(*) FROM t WHERE {p}").fetchone()[0] for p in predicates
    ]
    assert sum(counts) == total, f"{name}: chunks cover {sum(counts)} of {total} rows"

    # Disjointness: no row satisfies two predicates.
    overlap_expr = " + ".join(f"CASE WHEN {p} THEN 1 ELSE 0 END" for p in predicates)
    max_hits = con.execute(f"SELECT MAX({overlap_expr}) FROM t").fetchone()[0]
    assert max_hits == 1, f"{name}: a row matched {max_hits} predicates"

    assert len(predicates) <= config.max_chunks + 1
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_planner_properties.py -v
```

Expected: the file imports cleanly and the 10 parametrised cases run. If any FAIL, the
planner from Tasks 2-4 has a boundary bug — fix `build_predicates`, do not weaken the test.

- [ ] **Step 3: Fix any failures in `build_predicates`**

No new production code is expected. If `heavy_ties` or `single_value` fail, the collapse
branch in `build_predicates` is wrong; if the `null_fraction=0.1` cases fail, the NULL chunk
is missing or double-counted.

- [ ] **Step 4: Run the whole pure suite**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

Expected: 21 + 10 = 31 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/tests/test_planner_properties.py
git commit -m "test: prove chunk predicates partition the table for five distributions"
```

---

## Task 6: Keep `copy.py` importable

Tasks 2-4 deleted `determine_chunk_size`, the old `plan_chunks`, and `COPY_STATUS_TABLE_NAME`
from `chunk_utils.py`. `copy.py:16` still imports all three. This task restores importability
without yet changing behaviour, so the repository is never left broken between commits.

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py:16`
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py:281-360`

- [ ] **Step 1: Confirm the breakage**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." python3 -c "import ast,sys; ast.parse(open('create_cachedb_file_plugin/copy.py').read())" && grep -n "from .chunk_utils import" create_cachedb_file_plugin/copy.py
```

Expected: line 16 imports `determine_chunk_size, plan_chunks, find_column_case_insensitive, COPY_STATUS_TABLE_NAME`.

- [ ] **Step 2: Narrow the import**

In `copy.py`, replace line 16:

```python
from .chunk_utils import determine_chunk_size, plan_chunks, find_column_case_insensitive, COPY_STATUS_TABLE_NAME
```

with:

```python
from .chunk_utils import find_column_case_insensitive

COPY_STATUS_TABLE_NAME = "table_copy_status"
```

The local constant is temporary; Task 9 moves it to `checkpoint.py`.

- [ ] **Step 3: Stub the chunked branch so nothing silently single-copies**

In `copy_table`, replace the whole `else:` branch body at `copy.py:307-356` with:

```python
        else:
            logger.info(f"Copying table '{table}' (large, {row_count} rows)")
            raise NotImplementedError(
                "Chunked copy is being rewritten for issue 3033; wired up in Task 14"
            )
```

This deliberately fails loudly rather than reaching the banned unbounded copy at any point
during the rewrite.

- [ ] **Step 4: Verify the module parses and the pure suite still passes**

```bash
cd plugins/flows/base && python3 -c "import ast; ast.parse(open('create_cachedb_file_plugin/copy.py').read()); print('parsed')"
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
```

Expected: `parsed`, then 31 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py
git commit -m "refactor: narrow copy.py planner imports during the chunking rewrite"
```

---

## Task 7: Source SQL builders for both dialects

Every source-side SQL string lives in one module as a pure function, so BigQuery SQL is
covered in CI without credentials.

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/source_stats.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py`

- [ ] **Step 1: Write the failing test**

`tests/test_source_adapter_sql.py`:

```python
from create_cachedb_file_plugin.source_stats import (
    bq_boundaries_sql,
    bq_candidates_sql,
    bq_exact_count_sql,
    bq_row_count_sql,
    pg_boundaries_sql,
    pg_candidates_sql,
    pg_exact_count_sql,
    pg_row_count_estimate_sql,
)


def test_bq_row_count_reads_metadata_not_the_table():
    sql = bq_row_count_sql("cdm", "measurement")
    assert sql == (
        "SELECT SUM(row_count) AS row_count FROM `cdm.__TABLES__` "
        "WHERE table_id = 'measurement'"
    )
    assert "COUNT(*)" not in sql


def test_bq_boundaries_uses_approx_quantiles():
    assert bq_boundaries_sql("cdm", "measurement", "measurement_id", 180) == (
        "SELECT APPROX_QUANTILES(`measurement_id`, 180) AS bounds "
        "FROM `cdm.measurement`"
    )


def test_bq_candidates_expose_partition_and_cluster_metadata():
    sql = bq_candidates_sql("cdm", "measurement")
    assert "`cdm.INFORMATION_SCHEMA.COLUMNS`" in sql
    assert "is_partitioning_column" in sql
    assert "clustering_ordinal_position" in sql
    assert "WHERE table_name = 'measurement'" in sql


def test_bq_exact_count():
    assert bq_exact_count_sql("cdm", "measurement") == (
        "SELECT COUNT(*) FROM `cdm.measurement`"
    )


def test_pg_row_count_is_an_estimate():
    assert pg_row_count_estimate_sql("cdm", "measurement") == (
        "SELECT reltuples::bigint AS row_count FROM pg_class "
        "WHERE oid = to_regclass('\"cdm\".\"measurement\"')"
    )


def test_pg_boundaries_use_percentile_disc():
    sql = pg_boundaries_sql("cdm", "measurement", "measurement_id", 4)
    assert sql == (
        "SELECT unnest(percentile_disc(ARRAY[0.000000, 0.250000, 0.500000, "
        "0.750000, 1.000000]) WITHIN GROUP (ORDER BY \"measurement_id\")) "
        "FROM \"cdm\".\"measurement\""
    )


def test_pg_candidates_find_single_column_integer_primary_keys():
    sql = pg_candidates_sql("cdm", "measurement")
    assert "indisprimary" in sql
    assert "array_length(i.indkey, 1) = 1" in sql


def test_pg_exact_count():
    assert pg_exact_count_sql("cdm", "measurement") == (
        'SELECT COUNT(*) FROM "cdm"."measurement"'
    )


def test_identifiers_with_quotes_are_rejected_not_interpolated():
    import pytest

    from create_cachedb_file_plugin.errors import PlannerError

    with pytest.raises(PlannerError):
        pg_exact_count_sql("cdm", 'measurement"; DROP TABLE x --')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'create_cachedb_file_plugin.source_stats'`

- [ ] **Step 3: Write `source_stats.py` (SQL builders only)**

`plugins/flows/base/create_cachedb_file_plugin/source_stats.py`:

```python
"""Source-side statistics. This module must never import prefect.

BigQuery identifiers follow the convention already used by the plugin: the
`schema` value is the dataset and the connection supplies the project, so
tables are written `` `dataset.table` `` with no project prefix.
"""

import re

from .errors import PlannerError

_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*$")


def _check_identifier(value: str, what: str) -> str:
    if not _IDENTIFIER.match(value or ""):
        raise PlannerError(f"Unsafe {what} for SQL generation: {value!r}")
    return value


# --- BigQuery -----------------------------------------------------------


def bq_row_count_sql(dataset: str, table: str) -> str:
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    return (
        f"SELECT SUM(row_count) AS row_count FROM `{dataset}.__TABLES__` "
        f"WHERE table_id = '{table}'"
    )


def bq_exact_count_sql(dataset: str, table: str) -> str:
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    return f"SELECT COUNT(*) FROM `{dataset}.{table}`"


def bq_candidates_sql(dataset: str, table: str) -> str:
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    return (
        "SELECT column_name, data_type, is_nullable, is_partitioning_column, "
        "clustering_ordinal_position "
        f"FROM `{dataset}.INFORMATION_SCHEMA.COLUMNS` "
        f"WHERE table_name = '{table}' ORDER BY ordinal_position"
    )


def bq_boundaries_sql(dataset: str, table: str, column: str, n: int) -> str:
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    return (
        f"SELECT APPROX_QUANTILES(`{column}`, {int(n)}) AS bounds "
        f"FROM `{dataset}.{table}`"
    )


# --- PostgreSQL ---------------------------------------------------------


def pg_row_count_estimate_sql(schema: str, table: str) -> str:
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    return (
        "SELECT reltuples::bigint AS row_count FROM pg_class "
        f"WHERE oid = to_regclass('\"{schema}\".\"{table}\"')"
    )


def pg_exact_count_sql(schema: str, table: str) -> str:
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    return f'SELECT COUNT(*) FROM "{schema}"."{table}"'


def pg_candidates_sql(schema: str, table: str) -> str:
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    return (
        "SELECT a.attname AS column_name, "
        "format_type(a.atttypid, a.atttypmod) AS data_type, "
        "NOT a.attnotnull AS nullable "
        "FROM pg_index i "
        "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) "
        f"WHERE i.indrelid = to_regclass('\"{schema}\".\"{table}\"') "
        "AND i.indisprimary AND array_length(i.indkey, 1) = 1"
    )


def pg_column_meta_sql(schema: str, table: str, column: str) -> str:
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    return (
        "SELECT format_type(a.atttypid, a.atttypmod) AS data_type, "
        "NOT a.attnotnull AS nullable FROM pg_attribute a "
        f"WHERE a.attrelid = to_regclass('\"{schema}\".\"{table}\"') "
        f"AND a.attname = '{column}' AND a.attnum > 0 AND NOT a.attisdropped"
    )


def pg_boundaries_sql(schema: str, table: str, column: str, n: int) -> str:
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    fractions = ", ".join(f"{i / n:.6f}" for i in range(int(n) + 1))
    return (
        f"SELECT unnest(percentile_disc(ARRAY[{fractions}]) "
        f'WITHIN GROUP (ORDER BY "{column}")) '
        f'FROM "{schema}"."{table}"'
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -v
```

Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/source_stats.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py
git commit -m "feat: add dialect SQL builders for row counts, candidates and boundaries"
```

---

## Task 8: Dialect adapters and chunk-column selection

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/source_stats.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_source_adapter_sql.py`:

```python
from create_cachedb_file_plugin.planner_types import ColumnKind
from create_cachedb_file_plugin.source_stats import (
    ORDERABLE_BQ_TYPES,
    ORDERABLE_PG_TYPES,
    pick_bq_candidate,
    pick_pg_candidate,
)

# (column_name, data_type, is_nullable, is_partitioning_column, clustering_ordinal_position)
BQ_ROWS = [
    ("measurement_id", "INT64", "NO", "NO", None),
    ("person_id", "INT64", "NO", "NO", 1),
    ("measurement_date", "DATE", "YES", "YES", None),
    ("value_source_value", "STRING", "YES", "NO", None),
    ("payload", "JSON", "YES", "NO", None),
]


def test_bq_prefers_the_partition_column():
    candidate = pick_bq_candidate(BQ_ROWS, mapped_column="measurement_id")
    assert candidate.name == "measurement_date"
    assert candidate.kind is ColumnKind.PARTITION
    assert candidate.nullable is True


def test_bq_falls_back_to_the_cluster_column():
    rows = [r for r in BQ_ROWS if r[0] != "measurement_date"]
    candidate = pick_bq_candidate(rows, mapped_column="measurement_id")
    assert candidate.name == "person_id"
    assert candidate.kind is ColumnKind.CLUSTER


def test_bq_falls_back_to_the_mapped_surrogate_id():
    rows = [r for r in BQ_ROWS if r[0] not in {"measurement_date", "person_id"}]
    candidate = pick_bq_candidate(rows, mapped_column="measurement_id")
    assert candidate.name == "measurement_id"
    assert candidate.kind is ColumnKind.MAPPED_ID


def test_bq_returns_none_when_no_orderable_candidate_exists():
    assert pick_bq_candidate([("payload", "JSON", "YES", "NO", None)], mapped_column=None) is None


def test_non_orderable_types_are_excluded():
    assert "JSON" not in ORDERABLE_BQ_TYPES
    assert "BOOL" not in ORDERABLE_BQ_TYPES
    assert "boolean" not in ORDERABLE_PG_TYPES


def test_pg_prefers_the_single_column_primary_key():
    candidate = pick_pg_candidate(
        [("measurement_id", "bigint", False)], mapped_column="measurement_id"
    )
    assert candidate.kind is ColumnKind.PRIMARY_KEY
    assert candidate.name == "measurement_id"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -v
```

Expected: FAIL — `ImportError: cannot import name 'pick_bq_candidate'`

- [ ] **Step 3: Append selection logic and adapters to `source_stats.py`**

Add to the imports at the top of `source_stats.py`:

```python
import sqlalchemy as sql

from .chunk_utils import resolve_chunk_count
from .filter import CHUNK_COLUMN_MAP
from .planner_types import ChunkColumnCandidate, ChunkConfig, ChunkStats, ColumnKind
from _shared_flow_utils.types import SupportedDatabaseDialects
```

Then append:

```python
ORDERABLE_BQ_TYPES = {
    "INT64", "INTEGER", "NUMERIC", "BIGNUMERIC", "DECIMAL",
    "DATE", "DATETIME", "TIMESTAMP", "STRING",
}

ORDERABLE_PG_TYPES = {
    "smallint", "integer", "bigint", "numeric", "decimal",
    "date", "timestamp without time zone", "timestamp with time zone",
    "text", "character varying", "character",
}


def _bq_type_is_orderable(data_type: str) -> bool:
    return (data_type or "").split("(")[0].strip().upper() in ORDERABLE_BQ_TYPES


def _pg_type_is_orderable(data_type: str) -> bool:
    return (data_type or "").split("(")[0].strip().lower() in ORDERABLE_PG_TYPES


def pick_bq_candidate(rows, mapped_column: str | None) -> ChunkColumnCandidate | None:
    """Priority: partitioning column, then lowest-ordinal cluster column, then mapped id."""
    partition = None
    clusters = []
    mapped = None

    for name, data_type, is_nullable, is_partitioning, cluster_ordinal in rows:
        if not _bq_type_is_orderable(data_type):
            continue
        nullable = str(is_nullable).upper() == "YES"
        if str(is_partitioning).upper() == "YES" and partition is None:
            partition = ChunkColumnCandidate(name, ColumnKind.PARTITION, data_type, nullable)
        if cluster_ordinal is not None:
            clusters.append(
                (int(cluster_ordinal), ChunkColumnCandidate(name, ColumnKind.CLUSTER, data_type, nullable))
            )
        if mapped_column and name.lower() == mapped_column.lower():
            mapped = ChunkColumnCandidate(name, ColumnKind.MAPPED_ID, data_type, nullable)

    if partition is not None:
        return partition
    if clusters:
        return min(clusters, key=lambda pair: pair[0])[1]
    return mapped


def pick_pg_candidate(pk_rows, mapped_column: str | None, mapped_meta=None):
    """Priority: single-column primary key, then the mapped id."""
    for name, data_type, nullable in pk_rows:
        if _pg_type_is_orderable(data_type):
            return ChunkColumnCandidate(name, ColumnKind.PRIMARY_KEY, data_type, bool(nullable))
    if mapped_column and mapped_meta:
        data_type, nullable = mapped_meta
        if _pg_type_is_orderable(data_type):
            return ChunkColumnCandidate(
                mapped_column, ColumnKind.MAPPED_ID, data_type, bool(nullable)
            )
    return None


class _BaseAdapter:
    def __init__(self, read_conn):
        self.read_conn = read_conn
        self.dialect = read_conn.tenant_configs.dialect

    def _rows(self, statement: str):
        with self.read_conn.engine.connect() as connection:
            return connection.execute(sql.text(statement)).fetchall()

    def _scalar(self, statement: str):
        with self.read_conn.engine.connect() as connection:
            return connection.execute(sql.text(statement)).scalar()

    def collect(self, schema: str, table: str, config: ChunkConfig, logger) -> ChunkStats:
        row_count, is_exact = self.count_rows(schema, table)
        if row_count < config.small_table_threshold:
            return ChunkStats(row_count, is_exact, None, ())
        column = self.pick_chunk_column(schema, table)
        if column is None:
            return ChunkStats(row_count, is_exact, None, ())
        n = resolve_chunk_count(row_count, config)
        logger.info(
            f"Chunk column for '{schema}.{table}': {column.name} "
            f"({column.kind.value}, {column.data_type}, nullable={column.nullable}); "
            f"requesting {n} quantile buckets"
        )
        boundaries = self.column_boundaries(schema, table, column.name, n)
        return ChunkStats(row_count, is_exact, column, tuple(boundaries))


class BigQuerySourceAdapter(_BaseAdapter):
    def count_rows(self, schema, table):
        value = self._scalar(bq_row_count_sql(schema, table))
        if value is None:  # views and external tables have no __TABLES__ row
            return int(self._scalar(bq_exact_count_sql(schema, table)) or 0), True
        return int(value), True

    def count_rows_exact(self, schema, table):
        # Decision D4: metadata row count, free. Switch to bq_exact_count_sql if the
        # dataset uses the streaming API, where __TABLES__ is eventually consistent.
        return self.count_rows(schema, table)[0]

    def pick_chunk_column(self, schema, table):
        rows = self._rows(bq_candidates_sql(schema, table))
        return pick_bq_candidate(rows, CHUNK_COLUMN_MAP.get(table))

    def column_boundaries(self, schema, table, column, n):
        row = self._rows(bq_boundaries_sql(schema, table, column, n))
        return list(row[0][0]) if row and row[0][0] else []


class PostgresSourceAdapter(_BaseAdapter):
    def count_rows(self, schema, table):
        estimate = self._scalar(pg_row_count_estimate_sql(schema, table))
        estimate = int(estimate or 0)
        return estimate, False

    def count_rows_exact(self, schema, table):
        return int(self._scalar(pg_exact_count_sql(schema, table)) or 0)

    def pick_chunk_column(self, schema, table):
        pk_rows = self._rows(pg_candidates_sql(schema, table))
        mapped = CHUNK_COLUMN_MAP.get(table)
        mapped_meta = None
        if mapped:
            meta = self._rows(pg_column_meta_sql(schema, table, mapped))
            if meta:
                mapped_meta = (meta[0][0], meta[0][1])
        return pick_pg_candidate(pk_rows, mapped, mapped_meta)

    def column_boundaries(self, schema, table, column, n):
        return [row[0] for row in self._rows(pg_boundaries_sql(schema, table, column, n))]


def build_source_adapter(read_conn):
    dialect = read_conn.tenant_configs.dialect
    if dialect == SupportedDatabaseDialects.BIGQUERY.value:
        return BigQuerySourceAdapter(read_conn)
    if dialect == SupportedDatabaseDialects.POSTGRES.value:
        return PostgresSourceAdapter(read_conn)
    raise PlannerError(f"No chunk-planning adapter for dialect '{dialect}'")
```

Postgres note: `count_rows` returns an estimate, so a table straddling
`small_table_threshold` may take the wrong branch. Task 14 resolves that by calling
`count_rows_exact` whenever the estimate is within 20% of the threshold.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -v
```

Expected: 15 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/source_stats.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py
git commit -m "feat: add BigQuery and Postgres chunk-statistics adapters"
```

---

## Task 9: Status tables, legacy detection, and checkpoint CRUD

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/checkpoint.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_checkpoint.py`

- [ ] **Step 1: Write the failing test**

`tests/test_checkpoint.py`:

```python
import logging

import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    COPY_RUN_TABLE_NAME,
    COPY_STATUS_TABLE_NAME,
    ensure_status_tables,
    mark_complete,
    mark_failed,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
)

LOGGER = logging.getLogger("test")
DB = "memory"
SCHEMA = "cdm"


@pytest.fixture
def con():
    connection = duckdb.connect()
    connection.execute(f'CREATE SCHEMA IF NOT EXISTS "{SCHEMA}"')
    return connection


def test_ensure_creates_both_tables(con):
    ensure_status_tables(con, DB, SCHEMA, LOGGER)
    names = {
        row[0]
        for row in con.execute(
            "SELECT table_name FROM information_schema.tables "
            f"WHERE table_schema = '{SCHEMA}'"
        ).fetchall()
    }
    assert COPY_STATUS_TABLE_NAME in names
    assert COPY_RUN_TABLE_NAME in names


def test_legacy_status_table_is_detected_and_recreated(con):
    con.execute(
        f'CREATE TABLE "{SCHEMA}"."{COPY_STATUS_TABLE_NAME}" ('
        "table_name TEXT PRIMARY KEY, status TEXT, "
        "started_at TIMESTAMP, completed_at TIMESTAMP)"
    )
    con.execute(
        f'INSERT INTO "{SCHEMA}"."{COPY_STATUS_TABLE_NAME}" VALUES '
        "('person', 'COMPLETE', NULL, NULL)"
    )

    ensure_status_tables(con, DB, SCHEMA, LOGGER)

    columns = {
        row[0]
        for row in con.execute(
            "SELECT column_name FROM information_schema.columns "
            f"WHERE table_schema = '{SCHEMA}' AND table_name = '{COPY_STATUS_TABLE_NAME}'"
        ).fetchall()
    }
    assert {"plan_id", "chunks_total", "chunks_completed", "rows_expected"} <= columns
    remaining = con.execute(
        f'SELECT COUNT(*) FROM "{SCHEMA}"."{COPY_STATUS_TABLE_NAME}"'
    ).fetchone()[0]
    assert remaining == 0, "legacy rows must not survive the recreate"


def test_checkpoint_round_trip(con):
    ensure_status_tables(con, DB, SCHEMA, LOGGER)
    mark_in_progress(con, DB, SCHEMA, "measurement", "plan-abc", 180, 900_000_000)

    checkpoint = read_checkpoint(con, DB, SCHEMA, "measurement")
    assert checkpoint.status == "IN_PROGRESS"
    assert checkpoint.plan_id == "plan-abc"
    assert checkpoint.chunks_total == 180
    assert checkpoint.chunks_completed == 0

    record_chunk_progress(con, DB, SCHEMA, "measurement", 42)
    assert read_checkpoint(con, DB, SCHEMA, "measurement").chunks_completed == 42

    mark_complete(con, DB, SCHEMA, "measurement")
    assert read_checkpoint(con, DB, SCHEMA, "measurement").status == "COMPLETE"

    mark_failed(con, DB, SCHEMA, "measurement")
    assert read_checkpoint(con, DB, SCHEMA, "measurement").status == "FAILED"


def test_read_checkpoint_returns_none_for_unknown_table(con):
    ensure_status_tables(con, DB, SCHEMA, LOGGER)
    assert read_checkpoint(con, DB, SCHEMA, "nope") is None
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_checkpoint.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'create_cachedb_file_plugin.checkpoint'`

- [ ] **Step 3: Write `checkpoint.py`**

`plugins/flows/base/create_cachedb_file_plugin/checkpoint.py`:

```python
"""Copy checkpointing. This module must never import prefect.

Both tables are ephemeral: they are created on demand and dropped once a schema
copy succeeds, so they only exist between a failure and the next run.
"""

from dataclasses import dataclass

COPY_STATUS_TABLE_NAME = "table_copy_status"
COPY_RUN_TABLE_NAME = "copy_run_status"

REQUIRED_STATUS_COLUMNS = {
    "table_name",
    "status",
    "started_at",
    "completed_at",
    "plan_id",
    "chunks_total",
    "chunks_completed",
    "rows_expected",
}


@dataclass(frozen=True)
class TableCheckpoint:
    table_name: str
    status: str
    plan_id: str | None
    chunks_total: int | None
    chunks_completed: int


def _qualify(database: str, schema: str, table: str) -> str:
    return f'"{database}"."{schema}"."{table}"'


def _fetchall(conn, statement: str):
    conn.execute(statement)
    return conn.fetchall()


def _fetchone(conn, statement: str):
    conn.execute(statement)
    return conn.fetchone()


def _status_columns(conn, schema: str, table: str) -> set[str]:
    rows = _fetchall(
        conn,
        "SELECT column_name FROM information_schema.columns "
        f"WHERE table_schema = '{schema}' AND table_name = '{table}'",
    )
    return {row[0] for row in rows}


def ensure_status_tables(conn, database: str, schema: str, logger) -> None:
    existing = _status_columns(conn, schema, COPY_STATUS_TABLE_NAME)
    if existing and not REQUIRED_STATUS_COLUMNS <= existing:
        logger.warning(
            f"Status table '{schema}.{COPY_STATUS_TABLE_NAME}' predates chunk-level "
            f"resume (columns: {sorted(existing)}). Recreating it; all tables will be "
            "treated as not started."
        )
        conn.execute(f"DROP TABLE {_qualify(database, schema, COPY_STATUS_TABLE_NAME)}")

    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} ("
        "  table_name TEXT PRIMARY KEY,"
        "  status TEXT,"
        "  started_at TIMESTAMP,"
        "  completed_at TIMESTAMP,"
        "  plan_id TEXT,"
        "  chunks_total INTEGER,"
        "  chunks_completed INTEGER,"
        "  rows_expected BIGINT"
        ")"
    )
    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {_qualify(database, schema, COPY_RUN_TABLE_NAME)} ("
        "  flow_run_id TEXT,"
        "  target_schema TEXT,"
        "  reset_applied_at TIMESTAMP,"
        "  PRIMARY KEY (flow_run_id, target_schema)"
        ")"
    )


def read_checkpoint(conn, database: str, schema: str, table: str) -> TableCheckpoint | None:
    row = _fetchone(
        conn,
        "SELECT table_name, status, plan_id, chunks_total, chunks_completed "
        f"FROM {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} "
        f"WHERE table_name = '{table}'",
    )
    if row is None:
        return None
    return TableCheckpoint(
        table_name=row[0],
        status=row[1],
        plan_id=row[2],
        chunks_total=row[3],
        chunks_completed=int(row[4] or 0),
    )


def mark_in_progress(
    conn, database: str, schema: str, table: str,
    plan_id: str, chunks_total: int, rows_expected: int,
) -> None:
    conn.execute(
        f"INSERT INTO {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} "
        "(table_name, status, started_at, completed_at, plan_id, chunks_total, "
        " chunks_completed, rows_expected) VALUES "
        f"('{table}', 'IN_PROGRESS', CAST(NOW() AS TIMESTAMP), NULL, '{plan_id}', "
        f" {int(chunks_total)}, 0, {int(rows_expected)}) "
        "ON CONFLICT(table_name) DO UPDATE SET "
        "  status = 'IN_PROGRESS', started_at = CAST(NOW() AS TIMESTAMP), "
        "  completed_at = NULL, plan_id = EXCLUDED.plan_id, "
        "  chunks_total = EXCLUDED.chunks_total, rows_expected = EXCLUDED.rows_expected"
    )


def record_chunk_progress(conn, database: str, schema: str, table: str, completed: int) -> None:
    conn.execute(
        f"UPDATE {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} "
        f"SET chunks_completed = {int(completed)} WHERE table_name = '{table}'"
    )


def mark_complete(conn, database: str, schema: str, table: str) -> None:
    conn.execute(
        f"UPDATE {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} "
        "SET status = 'COMPLETE', completed_at = CAST(NOW() AS TIMESTAMP) "
        f"WHERE table_name = '{table}'"
    )


def mark_failed(conn, database: str, schema: str, table: str) -> None:
    """Mark FAILED and preserve the target table and the checkpoint.

    The old cleanup() dropped the target here; that is exactly what made retries
    restart a large table from chunk 0. Never reintroduce a DROP on this path.
    """
    conn.execute(
        f"UPDATE {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} "
        f"SET status = 'FAILED' WHERE table_name = '{table}'"
    )


def drop_status_tables(conn, database: str, schema: str) -> None:
    conn.execute(f"DROP TABLE IF EXISTS {_qualify(database, schema, COPY_STATUS_TABLE_NAME)}")
    conn.execute(f"DROP TABLE IF EXISTS {_qualify(database, schema, COPY_RUN_TABLE_NAME)}")
```

Note on `_fetchall`/`_fetchone`: this mirrors the existing pattern at `copy.py:210-215`,
where `write_conn` is either a psycopg2 cursor (Trex pgwire) or a DuckDB connection. Both
expose `execute` followed by `fetchall`/`fetchone`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_checkpoint.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/checkpoint.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_checkpoint.py
git commit -m "feat: add chunk-level checkpoint tables with legacy-shape migration"
```

---

## Task 10: `reset_table` and the `freshCopy` arbitration

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/checkpoint.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_fresh_copy.py`

- [ ] **Step 1: Write the failing test**

`tests/test_fresh_copy.py`:

```python
import logging

import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    COPY_RUN_TABLE_NAME,
    apply_fresh_copy,
    ensure_status_tables,
    mark_complete,
    mark_in_progress,
    read_checkpoint,
    reset_table,
)
from create_cachedb_file_plugin.errors import FreshCopyResetError

LOGGER = logging.getLogger("test")
DB = "memory"
SCHEMA = "cdm"
RUN = "flow-run-1"


@pytest.fixture
def con():
    connection = duckdb.connect()
    connection.execute(f'CREATE SCHEMA IF NOT EXISTS "{SCHEMA}"')
    ensure_status_tables(connection, DB, SCHEMA, LOGGER)
    return connection


def _seed(con, table, status, rows):
    con.execute(f'CREATE OR REPLACE TABLE "{SCHEMA}"."{table}" (id BIGINT)')
    if rows:
        con.execute(
            f'INSERT INTO "{SCHEMA}"."{table}" SELECT * FROM range({rows})'
        )
    mark_in_progress(con, DB, SCHEMA, table, "plan-1", 10, rows)
    if status == "COMPLETE":
        mark_complete(con, DB, SCHEMA, table)


def _table_exists(con, table):
    return bool(
        con.execute(
            "SELECT COUNT(*) FROM information_schema.tables "
            f"WHERE table_schema = '{SCHEMA}' AND table_name = '{table}'"
        ).fetchone()[0]
    )


def test_reset_table_drops_data_and_checkpoint(con):
    _seed(con, "measurement", "IN_PROGRESS", 100)
    discarded = reset_table(con, DB, SCHEMA, "measurement", LOGGER)
    assert discarded == 100
    assert not _table_exists(con, "measurement")
    assert read_checkpoint(con, DB, SCHEMA, "measurement") is None


def test_fresh_copy_discards_only_incomplete_tables(con):
    _seed(con, "measurement", "IN_PROGRESS", 100)
    _seed(con, "person", "COMPLETE", 50)

    reset = apply_fresh_copy(con, DB, SCHEMA, RUN, dry_run=False, logger=LOGGER)

    assert reset == ["measurement"]
    assert not _table_exists(con, "measurement")
    assert _table_exists(con, "person")
    assert read_checkpoint(con, DB, SCHEMA, "person").status == "COMPLETE"


def test_fresh_copy_is_applied_once_per_run_and_schema(con):
    _seed(con, "measurement", "IN_PROGRESS", 100)
    assert apply_fresh_copy(con, DB, SCHEMA, RUN, dry_run=False, logger=LOGGER) == ["measurement"]

    # Simulate a Prefect task retry inside the same flow run.
    _seed(con, "measurement", "IN_PROGRESS", 40)
    assert apply_fresh_copy(con, DB, SCHEMA, RUN, dry_run=False, logger=LOGGER) == []
    assert _table_exists(con, "measurement"), "a retry must not wipe the retry's own progress"


def test_a_second_schema_in_the_same_run_gets_its_own_reset(con):
    con.execute('CREATE SCHEMA IF NOT EXISTS "results"')
    ensure_status_tables(con, DB, "results", LOGGER)
    _seed(con, "measurement", "IN_PROGRESS", 100)

    assert apply_fresh_copy(con, DB, SCHEMA, RUN, dry_run=False, logger=LOGGER) == ["measurement"]
    rows = con.execute(
        f'SELECT COUNT(*) FROM "{SCHEMA}"."{COPY_RUN_TABLE_NAME}" '
        f"WHERE flow_run_id = '{RUN}' AND target_schema = '{SCHEMA}'"
    ).fetchone()[0]
    assert rows == 1

    # The results schema keeps its own arbitration row, so it still resets.
    assert apply_fresh_copy(con, DB, "results", RUN, dry_run=False, logger=LOGGER) == []


def test_dry_run_reports_without_destroying(con):
    _seed(con, "measurement", "IN_PROGRESS", 100)
    reset = apply_fresh_copy(con, DB, SCHEMA, RUN, dry_run=True, logger=LOGGER)
    assert reset == ["measurement"]
    assert _table_exists(con, "measurement")
    assert read_checkpoint(con, DB, SCHEMA, "measurement") is not None
    arbitration = con.execute(
        f'SELECT COUNT(*) FROM "{SCHEMA}"."{COPY_RUN_TABLE_NAME}"'
    ).fetchone()[0]
    assert arbitration == 0, "dry run must not consume the once-per-run token"


def test_reset_failure_raises_fresh_copy_reset_error(con):
    _seed(con, "measurement", "IN_PROGRESS", 100)
    con.close()
    with pytest.raises(FreshCopyResetError):
        apply_fresh_copy(con, DB, SCHEMA, RUN, dry_run=False, logger=LOGGER)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_fresh_copy.py -v
```

Expected: FAIL — `ImportError: cannot import name 'apply_fresh_copy'`

- [ ] **Step 3: Append to `checkpoint.py`**

Add `from .errors import FreshCopyResetError` to the imports, then append:

```python
def _table_row_count(conn, database: str, schema: str, table: str) -> int:
    row = _fetchone(
        conn,
        "SELECT COUNT(*) FROM information_schema.tables "
        f"WHERE table_schema = '{schema}' AND table_name = '{table}'",
    )
    if not row or not row[0]:
        return 0
    return int(_fetchone(conn, f"SELECT COUNT(*) FROM {_qualify(database, schema, table)}")[0])


def reset_table(conn, database: str, schema: str, table: str, logger) -> int:
    """Drop a partial target and its checkpoint. Returns the row count discarded.

    Used by both the freshCopy reset and the automatic plan_id-mismatch reset.
    """
    discarded = _table_row_count(conn, database, schema, table)
    conn.execute(f"DROP TABLE IF EXISTS {_qualify(database, schema, table)}")
    conn.execute(
        f"DELETE FROM {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} "
        f"WHERE table_name = '{table}'"
    )
    logger.warning(f"Reset '{schema}.{table}': discarded {discarded:,} rows")
    return discarded


def apply_fresh_copy(
    conn, database: str, schema: str, flow_run_id: str, dry_run: bool, logger
) -> list[str]:
    """Discard every non-COMPLETE table, at most once per (flow run, target schema).

    The once-only guarantee is load-bearing: create_schema_tables_task carries
    retries=3, and re-applying the reset on attempt 2 would destroy the progress
    attempt 1 made, undoing chunk-level resume entirely.
    """
    try:
        already = _fetchone(
            conn,
            f"SELECT COUNT(*) FROM {_qualify(database, schema, COPY_RUN_TABLE_NAME)} "
            f"WHERE flow_run_id = '{flow_run_id}' AND target_schema = '{schema}'",
        )
        if already and int(already[0]) > 0:
            logger.info(
                f"freshCopy already applied for run {flow_run_id} / schema '{schema}'; "
                "resuming instead of resetting"
            )
            return []

        rows = _fetchall(
            conn,
            f"SELECT table_name FROM {_qualify(database, schema, COPY_STATUS_TABLE_NAME)} "
            "WHERE status IS DISTINCT FROM 'COMPLETE' ORDER BY table_name",
        )
        targets = [row[0] for row in rows]

        if dry_run:
            logger.warning(
                f"[dry run] freshCopy would discard {len(targets)} table(s) in "
                f"'{schema}': {targets}"
            )
            return targets

        if not targets:
            logger.info(f"freshCopy requested for '{schema}' but nothing to discard")
        for table in targets:
            reset_table(conn, database, schema, table, logger)

        conn.execute(
            f"INSERT INTO {_qualify(database, schema, COPY_RUN_TABLE_NAME)} "
            f"(flow_run_id, target_schema, reset_applied_at) VALUES "
            f"('{flow_run_id}', '{schema}', CAST(NOW() AS TIMESTAMP))"
        )
        logger.warning(f"freshCopy discarded {len(targets)} table(s) in '{schema}': {targets}")
        return targets
    except Exception as exc:
        raise FreshCopyResetError(
            f"freshCopy reset failed for schema '{schema}': {exc}"
        ) from exc
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_fresh_copy.py -v
```

Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/checkpoint.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_fresh_copy.py
git commit -m "feat: add freshCopy reset with once-per-run arbitration"
```

---

## Task 11: Plumb `freshCopy` and `dryRun` through the options

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/types.py:22-42` (`CopyParameters`)
- Modify: `plugins/flows/base/create_cachedb_file_plugin/types.py:85-101` (`CreateCacheOptions`)
- Modify: `plugins/flows/base/create_cachedb_file_plugin/flow.py:69-81` and `flow.py:170-180`

- [ ] **Step 1: Write the failing test**

Create `tests/test_options.py`:

```python
import pytest

pydantic = pytest.importorskip("pydantic")

from create_cachedb_file_plugin.types import CreateCacheOptions


def _options(**overrides):
    payload = {
        "flowActionType": "create_datamart_cache",
        "databaseCode": "alpdev_pg",
        "schemaName": "cdmdefault",
        "tablesToCreateDuckdbFtsIndex": ["concept"],
    }
    payload.update(overrides)
    return CreateCacheOptions(**payload)


def test_fresh_copy_defaults_to_false():
    assert _options().fresh_copy is False
    assert _options().dry_run is False


def test_fresh_copy_accepts_the_camel_case_alias():
    assert _options(freshCopy=True).fresh_copy is True
    assert _options(dryRun=True).dry_run is True
```

- [ ] **Step 2: Run test to verify it fails**

```bash
/tmp/cachevenv/bin/pip install -q pydantic==2.10.6
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_options.py -v
```

Expected: FAIL — `AttributeError: 'CreateCacheOptions' object has no attribute 'fresh_copy'`

- [ ] **Step 3: Add the fields**

In `types.py`, inside `CopyParameters`, after `chunk_size: int | None`:

```python
    fresh_copy: bool = False
    dry_run: bool = False
```

In `types.py`, inside `CreateCacheOptions`, after the `chunk_size` field:

```python
    fresh_copy: Optional[bool] = Field(default=False, alias="freshCopy")
    dry_run: Optional[bool] = Field(default=False, alias="dryRun")
```

In `flow.py`, inside the `CopyParameters(...)` construction in `create_cache_flow`
(currently ending `chunk_size=options.chunk_size`), add:

```python
        fresh_copy=bool(options.fresh_copy),
        dry_run=bool(options.dry_run),
```

In `flow.py`, inside the `CopyParameters(...)` construction in
`create_cdw_validation_config_plugin`, add:

```python
        chunk_size=None,
        fresh_copy=False,
        dry_run=False,
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_options.py -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/types.py \
        plugins/flows/base/create_cachedb_file_plugin/flow.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_options.py
git commit -m "feat: accept freshCopy and dryRun on the cache creation flow"
```

---

## Task 12: Chunked copy execution in `copy.py`

Replaces the `NotImplementedError` stub from Task 6.

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py` (imports, `copy_table`, `copy_table_chunk`)
- Delete from `copy.py`: `create_cache_status_table`, `mark_in_progress`, `mark_complete`, `cleanup`, `drop_cache_status_table`, the local `COPY_STATUS_TABLE_NAME`

- [ ] **Step 1: Replace the imports at the top of `copy.py`**

Replace the block at `copy.py:13-18` with:

```python
from .types import CopyParameters, QueryColumns
from .filter import filter_tables, CDM_COLUMN_FILTER_MAP
from .utils import execute_statement, set_bigquery_global_settings, VOCAB_TABLES
from .chunk_utils import (
    describe_plan,
    find_column_case_insensitive,
    plan_chunks,
    resolve_target_chunk_rows,
)
from .checkpoint import (
    COPY_STATUS_TABLE_NAME,
    apply_fresh_copy,
    drop_status_tables,
    ensure_status_tables,
    mark_complete,
    mark_failed,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
    reset_table,
)
from .errors import ChunkCopyError, ReconciliationError
from .planner_types import ChunkConfig, ChunkStrategy
from .source_stats import build_source_adapter

from _shared_flow_utils.types import SupportedDatabaseDialects
```

Then delete the now-duplicated helpers from `copy.py`: `create_cache_status_table`,
`mark_in_progress`, `mark_complete`, `cleanup`, `drop_cache_status_table`, and the
temporary `COPY_STATUS_TABLE_NAME = "table_copy_status"` line added in Task 6.

- [ ] **Step 2: Replace `copy_table_chunk` with a retrying Prefect task**

```python
@task(
    retries=3,
    retry_delay_seconds=exponential_backoff(backoff_factor=2),
    log_prints=True,
    task_run_name="copy_chunk_{query_columns.table}_{chunk_index}",
    timeout_seconds=int(Variable.get("cache_chunk_timeout")),
    cache_policy=NONE,
)
def copy_table_chunk(
    write_conn,
    copy_params: CopyParameters,
    query_columns: QueryColumns,
    source_schema: str,
    predicate: str,
    chunk_index: int,
    total_chunks: int,
):
    logger = get_run_logger()
    target = (
        f'"{copy_params.target_database}"."{copy_params.target_schema}"'
        f'."{query_columns.table}"'
    )
    logger.info(
        f"Chunk {chunk_index + 1}/{total_chunks} for '{query_columns.table}': {predicate}"
    )
    try:
        # DELETE first so replaying a chunk after a crash cannot duplicate rows.
        execute_statement(write_conn, f"DELETE FROM {target} WHERE {predicate};")
        select_sql = create_select_query(copy_params, query_columns, source_schema, predicate)
        execute_statement(write_conn, f"INSERT INTO {target} {select_sql};")
    except Exception as exc:
        raise ChunkCopyError(
            f"Chunk {chunk_index + 1}/{total_chunks} of '{query_columns.table}' "
            f"failed ({predicate}): {exc}"
        ) from exc
```

- [ ] **Step 3: Replace `copy_table` in full**

```python
def build_chunk_config(dialect: str, copy_params: CopyParameters) -> ChunkConfig:
    return ChunkConfig(
        target_chunk_rows=resolve_target_chunk_rows(dialect, copy_params.chunk_size),
        dry_run=copy_params.dry_run,
    )


def copy_table(write_conn, read_conn, copy_params, query_columns, source_schema, logger=None):
    table = query_columns.table
    dialect = read_conn.tenant_configs.dialect
    adapter = build_source_adapter(read_conn)
    config = build_chunk_config(dialect, copy_params)

    stats = adapter.collect(source_schema, table, config, logger)
    plan = plan_chunks(dialect, source_schema, table, stats, config)
    logger.info(describe_plan(plan, source_schema, table))

    if config.dry_run:
        logger.info(f"[dry run] skipping copy of '{table}'")
        return stats.row_count

    if plan.strategy is ChunkStrategy.SINGLE_STATEMENT:
        select_sql = create_select_query(copy_params, query_columns, source_schema)
        target = f'"{copy_params.target_database}"."{copy_params.target_schema}"."{table}"'
        mark_in_progress(
            write_conn, copy_params.target_database, copy_params.target_schema,
            table, plan.plan_id, 1, stats.row_count,
        )
        execute_statement(write_conn, f"DROP TABLE IF EXISTS {target};")
        execute_statement(write_conn, f"CREATE TABLE {target} AS {select_sql}")
        record_chunk_progress(
            write_conn, copy_params.target_database, copy_params.target_schema, table, 1
        )
        return stats.row_count

    # Expand "*" so the chunk SELECT lists real columns.
    if query_columns.columns_to_copy == ["*"]:
        actual_columns = read_conn.get_columns(source_schema, table)
        query_columns = QueryColumns(
            table=table,
            columns_to_copy=actual_columns,
            patient_filter_col=find_column_case_insensitive(
                actual_columns, CDM_COLUMN_FILTER_MAP.get(table, {}).get("person_id_column")
            ),
            timestamp_filter_col=find_column_case_insensitive(
                actual_columns, CDM_COLUMN_FILTER_MAP.get(table, {}).get("timestamp_column")
            ),
        )

    checkpoint = read_checkpoint(
        write_conn, copy_params.target_database, copy_params.target_schema, table
    )
    start_at = 0
    if checkpoint is not None and checkpoint.plan_id == plan.plan_id:
        start_at = min(checkpoint.chunks_completed, len(plan.predicates))
        logger.info(
            f"Resuming '{table}' at chunk {start_at + 1}/{len(plan.predicates)} "
            f"(plan {plan.plan_id[:12]})"
        )
    elif checkpoint is not None:
        logger.warning(
            f"Plan for '{table}' changed ({checkpoint.plan_id} -> {plan.plan_id}); "
            "discarding the partial copy"
        )
        reset_table(
            write_conn, copy_params.target_database, copy_params.target_schema, table, logger
        )

    mark_in_progress(
        write_conn, copy_params.target_database, copy_params.target_schema,
        table, plan.plan_id, len(plan.predicates), stats.row_count,
    )
    if start_at:
        record_chunk_progress(
            write_conn, copy_params.target_database, copy_params.target_schema, table, start_at
        )
    create_empty_target_table_if_absent(write_conn, copy_params, query_columns, source_schema)

    for index in range(start_at, len(plan.predicates)):
        copy_table_chunk(
            write_conn, copy_params, query_columns, source_schema,
            plan.predicates[index], index, len(plan.predicates),
        )
        record_chunk_progress(
            write_conn, copy_params.target_database, copy_params.target_schema,
            table, index + 1,
        )

    return stats.row_count


def create_empty_target_table_if_absent(write_conn, copy_params, query_columns, source_schema):
    """Create the shell only when it is missing, so a resume keeps its rows."""
    target = (
        f'"{copy_params.target_database}"."{copy_params.target_schema}"'
        f'."{query_columns.table}"'
    )
    select_sql = create_select_query(copy_params, query_columns, source_schema, None)
    execute_statement(
        write_conn, f"CREATE TABLE IF NOT EXISTS {target} AS SELECT * FROM ({select_sql}) WHERE 1=0;"
    )
```

`create_select_query` keeps its current signature; `where_sql` is now always a predicate
string, never a tuple.

- [ ] **Step 4: Verify the module parses and the pure suite still passes**

```bash
cd plugins/flows/base && python3 -c "import ast; ast.parse(open('create_cachedb_file_plugin/copy.py').read()); print('parsed')"
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
```

Expected: `parsed`, then 48 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py
git commit -m "feat: execute chunked copies with resume and idempotent chunk writes"
```

---

## Task 13: Reconciliation and non-destructive failure

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py` (`copy_table_task`)

- [ ] **Step 1: Add reconciliation to `copy_table_task`**

Replace `copy_table_task` with:

```python
@task(
    log_prints=True,
    task_run_name="copy_table_{query_columns.table}",
    tags=["table-level-concurrency"],
    cache_policy=NONE,
)
def copy_table_task(write_conn, read_conn, copy_params, query_columns, source_schema):
    logger = get_run_logger()
    table = query_columns.table
    database = copy_params.target_database
    schema = copy_params.target_schema
    try:
        expected = copy_table(
            write_conn, read_conn, copy_params, query_columns, source_schema, logger
        )
        if copy_params.dry_run:
            return expected
        reconcile_table(write_conn, read_conn, copy_params, source_schema, table, logger)
        mark_complete(write_conn, database, schema, table)
        return expected
    except Exception as exc:
        logger.error(f"Copy of '{table}' failed: {exc}")
        # Deliberately no DROP: the partial target and its checkpoint are what
        # let the next attempt resume instead of restarting.
        mark_failed(write_conn, database, schema, table)
        raise


def reconcile_table(write_conn, read_conn, copy_params, source_schema, table, logger):
    adapter = build_source_adapter(read_conn)
    source_count = adapter.count_rows_exact(source_schema, table)
    target = f'"{copy_params.target_database}"."{copy_params.target_schema}"."{table}"'
    write_conn.execute(f"SELECT COUNT(*) FROM {target}")
    target_count = int(write_conn.fetchone()[0])
    if source_count != target_count:
        raise ReconciliationError(
            f"Row count mismatch for '{source_schema}.{table}': "
            f"source={source_count:,} target={target_count:,} "
            f"delta={target_count - source_count:,}"
        )
    logger.info(f"Reconciled '{table}': {target_count:,} rows")
```

Note: reconciliation is skipped when a `patient_filter` or `timestamp_filter` is set, because
the target is intentionally a subset. Add that guard at the top of `reconcile_table`:

```python
    if copy_params.patient_filter or copy_params.timestamp_filter:
        logger.info(f"Skipping reconciliation for '{table}': snapshot filters are active")
        return
```

- [ ] **Step 2: Verify the module parses**

```bash
cd plugins/flows/base && python3 -c "import ast; ast.parse(open('create_cachedb_file_plugin/copy.py').read()); print('parsed')"
```

Expected: `parsed`

- [ ] **Step 3: Run the pure suite**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
```

Expected: 48 passed

- [ ] **Step 4: Confirm no DROP survives on an error path**

```bash
grep -n "DROP TABLE" plugins/flows/base/create_cachedb_file_plugin/copy.py \
                     plugins/flows/base/create_cachedb_file_plugin/checkpoint.py
```

Expected: drops appear only in `reset_table`, `drop_status_tables`, the
`SINGLE_STATEMENT` branch, and `ensure_status_tables`' legacy recreate. None in an
`except` block.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py
git commit -m "feat: reconcile row counts and preserve partial copies on failure"
```

---

## Task 14: Wire `freshCopy` into the schema copy loop

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py` (`create_schema_tables`)

- [ ] **Step 1: Replace the status-table setup at the top of `create_schema_tables`**

Replace `create_cache_status_table(write_conn, copy_params)` with:

```python
    from prefect.runtime import flow_run as prefect_flow_run

    ensure_status_tables(
        write_conn, copy_params.target_database, copy_params.target_schema, logger
    )

    if copy_params.fresh_copy:
        apply_fresh_copy(
            write_conn,
            copy_params.target_database,
            copy_params.target_schema,
            str(prefect_flow_run.id),
            dry_run=copy_params.dry_run,
            logger=logger,
        )
```

The `(flow_run_id, target_schema)` key is what makes this safe under `retries=3` and what
lets the datamart schema and the results schema each get their own reset inside one flow run.

- [ ] **Step 2: Replace the completed-table query**

Replace the `try/except` block at `copy.py:208-220` with:

```python
    completed_tables = [
        row[0]
        for row in _fetchall_rows(
            write_conn,
            f'SELECT table_name FROM "{copy_params.target_database}"'
            f'."{copy_params.target_schema}"."{COPY_STATUS_TABLE_NAME}" '
            "WHERE status = 'COMPLETE'",
        )
    ]
    logger.info(f"Found {len(completed_tables)} already completed tables: {completed_tables}")
```

and add this helper next to `create_select_query`:

```python
def _fetchall_rows(conn, statement: str):
    conn.execute(statement)
    return conn.fetchall()
```

- [ ] **Step 3: Replace the final drop**

Replace `drop_cache_status_table(write_conn, copy_params)` at the end of
`create_schema_tables` with:

```python
    if not copy_params.dry_run:
        drop_status_tables(
            write_conn, copy_params.target_database, copy_params.target_schema
        )
```

- [ ] **Step 4: Verify the module parses and the suite passes**

```bash
cd plugins/flows/base && python3 -c "import ast; ast.parse(open('create_cachedb_file_plugin/copy.py').read()); print('parsed')"
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
```

Expected: `parsed`, then 48 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py
git commit -m "feat: apply freshCopy once per flow run and target schema"
```

---

## Task 15: Move the timeout onto the chunk

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py:125-131` (`create_schema_tables_task`)
- Modify: `plugins/functions/alp-dataflow-gen-init/src/env.ts:49`
- Modify: `docker-compose.yml:447`, `plugins/functions/package.json:557`, `plugins/functions/package.org.json:534`, `charts/d2e-services/templates/d2e-deployment.yaml:418`

- [ ] **Step 1: Add the new Prefect variable**

In `plugins/functions/alp-dataflow-gen-init/src/env.ts`, immediately after line 49:

```typescript
    cache_chunk_timeout: _env.CACHE_CHUNK_TIMEOUT || "3600", // Default to 1 hour per chunk
```

- [ ] **Step 2: Mirror the environment variable everywhere `CACHE_TASK_TIMEOUT` appears**

```bash
grep -rn "CACHE_TASK_TIMEOUT" --include=*.yml --include=*.yaml --include=*.json . | grep -v node_modules
```

Expected four hits. Add a sibling line at each, using the same syntax as its neighbour:

- `docker-compose.yml`: `CACHE_CHUNK_TIMEOUT: ${CACHE_CHUNK_TIMEOUT:-3600}`
- `plugins/functions/package.json`: `"CACHE_CHUNK_TIMEOUT": "${CACHE_CHUNK_TIMEOUT:-3600}",`
- `plugins/functions/package.org.json`: `"CACHE_CHUNK_TIMEOUT": "${CACHE_CHUNK_TIMEOUT:-3600}",`
- `charts/d2e-services/templates/d2e-deployment.yaml`: an env entry named `CACHE_CHUNK_TIMEOUT` mirroring the `CACHE_TASK_TIMEOUT` block directly above it

- [ ] **Step 3: Remove the schema-wide timeout**

In `copy.py`, delete the `timeout_seconds=int(Variable.get("cache_task_timeout")),` line from
the `@task` decorator on `create_schema_tables_task`. Keep `retries=3` and the backoff.
Leave `cache_task_timeout` on `create_schema_if_not_exists_task`, `versioninfo.py`, and
`fts.py` — those are short, bounded operations.

- [ ] **Step 4: Verify**

```bash
grep -n "cache_task_timeout\|cache_chunk_timeout" plugins/flows/base/create_cachedb_file_plugin/*.py
cd plugins/flows/base && python3 -c "import ast; ast.parse(open('create_cachedb_file_plugin/copy.py').read()); print('parsed')"
```

Expected: `copy.py` references `cache_chunk_timeout` only (on `copy_table_chunk`) plus
`cache_task_timeout` on `create_schema_if_not_exists_task`.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py \
        plugins/functions/alp-dataflow-gen-init/src/env.ts \
        docker-compose.yml plugins/functions/package.json \
        plugins/functions/package.org.json \
        charts/d2e-services/templates/d2e-deployment.yaml
git commit -m "feat: budget copy timeouts per chunk instead of per schema"
```

---

## Task 16: Remove the dead code the rewrite exposed

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py` (`create_select_query`)

- [ ] **Step 1: Write the failing test**

Append to `tests/test_chunk_planner.py`:

```python
def test_create_select_query_has_no_tuple_branch():
    import inspect

    from create_cachedb_file_plugin import copy as copy_module

    source = inspect.getsource(copy_module.create_select_query)
    assert "OFFSET" not in source, "the unreachable LIMIT/OFFSET branch must be gone"
    assert "isinstance(where_sql, tuple)" not in source
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -k tuple_branch -v
```

Expected: FAIL — the assertion finds `OFFSET`. (If the import of `copy` fails for want of
Prefect, mark this test `@pytest.mark.skipif` on `importlib.util.find_spec("prefect") is None`
and run it in the Prefect-enabled environment instead.)

- [ ] **Step 3: Simplify `create_select_query`**

Replace the `where_sql` handling block (`copy.py:377-394`) with:

```python
    has_where = False
    if where_sql:
        has_where = True
        base_query += f" WHERE {where_sql}"
```

and change the signature to `where_sql: str | None = None`.

- [ ] **Step 4: Run the suite**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
```

Expected: 49 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py
git commit -m "refactor: drop the unreachable LIMIT/OFFSET chunk branch"
```

---

## Task 17: End-to-end copy, kill, and resume

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/test_copy_integration.py`

- [ ] **Step 1: Write the failing test**

`tests/test_copy_integration.py`:

```python
"""End-to-end chunk loop against local DuckDB, with no Prefect involvement.

Drives the same primitives copy.py uses -- planner, checkpoint, per-chunk
DELETE+INSERT -- so resume and reconciliation are exercised without a live
Postgres or BigQuery source.
"""

import logging

import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    ensure_status_tables,
    mark_complete,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
)
from create_cachedb_file_plugin.chunk_utils import build_predicates, resolve_chunk_count
from create_cachedb_file_plugin.planner_types import (
    ChunkColumnCandidate,
    ChunkConfig,
    ColumnKind,
)

LOGGER = logging.getLogger("test")
DB = "memory"
SRC = "src"
TGT = "cdm"
ROWS = 200_000


@pytest.fixture
def con():
    connection = duckdb.connect()
    connection.execute(f'CREATE SCHEMA "{SRC}"')
    connection.execute(f'CREATE SCHEMA "{TGT}"')
    # Sparse, offset-sharded ids: the shape that broke the old planner.
    connection.execute(
        f'CREATE TABLE "{SRC}"."measurement" AS '
        f"SELECT (i * 977 + 1000000000000)::BIGINT AS measurement_id, i AS person_id "
        f"FROM range({ROWS}) t(i)"
    )
    ensure_status_tables(connection, DB, TGT, LOGGER)
    return connection


def _plan(con, n):
    quantiles = con.execute(
        f"SELECT quantile_disc(measurement_id, "
        f"[{', '.join(str(i / n) for i in range(n + 1))}]) FROM \"{SRC}\".\"measurement\""
    ).fetchone()[0]
    column = ChunkColumnCandidate("measurement_id", ColumnKind.PRIMARY_KEY, "BIGINT", False)
    return build_predicates(column, list(quantiles))


def _copy_chunk(con, predicate):
    con.execute(f'DELETE FROM "{TGT}"."measurement" WHERE {predicate}')
    con.execute(
        f'INSERT INTO "{TGT}"."measurement" '
        f'SELECT * FROM "{SRC}"."measurement" WHERE {predicate}'
    )


def test_full_copy_reconciles(con):
    config = ChunkConfig(target_chunk_rows=20_000, min_chunk_rows=1_000)
    predicates = _plan(con, resolve_chunk_count(ROWS, config))
    con.execute(
        f'CREATE TABLE "{TGT}"."measurement" AS '
        f'SELECT * FROM "{SRC}"."measurement" WHERE 1=0'
    )
    mark_in_progress(con, DB, TGT, "measurement", "plan-1", len(predicates), ROWS)

    for index, predicate in enumerate(predicates):
        _copy_chunk(con, predicate)
        record_chunk_progress(con, DB, TGT, "measurement", index + 1)

    mark_complete(con, DB, TGT, "measurement")
    assert con.execute(f'SELECT COUNT(*) FROM "{TGT}"."measurement"').fetchone()[0] == ROWS


def test_resume_after_a_kill_replays_at_most_one_chunk(con):
    config = ChunkConfig(target_chunk_rows=20_000, min_chunk_rows=1_000)
    predicates = _plan(con, resolve_chunk_count(ROWS, config))
    con.execute(
        f'CREATE TABLE "{TGT}"."measurement" AS '
        f'SELECT * FROM "{SRC}"."measurement" WHERE 1=0'
    )
    mark_in_progress(con, DB, TGT, "measurement", "plan-1", len(predicates), ROWS)

    kill_at = len(predicates) // 2
    for index in range(kill_at):
        _copy_chunk(con, predicates[index])
        record_chunk_progress(con, DB, TGT, "measurement", index + 1)

    # Crash between INSERT and the counter update on the next chunk.
    _copy_chunk(con, predicates[kill_at])

    checkpoint = read_checkpoint(con, DB, TGT, "measurement")
    assert checkpoint.chunks_completed == kill_at

    for index in range(checkpoint.chunks_completed, len(predicates)):
        _copy_chunk(con, predicates[index])
        record_chunk_progress(con, DB, TGT, "measurement", index + 1)

    total = con.execute(f'SELECT COUNT(*) FROM "{TGT}"."measurement"').fetchone()[0]
    assert total == ROWS, "the replayed chunk must not duplicate rows"
```

- [ ] **Step 2: Run test to verify it fails or passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_copy_integration.py -v
```

Expected: 2 passed. A duplicate-row failure means the `DELETE`-before-`INSERT` ordering is
wrong somewhere; a short count means a boundary or NULL bug in `build_predicates`.

- [ ] **Step 3: Fix any failure in the production modules, not the test**

- [ ] **Step 4: Run the entire suite**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

Expected: 51 passed

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/tests/test_copy_integration.py
git commit -m "test: cover end-to-end chunked copy, kill and resume"
```

---

## Verification

### Automated

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

All 51 tests pass. The suite needs only `pytest`, `duckdb`, and `pydantic`; no Prefect, no
Postgres, no BigQuery credentials.

### Manual — PostgreSQL (AC13)

Run the cache creation flow against the `alpdev_pg` demo dataset and confirm per-table row
counts match a pre-change run. Then rerun with `{"freshCopy": true}` and confirm only
non-`COMPLETE` tables are rebuilt.

### Manual — BigQuery canary (AC12, release gate)

1. Run with `{"dryRun": true}` and capture the plan line for the >900M table: chosen column,
   its kind, chunk count, estimated rows per chunk.
2. Run the full copy. Capture per-chunk `total_bytes_processed`.
3. If per-chunk bytes ≈ full-table bytes, the chunk predicates are not pruning. Apply the
   spec's §7 mitigation — raise `chunkSize` for that table to cut the number of repeated
   scans — and record the result on the issue before closing it.
4. Confirm reconciliation passed and that the run converged rather than restarting.

### Acceptance criteria mapping

| AC | Covered by |
|---|---|
| 1 — capped chunk count on hash keys | Task 2 `test_chunk_count_is_capped_for_hash_distributed_keys` |
| 2 — no unbounded single copy | Task 4 `test_large_table_without_a_chunk_column_raises...`, Task 6 |
| 3 — chunk sizes bounded across distributions | Task 5 property tests |
| 4 — resume within one chunk | Task 17 `test_resume_after_a_kill_replays_at_most_one_chunk` |
| 5 — reconciliation incl. NULL chunk | Task 13, Task 5 null-fraction cases |
| 6 — no drop on failure | Task 13 Step 4 grep, `mark_failed` docstring |
| 7 — freshCopy scope | Task 10 `test_fresh_copy_discards_only_incomplete_tables` |
| 8 — freshCopy once per run | Task 10 `test_fresh_copy_is_applied_once_per_run_and_schema` |
| 9 — default behaviour unchanged | Task 11 `test_fresh_copy_defaults_to_false` |
| 10 — dry run destroys nothing | Task 10 `test_dry_run_reports_without_destroying` |
| 11 — BigQuery planning cost | Task 7 `test_bq_row_count_reads_metadata_not_the_table` |
| 12 — canary | Manual, above |
| 13 — Postgres regression | Manual, above |
| 14 — per-chunk logging | Task 12 `copy_table_chunk` |

---

## Self-review notes

- **Spec coverage.** Every section of the spec maps to a task. §5 → Tasks 2-4; §7 → Tasks 7-8;
  §4.3 → Tasks 10-11, 14; §8 → Tasks 12-13, 15; §9 → Task 9 (`ensure_status_tables`);
  §10 → Tasks 5, 9, 10, 17.
- **Type consistency.** `ChunkPlan.predicates` is a tuple everywhere; `reset_table` returns an
  int in both the checkpoint module and its callers; `count_rows` returns `(value, is_exact)`
  in both adapters; `apply_fresh_copy` returns a list of table names in every branch.
- **Deliberate gap.** `maximum_bytes_billed` (AC11's second clause) is not set by any task.
  `sqlalchemy-bigquery` passes job config through the engine's `connect_args`, which is
  constructed in `daobase.create_sqlalchemy_connection_url` — outside this plugin. Setting it
  correctly needs the team decision in the next section.

---

## Open items needing team input

These do not block starting the plan. Tasks 1-17 are implementable exactly as written; these
change specific details.

1. **`maximum_bytes_billed` (AC11).** Applying it means touching
   `plugins/flows/_shared_flow_utils/dao/daobase.py:279-284`, which is shared with every other
   flow that reads BigQuery. Confirm whether that shared change is acceptable, or whether the
   adapter should open its own `google-cloud-bigquery` client for planner queries only.
2. **Decision D4 — reconciliation source.** `BigQuerySourceAdapter.count_rows_exact` currently
   reuses the free `__TABLES__` count. If the affected datasets use the streaming insert API,
   that value is eventually consistent and reconciliation would produce false failures; switch
   it to `bq_exact_count_sql` and accept one billed scan per table.
3. **CI invocation.** `.github/workflows/plugin-ci.yml` on this branch is a stub, so I could not
   confirm how the real workflow runs Python plugin tests. The plan uses a self-contained
   virtualenv that works anywhere; someone with access to the release-branch workflow should
   add `create_cachedb_file_plugin/tests/` to it.
4. **Decisions D1, D2, D3, D5** from the spec are implemented at their chosen values. Confirm
   or change before Task 4 (D1), Task 13 (D2), Task 12 (D3), and Task 10 (D5).

---

## Execution handoff

Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, with review between tasks.
2. **Inline Execution** — tasks executed in-session with checkpoints for review.

