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
