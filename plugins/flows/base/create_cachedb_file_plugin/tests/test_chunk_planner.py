from create_cachedb_file_plugin.errors import (
    CacheCopyError, ChunkCopyError, FreshCopyResetError, PlannerError, ReconciliationError,
)
from create_cachedb_file_plugin.planner_types import (
    ChunkColumnCandidate, ChunkConfig, ChunkStrategy, ColumnKind,
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


import pytest

from create_cachedb_file_plugin.chunk_utils import resolve_chunk_count, resolve_target_chunk_rows


def test_chunk_count_follows_row_count_not_span():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    assert resolve_chunk_count(900_000_000, config) == 180


def test_chunk_count_is_capped_for_hash_distributed_keys():
    """Regression for issue 3033."""
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
    assert build_predicates(_column(), [7, 7, 7, 7]) == ('"measurement_id" IS NOT NULL',)


def test_two_distinct_values_collapse_to_a_single_chunk():
    assert build_predicates(_column(), [1, 9]) == ('"measurement_id" IS NOT NULL',)


def test_date_boundaries_are_supported():
    predicates = build_predicates(
        _column(name="measurement_date", data_type="DATE"),
        [date(2019, 1, 1), date(2020, 1, 1), date(2021, 1, 1)],
    )
    assert predicates == (
        "\"measurement_date\" < '2020-01-01'",
        "\"measurement_date\" >= '2020-01-01'",
    )


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
    stats = ChunkStats(row_count=900_000_000, row_count_is_exact=True, column=None, boundaries=())
    with pytest.raises(PlannerError, match="no usable chunk column"):
        plan_chunks("bigquery", "cdm", "measurement", stats, config)


def test_large_table_is_chunked():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    boundaries = tuple(range(0, 181))
    plan = plan_chunks("bigquery", "cdm", "measurement", _stats(900_000_000, boundaries), config)
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


DEGENERATE_BOUNDARIES = [(), (5,), (1, 9), (7, 7, 7), (None, None)]


@pytest.mark.parametrize("boundaries", DEGENERATE_BOUNDARIES)
def test_large_table_with_degenerate_boundaries_raises(boundaries):
    """A single interval predicate on a huge table is the unbounded copy again."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    with pytest.raises(PlannerError) as excinfo:
        plan_chunks("bigquery", "cdm", "measurement", _stats(900_000_000, boundaries), config)
    message = str(excinfo.value)
    assert "cdm.measurement" in message
    assert "900,000,000" in message
    assert "measurement_id" in message
    assert "low-cardinality" in message


@pytest.mark.parametrize("boundaries", DEGENERATE_BOUNDARIES)
def test_degenerate_boundaries_raise_for_nullable_columns_too(boundaries):
    """The NULL chunk does not make a one-interval plan any less unbounded."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    with pytest.raises(PlannerError):
        plan_chunks(
            "bigquery",
            "cdm",
            "measurement",
            _stats(900_000_000, boundaries, nullable=True),
            config,
        )


def test_degenerate_boundary_error_reports_the_distinct_count():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    with pytest.raises(PlannerError, match="1 distinct"):
        plan_chunks("bigquery", "cdm", "measurement", _stats(900_000_000, (7, 7, 7)), config)
    with pytest.raises(PlannerError, match="0 distinct"):
        plan_chunks("bigquery", "cdm", "measurement", _stats(900_000_000, (None, None)), config)


@pytest.mark.parametrize("boundaries", DEGENERATE_BOUNDARIES)
def test_small_table_with_degenerate_boundaries_still_single_statements(boundaries):
    """Below the threshold an unbounded copy is fine, so nothing may raise."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    plan = plan_chunks("bigquery", "cdm", "person", _stats(499_999, boundaries), config)
    assert plan.strategy is ChunkStrategy.SINGLE_STATEMENT
    assert plan.predicates == ()
