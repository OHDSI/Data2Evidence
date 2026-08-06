# Cache chunk planning, resume, and fresh-copy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `create_cachedb_file_plugin` copy arbitrarily large BigQuery and PostgreSQL tables into DuckDB with a bounded, distribution-aware chunk plan, chunk-level resume, and an operator-controlled fresh-copy override.

**Architecture:** `chunk_utils.py` becomes a pure planner (statistics in, SQL predicates out, no I/O). A new `source_stats.py` holds every source-side query behind a two-implementation adapter (BigQuery, Postgres). A new `checkpoint.py` owns the two ephemeral status tables, the reset routine, and fresh-copy arbitration. `copy.py` keeps orchestration only.

**Tech Stack:** Python 3.12, Prefect 3.6.10, DuckDB 1.4.0 (target, reached over Trex pgwire via psycopg2), SQLAlchemy 2.0.38 + sqlalchemy-bigquery 1.14.1 (source), pytest 9.0.3.

**Spec:** `trex/specs/2026-08-06-cache-chunk-resume-design.md` (commit `3219ab85c`)

---

## File structure

| Path | Status | Responsibility |
|---|---|---|
| `plugins/flows/base/create_cachedb_file_plugin/errors.py` | create | Exception taxonomy |
| `plugins/flows/base/create_cachedb_file_plugin/planner_types.py` | create | Dataclasses/enums shared by planner, adapters, orchestration |
| `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py` | rewrite | Pure planner. No DB access |
| `plugins/flows/base/create_cachedb_file_plugin/source_stats.py` | create | All source-side SQL + the two adapters |
| `plugins/flows/base/create_cachedb_file_plugin/checkpoint.py` | create | Status tables, checkpoint I/O, reset, fresh-copy arbitration |
| `plugins/flows/base/create_cachedb_file_plugin/copy.py` | modify | Orchestration only |
| `plugins/flows/base/create_cachedb_file_plugin/types.py` | modify | `freshCopy` / `dryRun` options; `CopyParameters` defaults |
| `plugins/flows/base/create_cachedb_file_plugin/flow.py` | modify | Thread new options through; fix a broken call site |
| `plugins/flows/base/create_cachedb_file_plugin/tests/` | create | New test package (none exists today) |
| `env-vars.md`, `internal/docs/env-vars.yml` | modify | `CACHE_TASK_TIMEOUT` semantics change |

**Sequencing rule:** Tasks 1-7 are pure/offline and land first — they are the whole #3033 fix and are testable without any database. Tasks 8-13 change orchestration. Tasks 14-17 are cleanup, docs, and verification.

---

## Task 0: Test harness and package skeleton

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/__init__.py`
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/README.md`
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/test_smoke.py`

Background you need: this plugin has **no** test package today. `plugins/flows/` has suites for
`_shared_flow_utils`, `strategus_plugin`, `cohort_discovery_plugin`, `dataflow_ui_plugin` — use
`cohort_discovery_plugin/tests` as the layout reference. `pytest==9.0.3` is declared in the
`[dependency-groups] dev` block of `plugins/flows/base/pyproject.toml`, which pixi does not
install, so tests run from a provisioned venv.

- [ ] **Step 1: Create the venv the suite will use**

```bash
python3 -m venv /tmp/cachevenv
/tmp/cachevenv/bin/pip install --quiet pytest==9.0.3 duckdb==1.4.0
/tmp/cachevenv/bin/pytest --version
```

Expected: `pytest 9.0.3`

- [ ] **Step 2: Create the package files**

`tests/__init__.py` — empty file.

`tests/README.md`:

````markdown
# create_cachedb_file_plugin tests

Layers:

- **Pure suite** — `test_chunk_planner.py`, `test_predicates.py`,
  `test_source_adapter_sql.py`. No database, no Prefect. Runs anywhere.
- **DuckDB suite** — `test_planner_properties.py`, `test_checkpoint.py`,
  `test_fresh_copy.py`. Needs only the `duckdb` Python package; uses temp files.
- **Integration** — `test_copy_integration.py`. Marked `@pytest.mark.integration`,
  skipped unless `CACHE_TEST_SOURCE_DB` is set.

## Running

```sh
python3 -m venv /tmp/cachevenv
/tmp/cachevenv/bin/pip install pytest==9.0.3 duckdb==1.4.0
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

`PYTHONPATH` needs both entries: `$PWD` for `create_cachedb_file_plugin`, `$PWD/..`
for `_shared_flow_utils`.
````

`tests/test_smoke.py`:

```python
def test_package_imports():
    from create_cachedb_file_plugin import filter as cache_filter

    assert "person" in cache_filter.CHUNK_COLUMN_MAP
```

- [ ] **Step 3: Run it**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

Expected: `1 passed`

- [ ] **Step 4: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/tests/
git commit -m "test(cache): add test package for create_cachedb_file_plugin"
```

---

## Task 1: Error taxonomy and planner types

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/errors.py`
- Create: `plugins/flows/base/create_cachedb_file_plugin/planner_types.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_planner_types.py`

- [ ] **Step 1: Write the failing test**

`tests/test_planner_types.py`:

```python
import pytest

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


@pytest.mark.parametrize(
    "err", [PlannerError, ChunkCopyError, ReconciliationError, FreshCopyResetError]
)
def test_all_errors_share_a_base(err):
    assert issubclass(err, CacheCopyError)


def test_chunk_config_defaults():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    assert config.max_chunks == 2_000
    assert config.min_chunk_rows == 100_000
    assert config.small_table_threshold == 500_000
    assert config.dry_run is False


def test_candidate_is_hashable_and_frozen():
    candidate = ChunkColumnCandidate(
        name="person_id", kind=ColumnKind.PRIMARY_KEY, data_type="INT64", nullable=False
    )
    assert {candidate}
    with pytest.raises(Exception):
        candidate.name = "other"


def test_strategy_values():
    assert ChunkStrategy.SINGLE_STATEMENT.value == "SINGLE_STATEMENT"
    assert ChunkStrategy.CHUNKED.value == "CHUNKED"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_planner_types.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'create_cachedb_file_plugin.errors'`

- [ ] **Step 3: Write the implementation**

`errors.py`:

```python
class CacheCopyError(Exception):
    """Base class for every failure raised by the cache copy plugin."""


class PlannerError(CacheCopyError):
    """Chunk planning could not produce a usable plan."""


class ChunkCopyError(CacheCopyError):
    """A single chunk failed to copy after all retries."""


class ReconciliationError(CacheCopyError):
    """Target row count did not match the source after a copy."""


class FreshCopyResetError(CacheCopyError):
    """A fresh-copy reset could not be applied cleanly."""
```

`planner_types.py`:

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ColumnKind(str, Enum):
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
    column: ChunkColumnCandidate | None = None
    boundaries: tuple[Any, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ChunkPlan:
    plan_id: str
    strategy: ChunkStrategy
    predicates: tuple[str, ...] = field(default_factory=tuple)
    column_name: str | None = None
    column_kind: ColumnKind | None = None
    estimated_rows_per_chunk: int = 0
    includes_null_chunk: bool = False

    @property
    def chunk_count(self) -> int:
        return len(self.predicates)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_planner_types.py -v
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/errors.py \
        plugins/flows/base/create_cachedb_file_plugin/planner_types.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_planner_types.py
git commit -m "feat(cache): add planner types and error taxonomy"
```

---

## Task 2: Bounded chunk count — the core #3033 fix

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py`

This is the defect the issue reports. Today `plan_chunks` computes
`ceil((max-min+1) / chunk_size)` from the **column span**, so a hash-generated `INT64` key yields
~3.7e12 iterations and OOMs the worker. After this task the count derives from `row_count` and is
hard-capped.

- [ ] **Step 1: Write the failing test**

`tests/test_chunk_planner.py`:

```python
import pytest

from create_cachedb_file_plugin.chunk_utils import resolve_chunk_count
from create_cachedb_file_plugin.planner_types import ChunkConfig

BQ = ChunkConfig(target_chunk_rows=5_000_000)


def test_count_comes_from_rows_not_span():
    # 900M rows at a 5M target -> 180 chunks, regardless of any ID span.
    assert resolve_chunk_count(900_000_000, BQ) == 180


def test_count_is_capped():
    # 50B rows would want 10_000 chunks; the cap holds it at max_chunks.
    assert resolve_chunk_count(50_000_000_000, BQ) == BQ.max_chunks


def test_min_chunk_rows_floor_reduces_count():
    config = ChunkConfig(target_chunk_rows=1_000, min_chunk_rows=100_000)
    # 1M rows / 1_000 target = 1_000 chunks, but the floor allows only 10.
    assert resolve_chunk_count(1_000_000, config) == 10


def test_never_returns_less_than_one():
    assert resolve_chunk_count(0, BQ) == 1
    assert resolve_chunk_count(1, BQ) == 1


def test_exact_multiple_has_no_off_by_one():
    assert resolve_chunk_count(10_000_000, BQ) == 2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: FAIL — `ImportError: cannot import name 'resolve_chunk_count'`

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `chunk_utils.py` with the following. This deletes
`determine_chunk_size` (its `row_count > 100_000_000` arm was dead — it returned the same value as
the default), the unbounded `while` loop, and the density guard. `find_column_case_insensitive` is
kept because `copy.py` still uses it; `COPY_STATUS_TABLE_NAME` moves to `checkpoint.py` in Task 8.

```python
from _shared_flow_utils.types import SupportedDatabaseDialects

from .planner_types import ChunkConfig

BIGQUERY_TARGET_CHUNK_ROWS = 5_000_000
DEFAULT_TARGET_CHUNK_ROWS = 1_000_000


def resolve_target_chunk_rows(dialect: str, override: int | None = None) -> int:
    """Rows per chunk we aim for. An explicit override always wins."""
    if override is not None:
        return override
    if dialect == SupportedDatabaseDialects.BIGQUERY.value:
        return BIGQUERY_TARGET_CHUNK_ROWS
    return DEFAULT_TARGET_CHUNK_ROWS


def resolve_chunk_count(row_count: int, config: ChunkConfig) -> int:
    """How many chunks to cut a table into.

    Derived from the row count and hard-capped, never from the chunk column's
    span. This is the fix for issue 3033: a sparse or hash-generated chunk
    column can no longer drive the chunk count towards infinity.
    """
    if row_count <= 0:
        return 1
    desired = -(-row_count // config.target_chunk_rows)  # ceil division
    capped = min(desired, config.max_chunks)
    floored = min(capped, max(1, row_count // config.min_chunk_rows))
    return max(1, floored)


def find_column_case_insensitive(columns: list[str], target: str) -> str | None:
    if not target:
        return None
    for col in columns:
        if col.lower() == target.lower():
            return col
    return None
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: `5 passed`

Note: `copy.py` now has broken imports (`determine_chunk_size`, `plan_chunks`,
`COPY_STATUS_TABLE_NAME`). That is expected and is repaired in Tasks 8-13. Do not run the full
suite yet; run only the file under test.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py
git commit -m "fix(cache): derive chunk count from row count and cap it

plan_chunks derived the chunk count from the chunk column's min/max span,
so a hash-generated INT64 key produced an effectively unbounded predicate
list and exhausted worker memory before any row was copied. Refs #3033."
```

---

## Task 3: SQL literals and half-open predicates

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_predicates.py`

Two correctness fixes land here. `BETWEEN` (today's formulation) silently drops rows whose chunk
column is NULL; half-open intervals plus an explicit `IS NULL` chunk fix that. And boundary values
arrive from the source database, so they must be escaped rather than interpolated raw.

- [ ] **Step 1: Write the failing test**

`tests/test_predicates.py`:

```python
from datetime import date

import pytest

from create_cachedb_file_plugin.chunk_utils import build_predicates, sql_literal
from create_cachedb_file_plugin.errors import PlannerError
from create_cachedb_file_plugin.planner_types import ChunkColumnCandidate, ColumnKind


def col(nullable=False, name="measurement_id", data_type="INT64"):
    return ChunkColumnCandidate(
        name=name, kind=ColumnKind.MAPPED_ID, data_type=data_type, nullable=nullable
    )


def test_int_literal():
    assert sql_literal(42) == "42"


def test_date_literal_is_quoted():
    assert sql_literal(date(2020, 1, 31)) == "'2020-01-31'"


def test_string_literal_escapes_quotes():
    assert sql_literal("O'Brien") == "'O''Brien'"


def test_unsupported_literal_rejected():
    with pytest.raises(PlannerError):
        sql_literal({"a": 1})


def test_three_cuts_make_four_half_open_chunks():
    assert build_predicates(col(), [10, 20, 30]) == [
        '"measurement_id" < 10',
        '"measurement_id" >= 10 AND "measurement_id" < 20',
        '"measurement_id" >= 20 AND "measurement_id" < 30',
        '"measurement_id" >= 30',
    ]


def test_nullable_column_gets_an_explicit_null_chunk():
    predicates = build_predicates(col(nullable=True), [10])
    assert predicates[-1] == '"measurement_id" IS NULL'
    assert len(predicates) == 3


def test_no_cuts_yields_a_single_not_null_chunk():
    assert build_predicates(col(), []) == ['"measurement_id" IS NOT NULL']


def test_duplicate_cuts_collapse():
    assert build_predicates(col(), [10, 10, 20]) == [
        '"measurement_id" < 10',
        '"measurement_id" >= 10 AND "measurement_id" < 20',
        '"measurement_id" >= 20',
    ]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_predicates.py -v
```

Expected: FAIL — `ImportError: cannot import name 'build_predicates'`

- [ ] **Step 3: Write the implementation**

Append to `chunk_utils.py`, and add the imports shown at the top:

```python
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from .errors import PlannerError
from .planner_types import ChunkColumnCandidate
```

```python
def sql_literal(value: Any) -> str:
    """Render a boundary value as a SQL literal.

    Values come from the source database, so strings are escaped rather than
    interpolated raw.
    """
    if value is None:
        raise PlannerError("boundary value cannot be NULL")
    if isinstance(value, bool):
        raise PlannerError("boolean is not a usable chunk boundary")
    if isinstance(value, (int, float, Decimal)):
        return str(value)
    if isinstance(value, (datetime, date)):
        return "'" + value.isoformat() + "'"
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    raise PlannerError(f"unsupported boundary type: {type(value).__name__}")


def dedupe_sorted(values) -> list:
    seen = []
    for value in sorted(v for v in values if v is not None):
        if not seen or value != seen[-1]:
            seen.append(value)
    return seen


def build_predicates(column: ChunkColumnCandidate, cuts) -> list[str]:
    """Turn interior cut points into disjoint, total half-open predicates.

    `cuts` are INTERIOR boundaries only - the caller drops the min and max
    endpoints. The result covers the whole column domain: everything below the
    first cut, one half-open interval per adjacent pair, everything at or above
    the last cut, plus an explicit NULL chunk when the column is nullable.
    """
    quoted = f'"{column.name}"'
    ordered = dedupe_sorted(cuts)
    predicates: list[str] = []

    if not ordered:
        predicates.append(f"{quoted} IS NOT NULL")
    else:
        predicates.append(f"{quoted} < {sql_literal(ordered[0])}")
        for low, high in zip(ordered, ordered[1:]):
            predicates.append(
                f"{quoted} >= {sql_literal(low)} AND {quoted} < {sql_literal(high)}"
            )
        predicates.append(f"{quoted} >= {sql_literal(ordered[-1])}")

    if column.nullable:
        predicates.append(f"{quoted} IS NULL")

    return predicates
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_predicates.py -v
```

Expected: `8 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_predicates.py
git commit -m "fix(cache): use half-open chunk predicates with an explicit NULL chunk

BETWEEN matched no chunk for rows whose chunk column was NULL, so those
rows were silently dropped from the cache."
```

---

## Task 4: `plan_chunks` and the plan id

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_chunk_planner.py`:

```python
from create_cachedb_file_plugin.chunk_utils import compute_plan_id, plan_chunks
from create_cachedb_file_plugin.errors import PlannerError
from create_cachedb_file_plugin.planner_types import (
    ChunkColumnCandidate,
    ChunkStats,
    ChunkStrategy,
    ColumnKind,
)

ID_COL = ChunkColumnCandidate(
    name="measurement_id", kind=ColumnKind.MAPPED_ID, data_type="INT64", nullable=False
)


def stats(row_count, boundaries=(), column=ID_COL):
    return ChunkStats(
        row_count=row_count,
        row_count_is_exact=True,
        column=column,
        boundaries=tuple(boundaries),
    )


def test_small_table_uses_a_single_statement():
    plan = plan_chunks("postgres", "cdm", "person", stats(1_000), BQ)
    assert plan.strategy is ChunkStrategy.SINGLE_STATEMENT
    assert plan.predicates == ()


def test_hash_distributed_keys_stay_bounded():
    # Regression for issue 3033: boundaries spread across the whole INT64
    # range must not inflate the chunk count.
    span = 9_000_000_000_000_000_000
    boundaries = [(-span) + (i * (2 * span) // 200) for i in range(201)]
    plan = plan_chunks("bigquery", "omop", "measurement", stats(900_000_000, boundaries), BQ)
    assert plan.strategy is ChunkStrategy.CHUNKED
    assert len(plan.predicates) <= BQ.max_chunks + 1
    assert len(plan.predicates) == 200


def test_offset_sharded_keys_do_not_produce_one_giant_chunk():
    # Three source shards at 1e12 / 2e12 / 3e12. Uniform-width slicing would
    # put everything in three chunks; quantile cuts must not.
    boundaries = []
    for base in (1_000_000_000_000, 2_000_000_000_000, 3_000_000_000_000):
        boundaries.extend(base + i for i in range(0, 60_000, 1_000))
    plan = plan_chunks("bigquery", "omop", "measurement", stats(600_000_000, boundaries), BQ)
    assert len(plan.predicates) > 100


def test_missing_chunk_column_raises_rather_than_copying_whole_table():
    with pytest.raises(PlannerError, match="No usable chunk column"):
        plan_chunks("bigquery", "omop", "note_nlp", stats(900_000_000, column=None), BQ)


def test_nullable_column_adds_the_null_chunk():
    nullable = ChunkColumnCandidate(
        name="person_id", kind=ColumnKind.MAPPED_ID, data_type="INT64", nullable=True
    )
    plan = plan_chunks(
        "postgres", "cdm", "death", stats(2_000_000, range(0, 5_000, 500), nullable), BQ
    )
    assert plan.includes_null_chunk is True
    assert plan.predicates[-1] == '"person_id" IS NULL'


def test_plan_id_is_stable_and_sensitive():
    a = compute_plan_id("bigquery", "omop", "measurement", "measurement_id", 10, (1, 2))
    b = compute_plan_id("bigquery", "omop", "measurement", "measurement_id", 10, (1, 2))
    c = compute_plan_id("bigquery", "omop", "measurement", "measurement_id", 11, (1, 2))
    assert a == b
    assert a != c
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: FAIL — `ImportError: cannot import name 'plan_chunks'`

- [ ] **Step 3: Write the implementation**

Append to `chunk_utils.py`, adding `import hashlib` at the top and extending the
`.planner_types` import to include `ChunkPlan`, `ChunkStats`, `ChunkStrategy`:

```python
PLANNER_VERSION = 2


def compute_plan_id(
    dialect: str, schema: str, table: str, column_name: str | None, chunk_count: int, boundaries
) -> str:
    payload = "|".join(
        [
            str(PLANNER_VERSION),
            dialect,
            schema,
            table,
            column_name or "",
            str(chunk_count),
            ",".join(repr(value) for value in boundaries),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def interior_cuts(boundaries) -> list:
    """Drop the outer endpoints of a quantile result, keeping the cut points."""
    ordered = dedupe_sorted(boundaries)
    if len(ordered) <= 2:
        return []
    return ordered[1:-1]


def plan_chunks(
    dialect: str, schema: str, table: str, stats: ChunkStats, config: ChunkConfig, logger=None
) -> ChunkPlan:
    if stats.row_count < config.small_table_threshold:
        return ChunkPlan(
            plan_id=compute_plan_id(dialect, schema, table, None, 1, ()),
            strategy=ChunkStrategy.SINGLE_STATEMENT,
            estimated_rows_per_chunk=stats.row_count,
        )

    if stats.column is None:
        raise PlannerError(
            f"No usable chunk column for '{schema}.{table}' ({stats.row_count:,} rows). "
            "Refusing to copy a table this large in a single statement."
        )

    chunk_count = resolve_chunk_count(stats.row_count, config)
    cuts = interior_cuts(stats.boundaries)
    predicates = build_predicates(stats.column, cuts)

    if logger:
        if chunk_count < -(-stats.row_count // config.target_chunk_rows):
            logger.info(
                f"Table '{table}': chunk count clamped to {chunk_count}; effective chunk size "
                f"raised to ~{stats.row_count // chunk_count:,} rows."
            )
        if not cuts:
            logger.warning(
                f"Table '{table}': chunk column '{stats.column.name}' has too few distinct "
                "values to cut; copying it as one chunk."
            )
        logger.info(
            f"Table '{table}': {len(predicates)} chunks on '{stats.column.name}' "
            f"({stats.column.kind.value}), ~{stats.row_count // max(1, chunk_count):,} rows each."
        )

    return ChunkPlan(
        plan_id=compute_plan_id(
            dialect, schema, table, stats.column.name, chunk_count, cuts
        ),
        strategy=ChunkStrategy.CHUNKED,
        predicates=tuple(predicates),
        column_name=stats.column.name,
        column_kind=stats.column.kind,
        estimated_rows_per_chunk=stats.row_count // max(1, chunk_count),
        includes_null_chunk=stats.column.nullable,
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_chunk_planner.py -v
```

Expected: `11 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/chunk_utils.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py
git commit -m "feat(cache): add distribution-aware plan_chunks with a stable plan id"
```

---

## Task 5: Property test — predicates are disjoint and total

**Files:**
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_planner_properties.py`

This is the test that mechanically proves no rows are lost or double-counted. It is worth more than
any number of hand-written cases.

- [ ] **Step 1: Write the test**

```python
import random

import duckdb
import pytest

from create_cachedb_file_plugin.chunk_utils import build_predicates, interior_cuts
from create_cachedb_file_plugin.planner_types import ChunkColumnCandidate, ColumnKind

DISTRIBUTIONS = {
    "dense": lambda rng, n: [i for i in range(n)],
    "hash_uniform": lambda rng, n: [rng.randint(-(2**62), 2**62) for _ in range(n)],
    "offset_sharded": lambda rng, n: [
        rng.choice([10**12, 2 * 10**12, 3 * 10**12]) + rng.randint(0, 50_000)
        for _ in range(n)
    ],
    "heavy_ties": lambda rng, n: [rng.choice([1, 2, 3, 4, 5]) for _ in range(n)],
    "single_value": lambda rng, n: [7] * n,
}


def quantile_boundaries(con, n_cuts):
    rows = con.execute(
        f"SELECT approx_quantile(v, x) FROM t, "
        f"(SELECT unnest(range(0, {n_cuts} + 1)) / {n_cuts}::DOUBLE AS x) "
        "WHERE v IS NOT NULL GROUP BY x ORDER BY x"
    ).fetchall()
    return [row[0] for row in rows]


@pytest.mark.parametrize("name", sorted(DISTRIBUTIONS))
@pytest.mark.parametrize("null_fraction", [0.0, 0.25])
def test_predicates_partition_the_table(name, null_fraction):
    rng = random.Random(1234)
    values = DISTRIBUTIONS[name](rng, 20_000)
    values = [None if rng.random() < null_fraction else v for v in values]

    con = duckdb.connect()
    con.execute("CREATE TABLE t (v BIGINT)")
    con.executemany("INSERT INTO t VALUES (?)", [(v,) for v in values])

    total = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
    column = ChunkColumnCandidate(
        name="v", kind=ColumnKind.MAPPED_ID, data_type="BIGINT", nullable=null_fraction > 0
    )
    predicates = build_predicates(column, interior_cuts(quantile_boundaries(con, 16)))

    counts = [
        con.execute(f"SELECT COUNT(*) FROM t WHERE {p}").fetchone()[0] for p in predicates
    ]
    assert sum(counts) == total, f"{name}: rows lost or double-counted"

    overlap = con.execute(
        "SELECT COUNT(*) FROM t WHERE "
        + " + ".join(f"CASE WHEN {p} THEN 1 ELSE 0 END" for p in predicates)
        + " > 1"
    ).fetchone()[0]
    assert overlap == 0, f"{name}: predicates overlap"
```

- [ ] **Step 2: Run it**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_planner_properties.py -v
```

Expected: `10 passed`

- [ ] **Step 3: Prove the test has teeth**

Temporarily change `build_predicates` so the NULL chunk is never appended (delete the
`if column.nullable:` block), rerun, and confirm the `null_fraction=0.25` cases FAIL with
"rows lost or double-counted". Then restore the block and confirm green again.

- [ ] **Step 4: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/tests/test_planner_properties.py
git commit -m "test(cache): prove chunk predicates partition the table exactly"
```

---

## Task 6: Source SQL builders (pure) with golden tests

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/source_stats.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py`

Every source-side query is a pure string-building function so BigQuery SQL is covered in CI without
credentials. Identifiers are validated before interpolation — they arrive from database metadata,
not from users, but the plugin already interpolates freely and we are not widening that surface.

- [ ] **Step 1: Write the failing test**

```python
import pytest

from create_cachedb_file_plugin.errors import PlannerError
from create_cachedb_file_plugin.source_stats import (
    bq_boundaries_sql,
    bq_candidates_sql,
    bq_row_count_sql,
    pg_boundaries_sql,
    pg_candidates_sql,
    pg_row_count_sql,
    safe_identifier,
)


def test_bq_row_count_uses_free_metadata_not_count_star():
    sql = bq_row_count_sql("my-proj", "omop", "measurement")
    assert sql == (
        "SELECT SUM(row_count) FROM `my-proj.omop.__TABLES__` "
        "WHERE table_id = 'measurement'"
    )
    assert "COUNT(*)" not in sql


def test_bq_row_count_accepts_a_qualified_dataset():
    sql = bq_row_count_sql("my-proj", "other-proj.omop", "measurement")
    assert "`other-proj.omop.__TABLES__`" in sql


def test_bq_candidates_reads_partition_and_cluster_metadata():
    sql = bq_candidates_sql("my-proj", "omop", "measurement")
    assert "`my-proj.omop.INFORMATION_SCHEMA.COLUMNS`" in sql
    assert "is_partitioning_column" in sql
    assert "clustering_ordinal_position" in sql


def test_bq_boundaries_is_a_single_approx_quantiles_pass():
    sql = bq_boundaries_sql("my-proj", "omop", "measurement", "measurement_id", 180)
    assert sql == (
        "SELECT APPROX_QUANTILES(`measurement_id`, 180) AS bounds "
        "FROM `my-proj.omop.measurement`"
    )


def test_pg_row_count_uses_reltuples_estimate():
    sql = pg_row_count_sql("cdm", "measurement")
    assert "reltuples" in sql
    assert "'cdm.measurement'::regclass" in sql


def test_pg_candidates_looks_for_a_single_column_pk():
    sql = pg_candidates_sql("cdm", "measurement")
    assert "pg_index" in sql
    assert "indisprimary" in sql


def test_pg_boundaries_uses_percentile_disc_with_n_plus_one_fractions():
    sql = pg_boundaries_sql("cdm", "measurement", "measurement_id", 4)
    assert "percentile_disc" in sql
    assert 'ORDER BY "measurement_id"' in sql
    assert sql.count(",") >= 4


@pytest.mark.parametrize("bad", ["a b", "x;DROP", "a'b", "", "a`b"])
def test_bad_identifiers_are_rejected(bad):
    with pytest.raises(PlannerError):
        safe_identifier(bad)


def test_good_identifiers_pass():
    assert safe_identifier("my-proj.omop") == "my-proj.omop"
    assert safe_identifier("measurement_id") == "measurement_id"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'create_cachedb_file_plugin.source_stats'`

- [ ] **Step 3: Write the implementation**

Create `source_stats.py` with the SQL layer (the adapter classes arrive in Task 7):

```python
import re

from .errors import PlannerError

_IDENTIFIER = re.compile(r"^[A-Za-z0-9_$][A-Za-z0-9_$.\-]*$")


def safe_identifier(name: str) -> str:
    """Reject anything that is not a plain schema/table/column identifier."""
    if not name or not _IDENTIFIER.match(name):
        raise PlannerError(f"unsafe SQL identifier: {name!r}")
    return name


def bq_dataset_path(project: str, schema: str) -> str:
    """`schema` may already be `project.dataset` (whole-project connections)."""
    safe_identifier(schema)
    if "." in schema:
        return schema
    return f"{safe_identifier(project)}.{schema}"


def bq_row_count_sql(project: str, schema: str, table: str) -> str:
    dataset = bq_dataset_path(project, schema)
    return (
        f"SELECT SUM(row_count) FROM `{dataset}.__TABLES__` "
        f"WHERE table_id = '{safe_identifier(table)}'"
    )


def bq_candidates_sql(project: str, schema: str, table: str) -> str:
    dataset = bq_dataset_path(project, schema)
    return (
        "SELECT column_name, data_type, is_nullable, is_partitioning_column, "
        "clustering_ordinal_position "
        f"FROM `{dataset}.INFORMATION_SCHEMA.COLUMNS` "
        f"WHERE table_name = '{safe_identifier(table)}'"
    )


def bq_boundaries_sql(project: str, schema: str, table: str, column: str, n: int) -> str:
    dataset = bq_dataset_path(project, schema)
    return (
        f"SELECT APPROX_QUANTILES(`{safe_identifier(column)}`, {int(n)}) AS bounds "
        f"FROM `{dataset}.{safe_identifier(table)}`"
    )


def bq_count_rows_exact_sql(project: str, schema: str, table: str) -> str:
    dataset = bq_dataset_path(project, schema)
    return f"SELECT COUNT(*) FROM `{dataset}.{safe_identifier(table)}`"


def pg_row_count_sql(schema: str, table: str) -> str:
    qualified = f"{safe_identifier(schema)}.{safe_identifier(table)}"
    return f"SELECT reltuples::bigint FROM pg_class WHERE oid = '{qualified}'::regclass"


def pg_candidates_sql(schema: str, table: str) -> str:
    return (
        "SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type, "
        "NOT a.attnotnull AS nullable, "
        "COALESCE(i.indisprimary AND array_length(i.indkey, 1) = 1, false) AS is_pk "
        "FROM pg_attribute a "
        "JOIN pg_class c ON c.oid = a.attrelid "
        "JOIN pg_namespace n ON n.oid = c.relnamespace "
        "LEFT JOIN pg_index i ON i.indrelid = c.oid AND a.attnum = ANY(i.indkey) "
        "AND i.indisprimary "
        f"WHERE n.nspname = '{safe_identifier(schema)}' "
        f"AND c.relname = '{safe_identifier(table)}' AND a.attnum > 0 AND NOT a.attisdropped"
    )


def pg_boundaries_sql(schema: str, table: str, column: str, n: int) -> str:
    n = max(1, int(n))
    fractions = ", ".join(f"{i / n:.6f}" for i in range(n + 1))
    return (
        f"SELECT unnest(percentile_disc(ARRAY[{fractions}]) "
        f'WITHIN GROUP (ORDER BY "{safe_identifier(column)}")) '
        f'FROM "{safe_identifier(schema)}"."{safe_identifier(table)}"'
    )


def pg_count_rows_exact_sql(schema: str, table: str) -> str:
    return f'SELECT COUNT(*) FROM "{safe_identifier(schema)}"."{safe_identifier(table)}"'
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -v
```

Expected: `13 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/source_stats.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py
git commit -m "feat(cache): add dialect SQL builders for row counts and quantile boundaries"
```

---

## Task 7: Source adapters

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/source_stats.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapters.py`

The adapters own candidate ordering. On BigQuery that ordering is the scan-cost lever: a partition
or cluster column lets each chunk read a pruned slice, whereas the surrogate ID may force a full
read per chunk.

- [ ] **Step 1: Write the failing test**

```python
from create_cachedb_file_plugin.planner_types import ColumnKind
from create_cachedb_file_plugin.source_stats import (
    rank_bq_candidates,
    rank_pg_candidates,
)


def bq_row(name, dtype="INT64", nullable="NO", partitioning="NO", cluster=None):
    return (name, dtype, nullable, partitioning, cluster)


def test_bq_prefers_partition_then_cluster_then_mapped_id():
    rows = [
        bq_row("measurement_id"),
        bq_row("person_id", cluster=1),
        bq_row("measurement_date", dtype="DATE", partitioning="YES"),
    ]
    ranked = rank_bq_candidates(rows, "measurement")
    assert [c.name for c in ranked] == ["measurement_date", "person_id", "measurement_id"]
    assert ranked[0].kind is ColumnKind.PARTITION
    assert ranked[1].kind is ColumnKind.CLUSTER
    assert ranked[2].kind is ColumnKind.MAPPED_ID


def test_bq_drops_unorderable_types():
    rows = [bq_row("payload", dtype="STRUCT<a INT64>"), bq_row("measurement_id")]
    assert [c.name for c in rank_bq_candidates(rows, "measurement")] == ["measurement_id"]


def test_bq_nullability_is_carried_through():
    ranked = rank_bq_candidates([bq_row("measurement_id", nullable="YES")], "measurement")
    assert ranked[0].nullable is True


def test_bq_returns_empty_when_nothing_matches():
    assert rank_bq_candidates([bq_row("notes", dtype="JSON")], "note_nlp") == []


def test_pg_prefers_the_single_column_primary_key():
    rows = [
        ("measurement_id", "bigint", False, True),
        ("person_id", "bigint", False, False),
    ]
    ranked = rank_pg_candidates(rows, "measurement")
    assert ranked[0].name == "measurement_id"
    assert ranked[0].kind is ColumnKind.PRIMARY_KEY


def test_pg_falls_back_to_the_mapped_chunk_column():
    rows = [("person_id", "bigint", False, False), ("cause_concept_id", "integer", True, False)]
    ranked = rank_pg_candidates(rows, "death")
    assert ranked[0].name == "person_id"
    assert ranked[0].kind is ColumnKind.MAPPED_ID
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapters.py -v
```

Expected: FAIL — `ImportError: cannot import name 'rank_bq_candidates'`

- [ ] **Step 3: Write the implementation**

Append to `source_stats.py`:

```python
import sqlalchemy as sql

from _shared_flow_utils.types import SupportedDatabaseDialects

from .filter import CHUNK_COLUMN_MAP
from .planner_types import ChunkColumnCandidate, ChunkStats, ColumnKind

BQ_ORDERABLE = {
    "INT64", "INTEGER", "NUMERIC", "BIGNUMERIC", "FLOAT64", "FLOAT",
    "DATE", "DATETIME", "TIMESTAMP", "STRING",
}
PG_ORDERABLE_PREFIXES = (
    "smallint", "integer", "bigint", "numeric", "real", "double",
    "date", "timestamp", "text", "character",
)


def rank_bq_candidates(rows, table: str) -> list[ChunkColumnCandidate]:
    """rows: (column_name, data_type, is_nullable, is_partitioning_column, cluster_ordinal)."""
    mapped = (CHUNK_COLUMN_MAP.get(table) or "").lower()
    ranked = []
    for name, data_type, is_nullable, is_partitioning, cluster_ordinal in rows:
        base_type = (data_type or "").split("(")[0].strip().upper()
        if base_type not in BQ_ORDERABLE:
            continue
        nullable = str(is_nullable).upper() == "YES"
        if str(is_partitioning).upper() == "YES":
            rank, kind = 0, ColumnKind.PARTITION
        elif cluster_ordinal is not None:
            rank, kind = (1, int(cluster_ordinal)), ColumnKind.CLUSTER
        elif name.lower() == mapped:
            rank, kind = 2, ColumnKind.MAPPED_ID
        else:
            continue
        sort_key = rank if isinstance(rank, tuple) else (rank, 0)
        ranked.append(
            (sort_key, ChunkColumnCandidate(name, kind, base_type, nullable))
        )
    return [candidate for _, candidate in sorted(ranked, key=lambda item: item[0])]


def rank_pg_candidates(rows, table: str) -> list[ChunkColumnCandidate]:
    """rows: (attname, data_type, nullable, is_pk)."""
    mapped = (CHUNK_COLUMN_MAP.get(table) or "").lower()
    ranked = []
    for name, data_type, nullable, is_pk in rows:
        lowered = (data_type or "").lower()
        if not lowered.startswith(PG_ORDERABLE_PREFIXES):
            continue
        if is_pk:
            rank, kind = 0, ColumnKind.PRIMARY_KEY
        elif name.lower() == mapped:
            rank, kind = 1, ColumnKind.MAPPED_ID
        else:
            continue
        ranked.append((rank, ChunkColumnCandidate(name, kind, lowered, bool(nullable))))
    return [candidate for _, candidate in sorted(ranked, key=lambda item: item[0])]


class _BaseAdapter:
    def __init__(self, read_conn):
        self.read_conn = read_conn

    def _scalar(self, statement: str):
        with self.read_conn.engine.connect() as connection:
            row = connection.execute(sql.text(statement)).fetchone()
        return row[0] if row else None

    def _rows(self, statement: str):
        with self.read_conn.engine.connect() as connection:
            return list(connection.execute(sql.text(statement)).fetchall())

    def collect(self, schema: str, table: str, config, logger=None) -> ChunkStats:
        from .chunk_utils import resolve_chunk_count

        row_count, is_exact = self.count_rows(schema, table)
        if row_count < config.small_table_threshold:
            return ChunkStats(row_count=row_count, row_count_is_exact=is_exact)
        candidates = self.list_chunk_candidates(schema, table)
        if not candidates:
            return ChunkStats(row_count=row_count, row_count_is_exact=is_exact)
        column = candidates[0]
        if logger:
            logger.info(
                f"Table '{table}': chunking on '{column.name}' ({column.kind.value}); "
                f"rejected {len(candidates) - 1} lower-priority candidate(s)."
            )
        chunk_count = resolve_chunk_count(row_count, config)
        boundaries = self.column_boundaries(schema, table, column.name, chunk_count)
        return ChunkStats(
            row_count=row_count,
            row_count_is_exact=is_exact,
            column=column,
            boundaries=tuple(boundaries),
        )


class PostgresSourceAdapter(_BaseAdapter):
    dialect = SupportedDatabaseDialects.POSTGRES.value

    def count_rows(self, schema, table):
        estimate = self._scalar(pg_row_count_sql(schema, table)) or 0
        return int(estimate), False

    def count_rows_exact(self, schema, table):
        return int(self._scalar(pg_count_rows_exact_sql(schema, table)) or 0)

    def list_chunk_candidates(self, schema, table):
        return rank_pg_candidates(self._rows(pg_candidates_sql(schema, table)), table)

    def column_boundaries(self, schema, table, column, n):
        return [row[0] for row in self._rows(pg_boundaries_sql(schema, table, column, n))]


class BigQuerySourceAdapter(_BaseAdapter):
    dialect = SupportedDatabaseDialects.BIGQUERY.value

    @property
    def project(self):
        return self.read_conn.tenant_configs.host

    def count_rows(self, schema, table):
        value = self._scalar(bq_row_count_sql(self.project, schema, table))
        if value is None:  # views and external tables are absent from __TABLES__
            return self.count_rows_exact(schema, table), True
        return int(value), True

    def count_rows_exact(self, schema, table):
        return int(self._scalar(bq_count_rows_exact_sql(self.project, schema, table)) or 0)

    def list_chunk_candidates(self, schema, table):
        return rank_bq_candidates(
            self._rows(bq_candidates_sql(self.project, schema, table)), table
        )

    def column_boundaries(self, schema, table, column, n):
        bounds = self._scalar(bq_boundaries_sql(self.project, schema, table, column, n))
        return list(bounds or [])


def build_source_adapter(read_conn):
    dialect = read_conn.tenant_configs.dialect
    if dialect == SupportedDatabaseDialects.BIGQUERY.value:
        return BigQuerySourceAdapter(read_conn)
    if dialect == SupportedDatabaseDialects.POSTGRES.value:
        return PostgresSourceAdapter(read_conn)
    raise PlannerError(f"no source adapter for dialect '{dialect}'")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapters.py -v
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/source_stats.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapters.py
git commit -m "feat(cache): add BigQuery and Postgres source adapters

BigQuery prefers the partition column, then the first clustering column,
then the mapped surrogate id, so each chunk can read a pruned slice."
```

---

## Task 8: Status tables and checkpoint I/O

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/checkpoint.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_checkpoint.py`

Both status tables are ephemeral — `create_schema_tables` drops them after a successful schema
copy. That is why migration is a shape probe rather than a versioned script: the only state that
can survive an upgrade is the leftovers of a failed pre-upgrade run, and the old code dropped its
target tables on failure, so there is nothing worth preserving.

- [ ] **Step 1: Write the failing test**

```python
import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    COPY_RUN_TABLE_NAME,
    COPY_STATUS_TABLE_NAME,
    drop_status_tables,
    ensure_status_tables,
    mark_complete,
    mark_failed,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
)


@pytest.fixture
def con(tmp_path):
    connection = duckdb.connect(str(tmp_path / "cache.db"))
    connection.execute('CREATE SCHEMA IF NOT EXISTS "cdm"')
    yield connection
    connection.close()


DB = "cache"


def _db_name(con):
    return con.execute("SELECT current_database()").fetchone()[0]


def test_ensure_creates_both_tables(con):
    ensure_status_tables(con, _db_name(con), "cdm")
    names = {
        row[0]
        for row in con.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'cdm'"
        ).fetchall()
    }
    assert {COPY_STATUS_TABLE_NAME, COPY_RUN_TABLE_NAME} <= names


def test_legacy_shape_is_detected_and_recreated(con):
    db = _db_name(con)
    con.execute(
        f'CREATE TABLE "{db}"."cdm"."{COPY_STATUS_TABLE_NAME}" '
        "(table_name TEXT PRIMARY KEY, status TEXT, started_at TIMESTAMP, completed_at TIMESTAMP)"
    )
    con.execute(
        f'INSERT INTO "{db}"."cdm"."{COPY_STATUS_TABLE_NAME}" VALUES (\'person\', \'COMPLETE\', NULL, NULL)'
    )
    ensure_status_tables(con, db, "cdm")
    remaining = con.execute(
        f'SELECT COUNT(*) FROM "{db}"."cdm"."{COPY_STATUS_TABLE_NAME}"'
    ).fetchone()[0]
    assert remaining == 0  # legacy rows discarded
    con.execute(f'SELECT plan_id, chunks_completed FROM "{db}"."cdm"."{COPY_STATUS_TABLE_NAME}"')


def test_checkpoint_round_trip(con):
    db = _db_name(con)
    ensure_status_tables(con, db, "cdm")
    mark_in_progress(con, db, "cdm", "measurement", "plan-abc", 180, 900_000_000)
    checkpoint = read_checkpoint(con, db, "cdm", "measurement")
    assert checkpoint.status == "IN_PROGRESS"
    assert checkpoint.plan_id == "plan-abc"
    assert checkpoint.chunks_completed == 0

    record_chunk_progress(con, db, "cdm", "measurement", 42)
    assert read_checkpoint(con, db, "cdm", "measurement").chunks_completed == 42

    mark_complete(con, db, "cdm", "measurement")
    assert read_checkpoint(con, db, "cdm", "measurement").status == "COMPLETE"


def test_mark_failed_keeps_progress(con):
    db = _db_name(con)
    ensure_status_tables(con, db, "cdm")
    mark_in_progress(con, db, "cdm", "measurement", "plan-abc", 180, 900_000_000)
    record_chunk_progress(con, db, "cdm", "measurement", 99)
    mark_failed(con, db, "cdm", "measurement")
    checkpoint = read_checkpoint(con, db, "cdm", "measurement")
    assert checkpoint.status == "FAILED"
    assert checkpoint.chunks_completed == 99


def test_read_checkpoint_returns_none_when_absent(con):
    db = _db_name(con)
    ensure_status_tables(con, db, "cdm")
    assert read_checkpoint(con, db, "cdm", "nothing") is None


def test_drop_removes_both_tables(con):
    db = _db_name(con)
    ensure_status_tables(con, db, "cdm")
    drop_status_tables(con, db, "cdm")
    names = {
        row[0]
        for row in con.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'cdm'"
        ).fetchall()
    }
    assert COPY_STATUS_TABLE_NAME not in names
    assert COPY_RUN_TABLE_NAME not in names
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_checkpoint.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'create_cachedb_file_plugin.checkpoint'`

- [ ] **Step 3: Write the implementation**

Create `checkpoint.py`. Note the `conn.execute(...)` / `conn.fetchone()` idiom: it works for both a
psycopg2 cursor (the Trex pgwire path) and a DuckDB connection (tests), which is the pattern
`copy.py` already relies on at lines 210-215.

```python
from dataclasses import dataclass

from .errors import FreshCopyResetError

COPY_STATUS_TABLE_NAME = "table_copy_status"
COPY_RUN_TABLE_NAME = "copy_run_status"


@dataclass(frozen=True)
class TableCheckpoint:
    table_name: str
    status: str
    plan_id: str | None
    chunks_total: int | None
    chunks_completed: int


def _status(database: str, schema: str) -> str:
    return f'"{database}"."{schema}"."{COPY_STATUS_TABLE_NAME}"'


def _runs(database: str, schema: str) -> str:
    return f'"{database}"."{schema}"."{COPY_RUN_TABLE_NAME}"'


def _fetchone(conn, statement: str):
    conn.execute(statement)
    return conn.fetchone()


def _fetchall(conn, statement: str):
    conn.execute(statement)
    return conn.fetchall()


def _has_new_shape(conn, database: str, schema: str) -> bool:
    try:
        conn.execute(
            f"SELECT plan_id, chunks_total, chunks_completed, rows_expected "
            f"FROM {_status(database, schema)} LIMIT 0"
        )
        return True
    except Exception:
        return False


def ensure_status_tables(conn, database: str, schema: str, logger=None) -> None:
    """Create both ephemeral tables, discarding a pre-upgrade status table."""
    try:
        conn.execute(f"SELECT 1 FROM {_status(database, schema)} LIMIT 0")
        exists = True
    except Exception:
        exists = False

    if exists and not _has_new_shape(conn, database, schema):
        if logger:
            logger.warning(
                f"Discarding pre-upgrade '{COPY_STATUS_TABLE_NAME}' in "
                f"'{database}.{schema}'; all tables will be treated as not started."
            )
        conn.execute(f"DROP TABLE {_status(database, schema)}")

    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {_status(database, schema)} ("
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
        f"CREATE TABLE IF NOT EXISTS {_runs(database, schema)} ("
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
        f"FROM {_status(database, schema)} WHERE table_name = '{table}'",
    )
    if not row:
        return None
    return TableCheckpoint(
        table_name=row[0],
        status=row[1],
        plan_id=row[2],
        chunks_total=row[3],
        chunks_completed=int(row[4] or 0),
    )


def mark_in_progress(
    conn, database: str, schema: str, table: str, plan_id: str, chunks_total: int, rows_expected: int
) -> None:
    conn.execute(
        f"INSERT INTO {_status(database, schema)} "
        "(table_name, status, started_at, completed_at, plan_id, chunks_total, "
        " chunks_completed, rows_expected) "
        f"VALUES ('{table}', 'IN_PROGRESS', CAST(NOW() AS TIMESTAMP), NULL, "
        f"        '{plan_id}', {int(chunks_total)}, 0, {int(rows_expected)}) "
        "ON CONFLICT(table_name) DO UPDATE SET "
        "  status = 'IN_PROGRESS', started_at = CAST(NOW() AS TIMESTAMP), completed_at = NULL, "
        f"  plan_id = '{plan_id}', chunks_total = {int(chunks_total)}, "
        f"  rows_expected = {int(rows_expected)}"
    )


def reset_progress(conn, database: str, schema: str, table: str) -> None:
    conn.execute(
        f"UPDATE {_status(database, schema)} SET chunks_completed = 0 "
        f"WHERE table_name = '{table}'"
    )


def record_chunk_progress(conn, database: str, schema: str, table: str, completed: int) -> None:
    conn.execute(
        f"UPDATE {_status(database, schema)} SET chunks_completed = {int(completed)} "
        f"WHERE table_name = '{table}'"
    )


def mark_complete(conn, database: str, schema: str, table: str) -> None:
    conn.execute(
        f"UPDATE {_status(database, schema)} SET status = 'COMPLETE', "
        f"completed_at = CAST(NOW() AS TIMESTAMP) WHERE table_name = '{table}'"
    )


def mark_failed(conn, database: str, schema: str, table: str) -> None:
    """Mark FAILED and PRESERVE the target table and the checkpoint."""
    conn.execute(
        f"UPDATE {_status(database, schema)} SET status = 'FAILED' WHERE table_name = '{table}'"
    )


def completed_tables(conn, database: str, schema: str) -> list[str]:
    rows = _fetchall(
        conn,
        f"SELECT table_name FROM {_status(database, schema)} WHERE status = 'COMPLETE'",
    )
    return [row[0] for row in rows]


def drop_status_tables(conn, database: str, schema: str) -> None:
    conn.execute(f"DROP TABLE IF EXISTS {_status(database, schema)}")
    conn.execute(f"DROP TABLE IF EXISTS {_runs(database, schema)}")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_checkpoint.py -v
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/checkpoint.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_checkpoint.py
git commit -m "feat(cache): add chunk-level checkpoint tables and accessors

Failure now preserves the target table and the chunk high-water mark, so a
retry resumes instead of restarting from chunk 0."
```

---

## Task 9: Table reset and fresh-copy arbitration

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/checkpoint.py`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_fresh_copy.py`

The subtle requirement: `create_schema_tables_task` carries `retries=3`. If the reset ran on every
attempt, attempt 2 would destroy attempt 1's progress and `freshCopy` would silently undo the
convergence this whole change exists to provide. So the reset is arbitrated once per
`(flow_run_id, target_schema)` — composite because one flow run copies the datamart schema and then
the results schema (`flow.py:43-48`).

- [ ] **Step 1: Write the failing test**

```python
import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    apply_fresh_copy,
    ensure_status_tables,
    mark_complete,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
    reset_table,
)
from create_cachedb_file_plugin.errors import FreshCopyResetError


@pytest.fixture
def con(tmp_path):
    connection = duckdb.connect(str(tmp_path / "cache.db"))
    connection.execute('CREATE SCHEMA IF NOT EXISTS "cdm"')
    yield connection
    connection.close()


def _db(con):
    return con.execute("SELECT current_database()").fetchone()[0]


def _seed(con, db, table, status, rows=3):
    con.execute(f'CREATE OR REPLACE TABLE "{db}"."cdm"."{table}" (id BIGINT)')
    for i in range(rows):
        con.execute(f'INSERT INTO "{db}"."cdm"."{table}" VALUES ({i})')
    mark_in_progress(con, db, "cdm", table, "plan-1", 10, 1000)
    record_chunk_progress(con, db, "cdm", table, 5)
    if status == "COMPLETE":
        mark_complete(con, db, "cdm", table)


def _table_exists(con, db, table):
    return bool(
        con.execute(
            "SELECT COUNT(*) FROM information_schema.tables "
            f"WHERE table_schema = 'cdm' AND table_name = '{table}'"
        ).fetchone()[0]
    )


def test_reset_table_drops_target_and_status_row(con):
    db = _db(con)
    ensure_status_tables(con, db, "cdm")
    _seed(con, db, "measurement", "FAILED")
    discarded = reset_table(con, db, "cdm", "measurement")
    assert discarded == 3
    assert not _table_exists(con, db, "measurement")
    assert read_checkpoint(con, db, "cdm", "measurement") is None


def test_fresh_copy_resets_incomplete_tables_only(con):
    db = _db(con)
    ensure_status_tables(con, db, "cdm")
    _seed(con, db, "measurement", "FAILED")
    _seed(con, db, "person", "COMPLETE")

    reset = apply_fresh_copy(con, db, "cdm", flow_run_id="run-1")

    assert reset == ["measurement"]
    assert not _table_exists(con, db, "measurement")
    assert _table_exists(con, db, "person")
    assert read_checkpoint(con, db, "cdm", "person").status == "COMPLETE"


def test_fresh_copy_is_applied_once_per_run_and_schema(con):
    db = _db(con)
    ensure_status_tables(con, db, "cdm")
    _seed(con, db, "measurement", "FAILED")

    first = apply_fresh_copy(con, db, "cdm", flow_run_id="run-1")
    assert first == ["measurement"]

    # Simulate a task retry that already made progress.
    _seed(con, db, "measurement", "FAILED")
    second = apply_fresh_copy(con, db, "cdm", flow_run_id="run-1")

    assert second == []
    assert _table_exists(con, db, "measurement"), "retry must not wipe progress"


def test_a_second_schema_in_the_same_run_gets_its_own_reset(con):
    db = _db(con)
    con.execute('CREATE SCHEMA IF NOT EXISTS "results"')
    ensure_status_tables(con, db, "cdm")
    ensure_status_tables(con, db, "results")
    _seed(con, db, "measurement", "FAILED")

    apply_fresh_copy(con, db, "cdm", flow_run_id="run-1")
    con.execute('CREATE OR REPLACE TABLE "results"."cohort" (id BIGINT)')
    mark_in_progress(con, db, "results", "cohort", "plan-2", 4, 40)

    assert apply_fresh_copy(con, db, "results", flow_run_id="run-1") == ["cohort"]


def test_dry_run_destroys_nothing_and_does_not_consume_the_reset(con):
    db = _db(con)
    ensure_status_tables(con, db, "cdm")
    _seed(con, db, "measurement", "FAILED")

    planned = apply_fresh_copy(con, db, "cdm", flow_run_id="run-1", dry_run=True)

    assert planned == ["measurement"]
    assert _table_exists(con, db, "measurement")
    assert apply_fresh_copy(con, db, "cdm", flow_run_id="run-1") == ["measurement"]


def test_reset_failure_raises_fresh_copy_reset_error(con):
    db = _db(con)
    ensure_status_tables(con, db, "cdm")
    con.close()
    with pytest.raises(FreshCopyResetError):
        apply_fresh_copy(con, db, "cdm", flow_run_id="run-1")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_fresh_copy.py -v
```

Expected: FAIL — `ImportError: cannot import name 'apply_fresh_copy'`

- [ ] **Step 3: Write the implementation**

Append to `checkpoint.py`:

```python
def _target(database: str, schema: str, table: str) -> str:
    return f'"{database}"."{schema}"."{table}"'


def reset_table(conn, database: str, schema: str, table: str, logger=None) -> int:
    """Drop a target table and forget its checkpoint. Returns rows discarded."""
    discarded = 0
    try:
        row = _fetchone(conn, f"SELECT COUNT(*) FROM {_target(database, schema, table)}")
        discarded = int(row[0]) if row else 0
    except Exception:
        discarded = 0  # target does not exist yet
    conn.execute(f"DROP TABLE IF EXISTS {_target(database, schema, table)}")
    conn.execute(f"DELETE FROM {_status(database, schema)} WHERE table_name = '{table}'")
    if logger:
        logger.warning(
            f"Fresh copy: discarded target '{schema}.{table}' ({discarded:,} rows) "
            "and its checkpoint."
        )
    return discarded


def apply_fresh_copy(
    conn, database: str, schema: str, flow_run_id: str, dry_run: bool = False, logger=None
) -> list[str]:
    """Discard non-COMPLETE tables once per (flow run, target schema).

    Returns the table names that were reset (or, under dry_run, would be).
    Arbitration matters: `create_schema_tables_task` retries, and re-applying
    the reset on attempt 2 would destroy attempt 1's progress.
    """
    try:
        already = _fetchone(
            conn,
            f"SELECT 1 FROM {_runs(database, schema)} "
            f"WHERE flow_run_id = '{flow_run_id}' AND target_schema = '{schema}'",
        )
        if already:
            if logger:
                logger.info(
                    f"Fresh copy already applied for run '{flow_run_id}' schema '{schema}'; "
                    "resuming instead."
                )
            return []

        rows = _fetchall(
            conn,
            f"SELECT table_name FROM {_status(database, schema)} WHERE status <> 'COMPLETE'",
        )
        targets = sorted(row[0] for row in rows)

        if dry_run:
            if logger:
                logger.warning(
                    f"Dry run: fresh copy would discard {len(targets)} table(s): {targets}"
                )
            return targets

        for table in targets:
            reset_table(conn, database, schema, table, logger)

        conn.execute(
            f"INSERT INTO {_runs(database, schema)} (flow_run_id, target_schema, reset_applied_at) "
            f"VALUES ('{flow_run_id}', '{schema}', CAST(NOW() AS TIMESTAMP))"
        )
        if logger:
            logger.warning(f"Fresh copy applied to schema '{schema}': reset {targets}")
        return targets
    except Exception as exc:
        raise FreshCopyResetError(
            f"Fresh copy reset failed for '{database}.{schema}': {exc}"
        ) from exc
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_fresh_copy.py -v
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/checkpoint.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_fresh_copy.py
git commit -m "feat(cache): add fresh-copy reset arbitrated once per run and schema"
```

---

## Task 10: Options plumbing — `freshCopy`, `dryRun`, and a broken call site

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/types.py:22-42` (`CopyParameters`), `:85-111` (`CreateCacheOptions`)
- Modify: `plugins/flows/base/create_cachedb_file_plugin/flow.py:69-81`, `:170-180`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_options.py`

**A latent bug you must fix here.** `CopyParameters` is a `@dataclass` whose `vocab_schema` and
`chunk_size` fields have no defaults, but `create_cdw_validation_config_plugin` (`flow.py:170-180`)
constructs it without either — that call raises `TypeError` today. Give the optional fields
defaults so the dataclass tolerates partial construction, and pass the new fields explicitly at
both call sites.

- [ ] **Step 1: Write the failing test**

```python
import pytest

from create_cachedb_file_plugin.types import CopyParameters, CreateCacheOptions


def test_fresh_copy_and_dry_run_default_to_false():
    options = CreateCacheOptions(
        flowActionType="create_datamart_cache", databaseCode="db", schemaName="cdm"
    )
    assert options.fresh_copy is False
    assert options.dry_run is False


def test_camel_case_aliases_are_accepted():
    options = CreateCacheOptions(
        flowActionType="create_datamart_cache",
        databaseCode="db",
        schemaName="cdm",
        freshCopy=True,
        dryRun=True,
    )
    assert options.fresh_copy is True
    assert options.dry_run is True


def test_copy_parameters_construct_without_the_optional_fields():
    # Regression: create_cdw_validation_config_plugin omits vocab_schema and
    # chunk_size, which raised TypeError before this change.
    params = CopyParameters(
        source_database="db__srcdb",
        target_database="db",
        source_schema="cdm",
        target_schema="cdm",
        patient_filter=None,
        table_filter=None,
        timestamp_filter=None,
        fts_tables=[],
        limit_statement="",
    )
    assert params.vocab_schema is None
    assert params.chunk_size is None
    assert params.fresh_copy is False
    assert params.dry_run is False
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_options.py -v
```

Expected: FAIL — `AttributeError: 'CreateCacheOptions' object has no attribute 'fresh_copy'`

- [ ] **Step 3: Write the implementation**

In `types.py`, replace the `CopyParameters` dataclass body with:

```python
@dataclass
class CopyParameters:
    """
    Dataclass to hold parameters for creating cache
    """

    source_database: str
    target_database: str
    source_schema: str
    target_schema: str

    patient_filter: List[int] | None
    table_filter: Dict[str, List[str]] | None
    timestamp_filter: str | None

    fts_tables: List[str]

    limit_statement: str

    vocab_schema: str | None = None
    chunk_size: int | None = None
    fresh_copy: bool = False
    dry_run: bool = False
```

In `types.py`, add to `CreateCacheOptions` immediately after the `chunk_size` field:

```python
    fresh_copy: Optional[bool] = Field(default=False, alias="freshCopy")
    dry_run: Optional[bool] = Field(default=False, alias="dryRun")
```

In `flow.py`, extend the `CopyParameters(...)` call in `create_cache_flow` (currently ending
`chunk_size=options.chunk_size`) with:

```python
        chunk_size=options.chunk_size,
        fresh_copy=bool(options.fresh_copy),
        dry_run=bool(options.dry_run),
    )
```

In `flow.py`, the `CopyParameters(...)` call inside `create_cdw_validation_config_plugin` now
constructs cleanly thanks to the defaults; no edit is needed there beyond confirming it runs.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_options.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/types.py \
        plugins/flows/base/create_cachedb_file_plugin/flow.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_options.py
git commit -m "feat(cache): add freshCopy and dryRun options

Also gives CopyParameters defaults for its optional fields; the CDW
validation flow constructed it without vocab_schema or chunk_size and
raised TypeError."
```

---

## Task 11: Chunked copy execution

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py:271-360` (`create_empty_target_table`, `copy_table_chunk`, `copy_table`)
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_copy_chunks.py`

Per-chunk retry is a **hand-rolled loop, not a Prefect task**. A 900M-row table plans ~180 chunks
and the cap allows 2000; turning each into a Prefect task run would flood the Prefect API with
thousands of task runs per table for no benefit.

- [ ] **Step 1: Write the failing test**

```python
import duckdb
import pytest

from create_cachedb_file_plugin.copy import copy_chunk_with_retry
from create_cachedb_file_plugin.errors import ChunkCopyError


class FlakyConn:
    """Fails the first `failures` executions, then delegates to DuckDB."""

    def __init__(self, con, failures):
        self.con = con
        self.failures = failures
        self.calls = 0

    def execute(self, statement):
        self.calls += 1
        if self.failures > 0:
            self.failures -= 1
            raise RuntimeError("transient")
        return self.con.execute(statement)


@pytest.fixture
def con(tmp_path):
    connection = duckdb.connect(str(tmp_path / "cache.db"))
    connection.execute("CREATE TABLE src (id BIGINT)")
    connection.executemany("INSERT INTO src VALUES (?)", [(i,) for i in range(100)])
    connection.execute("CREATE TABLE tgt (id BIGINT)")
    yield connection
    connection.close()


def test_chunk_is_idempotent_when_replayed(con):
    for _ in range(3):
        copy_chunk_with_retry(
            con, "tgt", "SELECT id FROM src WHERE id < 10", "id < 10", attempts=1, backoff=0
        )
    assert con.execute("SELECT COUNT(*) FROM tgt").fetchone()[0] == 10


def test_chunk_retries_then_succeeds(con):
    flaky = FlakyConn(con, failures=2)
    copy_chunk_with_retry(
        flaky, "tgt", "SELECT id FROM src WHERE id < 10", "id < 10", attempts=3, backoff=0
    )
    assert con.execute("SELECT COUNT(*) FROM tgt").fetchone()[0] == 10


def test_chunk_raises_after_exhausting_attempts(con):
    flaky = FlakyConn(con, failures=99)
    with pytest.raises(ChunkCopyError):
        copy_chunk_with_retry(
            flaky, "tgt", "SELECT id FROM src WHERE id < 10", "id < 10", attempts=3, backoff=0
        )
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_copy_chunks.py -v
```

Expected: FAIL — `ImportError: cannot import name 'copy_chunk_with_retry'`

- [ ] **Step 3: Write the implementation**

In `copy.py`, replace `copy_table_chunk` (lines 281-285) with:

```python
def copy_chunk_with_retry(
    write_conn,
    qualified_target: str,
    select_sql: str,
    predicate: str,
    attempts: int = 3,
    backoff: float = 2.0,
    logger=None,
):
    """Copy one chunk. Idempotent: the DELETE makes a replay safe.

    Retried in-process rather than as a Prefect task - a large table plans
    hundreds of chunks and the cap allows 2000, so per-chunk task runs would
    flood the Prefect API for no benefit.
    """
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            write_conn.execute(f"DELETE FROM {qualified_target} WHERE {predicate}")
            write_conn.execute(f"INSERT INTO {qualified_target} {select_sql}")
            return
        except Exception as exc:  # noqa: BLE001 - re-raised as ChunkCopyError below
            last_error = exc
            if logger:
                logger.warning(
                    f"Chunk copy attempt {attempt}/{attempts} failed for {qualified_target} "
                    f"[{predicate}]: {exc}"
                )
            if attempt < attempts and backoff:
                time.sleep(backoff ** attempt)
    raise ChunkCopyError(
        f"Chunk failed after {attempts} attempts for {qualified_target} [{predicate}]: "
        f"{last_error}"
    ) from last_error
```

Add to the imports at the top of `copy.py`:

```python
import time

from .checkpoint import (
    COPY_STATUS_TABLE_NAME,
    apply_fresh_copy,
    completed_tables,
    drop_status_tables,
    ensure_status_tables,
    mark_complete,
    mark_failed,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
    reset_progress,
    reset_table,
)
from .chunk_utils import find_column_case_insensitive, plan_chunks, resolve_target_chunk_rows
from .errors import ChunkCopyError, PlannerError, ReconciliationError
from .planner_types import ChunkConfig, ChunkStrategy
from .source_stats import build_source_adapter
```

and delete the now-stale import line
`from .chunk_utils import determine_chunk_size, plan_chunks, find_column_case_insensitive, COPY_STATUS_TABLE_NAME`
plus the local `mark_in_progress`, `mark_complete`, `cleanup`, `create_cache_status_table`, and
`drop_cache_status_table` definitions (lines 33-79) — they now live in `checkpoint.py`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_copy_chunks.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_copy_chunks.py
git commit -m "feat(cache): make chunk copies idempotent and retryable in process"
```

---

## Task 12: Rewrite `copy_table` — resume, reconcile, never drop

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py:287-360`

- [ ] **Step 1: Write the new `copy_table`**

Replace `copy_table_task` and `copy_table` wholesale. The `timeout_seconds` moves here from
`create_schema_tables_task`, so the budget is per table rather than shared across the whole schema.

```python
@task(
    log_prints=True,
    task_run_name="copy_table_{query_columns.table}",
    tags=["table-level-concurrency"],
    timeout_seconds=int(Variable.get("cache_task_timeout")),
    cache_policy=NONE,
)
def copy_table_task(write_conn, read_conn, copy_params, query_columns, source_schema, adapter):
    logger = get_run_logger()
    copy_table(write_conn, read_conn, copy_params, query_columns, source_schema, adapter, logger)


def copy_table(write_conn, read_conn, copy_params, query_columns, source_schema, adapter, logger):
    table = query_columns.table
    database = copy_params.target_database
    schema = copy_params.target_schema
    qualified_target = f'"{database}"."{schema}"."{table}"'

    config = ChunkConfig(
        target_chunk_rows=resolve_target_chunk_rows(
            read_conn.tenant_configs.dialect, copy_params.chunk_size
        ),
        dry_run=copy_params.dry_run,
    )

    try:
        stats = adapter.collect(source_schema, table, config, logger)
        plan = plan_chunks(
            read_conn.tenant_configs.dialect, source_schema, table, stats, config, logger
        )

        if config.dry_run:
            logger.info(
                f"Dry run: '{table}' -> {plan.strategy.value}, {plan.chunk_count} chunk(s) "
                f"on '{plan.column_name}' ({plan.column_kind.value if plan.column_kind else '-'}), "
                f"~{plan.estimated_rows_per_chunk:,} rows each, plan {plan.plan_id[:12]}"
            )
            return stats.row_count

        if query_columns.columns_to_copy == ["*"]:
            query_columns = _resolve_actual_columns(read_conn, source_schema, query_columns)

        if plan.strategy is ChunkStrategy.SINGLE_STATEMENT:
            mark_in_progress(write_conn, database, schema, table, plan.plan_id, 1, stats.row_count)
            select_sql = create_select_query(copy_params, query_columns, source_schema)
            execute_statement(write_conn, f"DROP TABLE IF EXISTS {qualified_target};")
            execute_statement(write_conn, f"CREATE TABLE {qualified_target} AS {select_sql}")
        else:
            checkpoint = read_checkpoint(write_conn, database, schema, table)
            resume_from = 0
            if checkpoint and checkpoint.plan_id == plan.plan_id:
                resume_from = min(checkpoint.chunks_completed, plan.chunk_count)
                logger.info(
                    f"Resuming '{table}' at chunk {resume_from + 1}/{plan.chunk_count} "
                    f"(plan {plan.plan_id[:12]})."
                )
            elif checkpoint:
                logger.warning(
                    f"Plan for '{table}' changed ({checkpoint.plan_id[:12]} -> "
                    f"{plan.plan_id[:12]}); discarding partial data and restarting."
                )
                reset_table(write_conn, database, schema, table, logger)

            mark_in_progress(
                write_conn, database, schema, table, plan.plan_id, plan.chunk_count, stats.row_count
            )
            if resume_from:
                record_chunk_progress(write_conn, database, schema, table, resume_from)
            else:
                reset_progress(write_conn, database, schema, table)

            create_empty_target_table(write_conn, copy_params, query_columns, source_schema)

            for index in range(resume_from, plan.chunk_count):
                predicate = plan.predicates[index]
                started = time.monotonic()
                select_sql = create_select_query(
                    copy_params, query_columns, source_schema, predicate
                )
                copy_chunk_with_retry(
                    write_conn, qualified_target, select_sql, predicate, logger=logger
                )
                record_chunk_progress(write_conn, database, schema, table, index + 1)
                logger.info(
                    f"'{table}' chunk {index + 1}/{plan.chunk_count} done in "
                    f"{time.monotonic() - started:.1f}s [{predicate}]"
                )

        _reconcile(write_conn, adapter, source_schema, table, qualified_target, logger)
        mark_complete(write_conn, database, schema, table)
        return stats.row_count

    except Exception as exc:
        logger.error(f"Table copy for '{table}' failed: {exc}")
        mark_failed(write_conn, database, schema, table)
        raise


def _resolve_actual_columns(read_conn, source_schema, query_columns):
    actual_columns = read_conn.get_columns(source_schema, query_columns.table)
    mapping = CDM_COLUMN_FILTER_MAP.get(query_columns.table, {})
    return QueryColumns(
        table=query_columns.table,
        columns_to_copy=actual_columns,
        patient_filter_col=find_column_case_insensitive(
            actual_columns, mapping.get("person_id_column")
        )
        or query_columns.patient_filter_col,
        timestamp_filter_col=find_column_case_insensitive(
            actual_columns, mapping.get("timestamp_column")
        )
        or query_columns.timestamp_filter_col,
    )


def _reconcile(write_conn, adapter, source_schema, table, qualified_target, logger):
    source_rows = adapter.count_rows_exact(source_schema, table)
    write_conn.execute(f"SELECT COUNT(*) FROM {qualified_target}")
    target_rows = int(write_conn.fetchone()[0])
    if source_rows != target_rows:
        raise ReconciliationError(
            f"Row count mismatch for '{table}': source {source_rows:,}, "
            f"target {target_rows:,} (delta {target_rows - source_rows:+,})"
        )
    logger.info(f"Reconciled '{table}': {target_rows:,} rows.")
```

Also change `create_empty_target_table` (line 271) to be non-destructive, since chunk resume must
not wipe the table it is resuming into:

```python
def create_empty_target_table(write_conn, copy_params, query_columns, source_schema):
    select_sql = create_select_query(copy_params, query_columns, source_schema, None)
    sql = f"""
    CREATE TABLE IF NOT EXISTS "{copy_params.target_database}"."{copy_params.target_schema}"."{query_columns.table}" AS
    SELECT * FROM ({select_sql}) WHERE 1=0;
    """
    execute_statement(write_conn, sql)
```

- [ ] **Step 2: Remove the schema-level timeout**

In the `@task` decorator of `create_schema_tables_task` (line 125-131), delete the
`timeout_seconds=int(Variable.get("cache_task_timeout")),` line. The budget now lives on
`copy_table_task`.

- [ ] **Step 3: Verify the module imports cleanly**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/python -c "import ast,sys; ast.parse(open('create_cachedb_file_plugin/copy.py').read())" && echo "syntax OK"
```

Expected: `syntax OK`

(A full import needs Prefect, which the test venv does not have; Task 16 covers runtime import.)

- [ ] **Step 4: Run the whole offline suite**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v \
  --ignore=create_cachedb_file_plugin/tests/test_copy_integration.py
```

Expected: all previously-passing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py
git commit -m "feat(cache): resume chunked copies and reconcile before completing

Failure no longer drops the target table, so a retry continues from the
chunk high-water mark. The task timeout moves from the schema loop onto
the individual table."
```

---

## Task 13: Wire fresh copy and dry run into the schema loop

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py:162-268` (`create_schema_tables`)

- [ ] **Step 1: Replace the status-table bootstrap and add the reset**

In `create_schema_tables`, replace the `create_cache_status_table(write_conn, copy_params)` call and
the "Check for already completed tables" block (lines 166 and 207-228) with:

```python
    ensure_status_tables(write_conn, copy_params.target_database, copy_params.target_schema, logger)

    if copy_params.fresh_copy:
        apply_fresh_copy(
            write_conn,
            copy_params.target_database,
            copy_params.target_schema,
            flow_run_id=str(flow_run.id),
            dry_run=copy_params.dry_run,
            logger=logger,
        )

    already_done = completed_tables(
        write_conn, copy_params.target_database, copy_params.target_schema
    )
    tables_left_to_copy = [t for t in tables_to_copy if t not in already_done]
    skipped_count = original_count - len(tables_left_to_copy)
    logger.info(
        f"There are {len(tables_left_to_copy)}/{original_count} tables left to copy "
        f"from schema(s): {copy_params.source_schema}"
        f"{', ' + copy_params.vocab_schema if has_separate_vocab_schema else ''}: "
        f"{tables_left_to_copy}"
    )
    if skipped_count > 0:
        logger.info(f"Skipping {skipped_count} already completed tables: {already_done}")
```

Add `from prefect.runtime import flow_run` to the imports at the top of `copy.py`.

- [ ] **Step 2: Build the adapter once and pass it down**

Immediately after the BigQuery global-settings block (lines 230-232), add:

```python
    adapter = build_source_adapter(read_conn)
```

and change the two call sites in the loop:

```python
        copy_table_task(write_conn, read_conn, copy_params, query_columns, source_schema_for_table, adapter)

        if not copy_params.dry_run:
            copy_indexes(write_conn, read_conn, copy_params, query_columns, source_schema_for_table, logger)
```

- [ ] **Step 3: Guard the teardown**

Replace the final `drop_cache_status_table(write_conn, copy_params)` (line 268) with:

```python
    if not copy_params.dry_run:
        drop_status_tables(
            write_conn, copy_params.target_database, copy_params.target_schema
        )
```

- [ ] **Step 4: Verify syntax and rerun the offline suite**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/python -c "import ast; ast.parse(open('create_cachedb_file_plugin/copy.py').read())" && echo "syntax OK"
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v \
  --ignore=create_cachedb_file_plugin/tests/test_copy_integration.py
```

Expected: `syntax OK`, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py
git commit -m "feat(cache): apply freshCopy and dryRun in the schema copy loop"
```

---

## Task 14: Delete dead code

**Files:**
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py:362-408` (`create_select_query`)

Two dead branches sit inside a function this change rewrites. The `LIMIT/OFFSET` tuple branch is
unreachable — `plan_chunks` only ever returned strings — and it is also wrong as written (no
`ORDER BY`, so pages could overlap or drop rows).

- [ ] **Step 1: Write the failing test**

```python
from create_cachedb_file_plugin.copy import create_select_query
from create_cachedb_file_plugin.types import CopyParameters, QueryColumns


def params(**kwargs):
    base = dict(
        source_database="db__srcdb",
        target_database="db",
        source_schema="cdm",
        target_schema="cdm",
        patient_filter=None,
        table_filter=None,
        timestamp_filter=None,
        fts_tables=[],
        limit_statement="",
    )
    base.update(kwargs)
    return CopyParameters(**base)


def cols():
    return QueryColumns(
        table="measurement",
        columns_to_copy=["measurement_id", "person_id"],
        patient_filter_col=None,
        timestamp_filter_col=None,
    )


def test_predicate_becomes_a_where_clause():
    sql = create_select_query(params(), cols(), "cdm", '"measurement_id" < 10')
    assert sql.endswith('WHERE "measurement_id" < 10')
    assert "OFFSET" not in sql


def test_patient_filter_is_anded_onto_the_chunk_predicate():
    query_columns = QueryColumns(
        table="measurement",
        columns_to_copy=["measurement_id", "person_id"],
        patient_filter_col="person_id",
        timestamp_filter_col=None,
    )
    sql = create_select_query(
        params(patient_filter=[1, 2]), query_columns, "cdm", '"measurement_id" < 10'
    )
    assert 'WHERE "measurement_id" < 10 AND person_id IN (1, 2)' in sql


def test_no_predicate_produces_no_where_clause():
    assert "WHERE" not in create_select_query(params(), cols(), "cdm")
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_select_query.py -v
```

Expected: FAIL (the tuple branch and its `has_where = False` reset still exist; `create_select_query`
also cannot be imported without Prefect — if that blocks, move `create_select_query` into
`source_stats.py` first and re-point the import in `copy.py`).

- [ ] **Step 3: Write the implementation**

Replace `create_select_query` with:

```python
def create_select_query(copy_params, query_columns, source_schema, predicate: str | None = None) -> str:
    columns_to_copy = query_columns.columns_to_copy
    table = query_columns.table
    database = copy_params.source_database

    if not columns_to_copy or columns_to_copy == ["*"]:
        columns_sql = "*"
    else:
        columns_sql = ", ".join(f'"{col}"' for col in columns_to_copy)

    base_query = f'SELECT {columns_sql} FROM "{database}"."{source_schema}"."{table}"'

    conditions = []
    if predicate:
        conditions.append(predicate)
    if query_columns.patient_filter_col and copy_params.patient_filter:
        ids = ", ".join(str(int(pid)) for pid in copy_params.patient_filter)
        conditions.append(f"{query_columns.patient_filter_col} IN ({ids})")
    if query_columns.timestamp_filter_col and copy_params.timestamp_filter:
        ts_value = str(copy_params.timestamp_filter).replace("'", "''")
        conditions.append(f"{query_columns.timestamp_filter_col} = '{ts_value}'")

    if conditions:
        base_query += " WHERE " + " AND ".join(conditions)

    return base_query
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_select_query.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/copy.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_select_query.py
git commit -m "refactor(cache): drop the unreachable LIMIT/OFFSET chunk branch"
```

---

## Task 15: Documentation

**Files:**
- Modify: `env-vars.md`
- Modify: `internal/docs/env-vars.yml`
- Modify: `plugins/flows/base/create_cachedb_file_plugin/README.md`

- [ ] **Step 1: Record the `CACHE_TASK_TIMEOUT` semantics change**

Find the `CACHE_TASK_TIMEOUT` entry in both files and update the description to:

> Timeout in seconds applied to a **single table copy** in the cache plugin (previously applied to
> the whole schema copy). Default 10800. A table that exceeds it fails, keeps its chunk checkpoint,
> and resumes on the next attempt.

If no entry exists in `env-vars.md`, add one in the same format as its neighbours.

- [ ] **Step 2: Document the new flow options**

Add to `create_cachedb_file_plugin/README.md`:

```markdown
## Options

| Option (alias) | Default | Meaning |
|---|---|---|
| `chunkSize` | dialect default (BigQuery 5,000,000; Postgres 1,000,000) | Target rows per chunk |
| `freshCopy` | `false` | Discard target data and checkpoints for tables that are not COMPLETE, then re-copy them from chunk 0. Applied once per flow run and target schema, so a task retry resumes rather than wiping. COMPLETE tables are never touched. |
| `dryRun` | `false` | Log the chunk plan (and, with `freshCopy`, the would-be discard set) without copying or destroying anything. |
```

- [ ] **Step 3: Commit**

```bash
git add env-vars.md internal/docs/env-vars.yml \
        plugins/flows/base/create_cachedb_file_plugin/README.md
git commit -m "docs(cache): document freshCopy, dryRun, and the per-table timeout"
```

---

## Task 16: Integration test

**Files:**
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_copy_integration.py`

Exercises the real orchestration against a DuckDB source with a deliberately sparse chunk column —
the shape that OOMs today.

- [ ] **Step 1: Write the test**

```python
import duckdb
import pytest

from create_cachedb_file_plugin.chunk_utils import build_predicates, interior_cuts
from create_cachedb_file_plugin.copy import copy_chunk_with_retry
from create_cachedb_file_plugin.planner_types import ChunkColumnCandidate, ColumnKind

pytestmark = pytest.mark.integration

ROWS = 200_000


@pytest.fixture
def con(tmp_path):
    connection = duckdb.connect(str(tmp_path / "cache.db"))
    # Sparse, hash-like ids spread across the whole INT64 range.
    connection.execute(
        "CREATE TABLE src AS "
        f"SELECT hash(i)::BIGINT AS measurement_id, i AS person_id FROM range({ROWS}) t(i)"
    )
    connection.execute("CREATE TABLE tgt (measurement_id BIGINT, person_id BIGINT)")
    yield connection
    connection.close()


def test_sparse_ids_copy_completely_and_resume_correctly(con):
    cuts_rows = con.execute(
        "SELECT approx_quantile(measurement_id, x) FROM src, "
        "(SELECT unnest(range(0, 33)) / 32.0 AS x) GROUP BY x ORDER BY x"
    ).fetchall()
    column = ChunkColumnCandidate(
        "measurement_id", ColumnKind.MAPPED_ID, "BIGINT", nullable=False
    )
    predicates = build_predicates(column, interior_cuts([r[0] for r in cuts_rows]))
    assert len(predicates) <= 2_001

    # Copy the first half, simulating a crash after chunk N.
    half = len(predicates) // 2
    for predicate in predicates[:half]:
        copy_chunk_with_retry(
            con,
            "tgt",
            f"SELECT measurement_id, person_id FROM src WHERE {predicate}",
            predicate,
            attempts=1,
            backoff=0,
        )
    partial = con.execute("SELECT COUNT(*) FROM tgt").fetchone()[0]
    assert 0 < partial < ROWS

    # Resume: replay the last completed chunk plus the rest.
    for predicate in predicates[half - 1 :]:
        copy_chunk_with_retry(
            con,
            "tgt",
            f"SELECT measurement_id, person_id FROM src WHERE {predicate}",
            predicate,
            attempts=1,
            backoff=0,
        )

    assert con.execute("SELECT COUNT(*) FROM tgt").fetchone()[0] == ROWS
    assert (
        con.execute("SELECT COUNT(DISTINCT measurement_id) FROM tgt").fetchone()[0]
        == con.execute("SELECT COUNT(DISTINCT measurement_id) FROM src").fetchone()[0]
    )
```

- [ ] **Step 2: Run it**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest \
  create_cachedb_file_plugin/tests/test_copy_integration.py -v -m integration
```

Expected: `1 passed`

- [ ] **Step 3: Commit**

```bash
git add plugins/flows/base/create_cachedb_file_plugin/tests/test_copy_integration.py
git commit -m "test(cache): integration cover sparse-id chunking and mid-table resume"
```

---

## Task 17: Full verification

- [ ] **Step 1: Whole suite green**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

Expected: every test passes; no test is skipped except by an explicit marker.

- [ ] **Step 2: Lint**

```bash
cd plugins/flows/base
ruff check create_cachedb_file_plugin/
```

Expected: no findings. (`ruff==0.12.7` is in the dev group; install it into the venv if absent.)

- [ ] **Step 3: Confirm the banned fallback is gone**

```bash
cd plugins/flows/base
grep -rn "CREATE OR REPLACE TABLE" create_cachedb_file_plugin/
```

Expected: **no matches.** Any hit means an unbounded whole-table copy survived.

- [ ] **Step 4: Confirm no implicit target drops remain**

```bash
cd plugins/flows/base
grep -rn "DROP TABLE" create_cachedb_file_plugin/
```

Expected: matches only in `checkpoint.py` (`reset_table`, `drop_status_tables`) and the
`SINGLE_STATEMENT` branch of `copy_table`. No `DROP TABLE` in any exception handler.

- [ ] **Step 5: Postgres end-to-end against synpuf**

Run the cache flow against the synpuf Postgres source and compare per-table row counts with a
pre-change run. Expected: identical counts, and the status tables absent afterwards.

- [ ] **Step 6: BigQuery dry run, then canary**

On the affected dataset, run with `dryRun: true` and confirm the log names the chosen chunk column,
its kind, and a chunk count at or below 2,000 for the >900M table. Then run the real copy and pull
per-chunk cost:

```sql
SELECT job_id, total_bytes_processed
FROM `<project>.region-<region>.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
ORDER BY creation_time DESC
```

Compare against the table's total byte size. If per-chunk bytes ≈ full-table bytes, predicates are
not pruning: raise `chunkSize` for that table (spec §7 mitigation), rerun, and record the outcome
on the issue before closing it.

- [ ] **Step 7: Fresh-copy behaviour in the real flow**

Kill a copy mid-table, rerun with `freshCopy: false` and confirm it resumes; kill again, rerun with
`freshCopy: true` and confirm the incomplete table restarts at chunk 0 while COMPLETE tables are
skipped. Confirm from the Prefect logs that a task retry inside one flow run does **not** re-apply
the reset.

- [ ] **Step 8: Commit the plan alongside the work**

```bash
git add trex/plans/issue-3033-cache-chunking.md
git commit -m "plan: cache chunk planning, resume, and fresh copy"
```

---

## Spec coverage check

| Spec section | Task |
|---|---|
| §4.1 `ChunkConfig` | 1 |
| §4.2 planner/adapter types | 1, 7 |
| §4.3 `freshCopy` semantics + arbitration | 9, 10, 13 |
| §5 planning algorithm (count, boundaries, predicates, plan id) | 2, 3, 4 |
| §6 data flow (per schema, per table) | 12, 13 |
| §7 BigQuery behaviour | 6, 7 |
| §7 PostgreSQL behaviour | 6, 7 |
| §8 error taxonomy, no implicit drops, timeout relocation | 1, 11, 12 |
| §8 idempotency | 11 |
| §8 checkpoint/resume | 8, 12 |
| §9 compatibility and migration | 8, 10 |
| §10 test approach | 0, 2-9, 16 |
| §11 acceptance criteria | 17 |
| §12 non-goals (dead code removal) | 14 |

## Open items carried from the spec

These are Decisions D1-D6 in the spec. The plan implements the chosen value for each; if the team
rules differently, the affected task changes:

- **D1** — no usable chunk column raises `PlannerError` (Task 4, Step 3).
- **D2** — a `PlannerError` aborts the schema copy (Task 12, `except` clause re-raises).
- **D3** — BigQuery target stays 5,000,000 rows (Task 2, `BIGQUERY_TARGET_CHUNK_ROWS`).
- **D4** — reconciliation uses `__TABLES__` unless the table is a view (Task 7,
  `BigQuerySourceAdapter.count_rows`). Switch to `count_rows_exact` if those datasets use streaming
  inserts.
- **D5** — `freshCopy` spares COMPLETE tables (Task 9, `status <> 'COMPLETE'`).
- **D6** — the option is named `freshCopy` on `CreateCacheOptions` (Task 10).
