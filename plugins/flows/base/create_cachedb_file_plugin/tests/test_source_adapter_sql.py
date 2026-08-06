import pytest

from create_cachedb_file_plugin.chunk_utils import plan_chunks
from create_cachedb_file_plugin.errors import PlannerError
from create_cachedb_file_plugin.planner_types import ChunkConfig, ChunkStats
from create_cachedb_file_plugin.source_stats import (
    bq_boundaries_sql, bq_candidates_sql, bq_exact_count_sql, bq_row_count_sql,
    pg_boundaries_sql, pg_candidates_sql, pg_exact_count_sql, pg_row_count_estimate_sql,
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
        "SELECT APPROX_QUANTILES(`measurement_id`, 180) AS bounds FROM `cdm.measurement`"
    )


def test_bq_candidates_expose_partition_and_cluster_metadata():
    sql = bq_candidates_sql("cdm", "measurement")
    assert "`cdm.INFORMATION_SCHEMA.COLUMNS`" in sql
    assert "is_partitioning_column" in sql
    assert "clustering_ordinal_position" in sql
    assert "WHERE table_name = 'measurement'" in sql


def test_bq_exact_count():
    assert bq_exact_count_sql("cdm", "measurement") == "SELECT COUNT(*) FROM `cdm.measurement`"


def test_pg_row_count_is_an_estimate():
    assert pg_row_count_estimate_sql("cdm", "measurement") == (
        "SELECT reltuples::bigint AS row_count FROM pg_class "
        "WHERE oid = to_regclass('\"cdm\".\"measurement\"')"
    )


def test_pg_boundaries_use_percentile_disc():
    assert pg_boundaries_sql("cdm", "measurement", "measurement_id", 4) == (
        "SELECT unnest(percentile_disc(ARRAY[0.000000, 0.250000, 0.500000, "
        "0.750000, 1.000000]) WITHIN GROUP (ORDER BY \"measurement_id\")) "
        "FROM \"cdm\".\"measurement\""
    )


def test_pg_candidates_find_single_column_integer_primary_keys():
    sql = pg_candidates_sql("cdm", "measurement")
    assert "indisprimary" in sql
    assert "array_length(i.indkey, 1) = 1" in sql


def test_pg_exact_count():
    assert pg_exact_count_sql("cdm", "measurement") == 'SELECT COUNT(*) FROM "cdm"."measurement"'


def test_identifiers_with_quotes_are_rejected_not_interpolated():
    with pytest.raises(PlannerError):
        pg_exact_count_sql("cdm", 'measurement"; DROP TABLE x --')


from create_cachedb_file_plugin.planner_types import ColumnKind
from create_cachedb_file_plugin.source_stats import (
    ORDERABLE_BQ_TYPES, ORDERABLE_PG_TYPES, pick_bq_candidate, pick_pg_candidate,
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
    candidate = pick_pg_candidate([("measurement_id", "bigint", False)], mapped_column="measurement_id")
    assert candidate.kind is ColumnKind.PRIMARY_KEY
    assert candidate.name == "measurement_id"


# ---------------------------------------------------------------------------
# allowed_columns: the chunk column has to be one the copy actually writes
# ---------------------------------------------------------------------------
#
# A snapshot table_filter can narrow a table to a subset of its columns. Each
# chunk runs "DELETE FROM <target> WHERE <predicate>" before its INSERT, and
# the target only has the copied columns, so a predicate on a column that was
# filtered out fails every chunk.

PG_PK_ROWS = [("measurement_id", "bigint", False)]


def test_bq_skips_a_partition_column_that_is_not_being_copied():
    """The next-priority in-set candidate is chosen, not nothing."""
    candidate = pick_bq_candidate(
        BQ_ROWS,
        mapped_column="measurement_id",
        allowed_columns={"measurement_id", "person_id", "value_source_value"},
    )
    assert candidate.name == "person_id"
    assert candidate.kind is ColumnKind.CLUSTER


def test_bq_falls_all_the_way_through_to_the_mapped_id_when_filtered():
    candidate = pick_bq_candidate(
        BQ_ROWS,
        mapped_column="measurement_id",
        allowed_columns={"measurement_id", "value_source_value"},
    )
    assert candidate.name == "measurement_id"
    assert candidate.kind is ColumnKind.MAPPED_ID


def test_bq_returns_none_when_the_filter_excludes_every_candidate():
    """plan_chunks then fails the table, which is the point (issue 3033)."""
    assert pick_bq_candidate(
        BQ_ROWS, mapped_column="measurement_id", allowed_columns={"value_source_value"}
    ) is None


def test_an_empty_allowed_set_is_a_restriction_not_an_absent_one():
    """``set()`` admits nothing; only ``None`` means "no restriction"."""
    assert pick_bq_candidate(BQ_ROWS, mapped_column="measurement_id", allowed_columns=set()) is None
    assert pick_pg_candidate(
        PG_PK_ROWS,
        mapped_column="measurement_id",
        mapped_meta=("bigint", False),
        allowed_columns=set(),
    ) is None


def test_bq_allowed_columns_matches_case_insensitively():
    candidate = pick_bq_candidate(
        BQ_ROWS, mapped_column="measurement_id", allowed_columns={"MEASUREMENT_DATE"}
    )
    assert candidate.name == "measurement_date"


def test_pg_skips_a_primary_key_that_is_not_being_copied():
    candidate = pick_pg_candidate(
        PG_PK_ROWS,
        mapped_column="person_id",
        mapped_meta=("bigint", False),
        allowed_columns={"person_id", "measurement_date"},
    )
    assert candidate.name == "person_id"
    assert candidate.kind is ColumnKind.MAPPED_ID


def test_pg_returns_none_when_the_filter_excludes_every_candidate():
    assert pick_pg_candidate(
        PG_PK_ROWS,
        mapped_column="measurement_id",
        mapped_meta=("bigint", False),
        allowed_columns={"value_source_value"},
    ) is None


def test_pg_allowed_columns_matches_case_insensitively():
    candidate = pick_pg_candidate(
        PG_PK_ROWS, mapped_column=None, allowed_columns={"Measurement_Id"}
    )
    assert candidate.name == "measurement_id"


def test_no_allowed_columns_means_no_restriction():
    assert pick_bq_candidate(BQ_ROWS, mapped_column="measurement_id").name == "measurement_date"
    assert pick_pg_candidate(PG_PK_ROWS, mapped_column=None).name == "measurement_id"


def test_a_large_table_with_no_copyable_chunk_column_fails_planning():
    """No fallback to an unbounded copy just because a filter got in the way."""
    config = ChunkConfig(target_chunk_rows=1_000_000)
    column = pick_pg_candidate(
        PG_PK_ROWS,
        mapped_column="measurement_id",
        mapped_meta=("bigint", False),
        allowed_columns={"value_source_value"},
    )
    stats = ChunkStats(
        row_count=900_000_000, row_count_is_exact=True, column=column, boundaries=()
    )
    with pytest.raises(PlannerError, match="no usable chunk column"):
        plan_chunks("postgres", "cdm", "measurement", stats, config)
