"""Adapter behaviour, driven through stubbed statement execution.

The adapters reach their source through exactly two methods, ``_scalar`` and
``_rows``, both of which import ``sqlalchemy`` lazily. Overriding that pair is
what lets the real ``collect`` orchestration -- the part with the decisions in
it -- run in a virtualenv with neither sqlalchemy nor a database.
"""

import logging

import pytest

from create_cachedb_file_plugin.chunk_utils import plan_chunks
from create_cachedb_file_plugin.planner_types import ChunkConfig, ChunkStrategy
from create_cachedb_file_plugin.source_stats import (
    SMALL_TABLE_CONFIRM_FACTOR,
    BigQuerySourceAdapter,
    PostgresSourceAdapter,
)

LOGGER = logging.getLogger(__name__)

SCHEMA = "cdm"
TABLE = "measurement"
CONFIG = ChunkConfig(target_chunk_rows=5_000_000, small_table_threshold=500_000)


class StubPostgresAdapter(PostgresSourceAdapter):
    """A Postgres adapter whose catalogue answers are canned."""

    def __init__(self, estimate, exact, pk_rows=(("measurement_id", "bigint", False),),
                 boundaries=tuple(range(0, 181))):
        super().__init__(read_conn=None)
        self.estimate = estimate
        self.exact = exact
        self.pk_rows = list(pk_rows)
        self.boundaries = list(boundaries)
        self.statements = []

    def _scalar(self, statement):
        self.statements.append(statement)
        if "reltuples" in statement:
            return self.estimate
        if statement.startswith("SELECT COUNT(*)"):
            return self.exact
        raise AssertionError(f"unexpected scalar statement: {statement}")

    def _rows(self, statement):
        self.statements.append(statement)
        if "indisprimary" in statement:
            return self.pk_rows
        if "percentile_disc" in statement:
            return [(value,) for value in self.boundaries]
        if "pg_attribute" in statement:
            return []
        raise AssertionError(f"unexpected row statement: {statement}")

    @property
    def exact_counts_issued(self):
        return [s for s in self.statements if s.startswith("SELECT COUNT(*)")]


class StubBigQueryAdapter(BigQuerySourceAdapter):
    def __init__(self, metadata_count):
        super().__init__(read_conn=None)
        self.metadata_count = metadata_count
        self.statements = []

    def _scalar(self, statement):
        self.statements.append(statement)
        if "__TABLES__" in statement:
            return self.metadata_count
        return 0

    def _rows(self, statement):
        self.statements.append(statement)
        return []


# ---------------------------------------------------------------------------
# A stale reltuples must not route a huge table into an unbounded copy
# ---------------------------------------------------------------------------
#
# reltuples is 0 for a table analysed while empty and then bulk-loaded, and for
# any never-analysed table on PG <= 13. Believing it puts the table below
# small_table_threshold, which makes plan_chunks return SINGLE_STATEMENT and
# copy_table run DROP TABLE + CREATE TABLE AS SELECT * over the whole thing --
# the exact statement issue 3033 exists to eliminate.


def test_a_zero_estimate_on_a_huge_table_is_confirmed_exactly():
    adapter = StubPostgresAdapter(estimate=0, exact=900_000_000)

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.row_count == 900_000_000
    assert stats.row_count_is_exact is True
    assert len(adapter.exact_counts_issued) == 1


def test_the_confirmed_count_is_what_reaches_the_planner():
    """The bug this closes: the plan must be CHUNKED, not SINGLE_STATEMENT."""
    adapter = StubPostgresAdapter(estimate=0, exact=900_000_000)

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)
    plan = plan_chunks("postgres", SCHEMA, TABLE, stats, CONFIG)

    assert plan.strategy is ChunkStrategy.CHUNKED
    assert plan.column_name == "measurement_id"


@pytest.mark.parametrize(
    "estimate",
    [0, 1, 250_000, int(500_000 * SMALL_TABLE_CONFIRM_FACTOR) - 1],
)
def test_every_estimate_inside_the_confirmation_band_is_confirmed(estimate):
    adapter = StubPostgresAdapter(estimate=estimate, exact=900_000_000)

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.row_count == 900_000_000
    assert stats.row_count_is_exact is True


def test_an_estimate_clear_of_the_band_is_trusted_without_a_count():
    """COUNT(*) on a genuinely huge table is the scan we are avoiding."""
    adapter = StubPostgresAdapter(estimate=900_000_000, exact=900_000_000)

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.row_count == 900_000_000
    assert stats.row_count_is_exact is False
    assert adapter.exact_counts_issued == []


def test_a_genuinely_small_table_stays_small_after_confirmation():
    adapter = StubPostgresAdapter(estimate=400_000, exact=401_233)

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)
    plan = plan_chunks("postgres", SCHEMA, TABLE, stats, CONFIG)

    assert stats.row_count == 401_233
    assert stats.row_count_is_exact is True
    assert plan.strategy is ChunkStrategy.SINGLE_STATEMENT


def test_a_never_analysed_table_still_pays_for_the_exact_count():
    """reltuples = -1 on PG >= 14 means "never analysed"."""
    adapter = StubPostgresAdapter(estimate=-1, exact=900_000_000)

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.row_count == 900_000_000
    assert stats.row_count_is_exact is True


def test_bigquery_metadata_counts_are_exact_and_are_not_re_counted():
    """__TABLES__ is free, so it is treated as exact and never confirmed."""
    adapter = StubBigQueryAdapter(metadata_count=1_000)

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.row_count == 1_000
    assert stats.row_count_is_exact is True
    assert not any("COUNT(*)" in s for s in adapter.statements)
