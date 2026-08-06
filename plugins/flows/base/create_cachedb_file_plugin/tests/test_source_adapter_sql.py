import pytest

from create_cachedb_file_plugin.errors import PlannerError
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
