"""Adapter behaviour, driven through stubbed statement execution.

The adapters reach their source through exactly two methods, ``_scalar`` and
``_rows``, both of which import ``sqlalchemy`` lazily. Overriding that pair is
what lets the real ``collect`` orchestration -- the part with the decisions in
it -- run in a virtualenv with neither sqlalchemy nor a database.
"""

import logging

import pytest

from create_cachedb_file_plugin.chunk_utils import plan_chunks
from create_cachedb_file_plugin.errors import PlannerError
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


# ---------------------------------------------------------------------------
# Counting NULLs in the chosen chunk column
# ---------------------------------------------------------------------------


class StubNullCountingAdapter(StubPostgresAdapter):
    def __init__(self, nulls, pk_rows):
        super().__init__(estimate=900_000_000, exact=900_000_000, pk_rows=pk_rows)
        self.nulls = nulls

    def _scalar(self, statement):
        if "IS NULL" in statement:
            self.statements.append(statement)
            return self.nulls
        return super()._scalar(statement)


def test_collect_counts_the_nulls_in_a_nullable_chunk_column():
    adapter = StubNullCountingAdapter(
        nulls=855_000_000, pk_rows=[("measurement_id", "bigint", True)]
    )

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.null_count == 855_000_000
    assert any("IS NULL" in s for s in adapter.statements)


def test_collect_skips_the_null_scan_for_a_not_null_column():
    """A NOT NULL column has no NULL chunk, so the scan buys nothing."""
    adapter = StubNullCountingAdapter(
        nulls=0, pk_rows=[("measurement_id", "bigint", False)]
    )

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.null_count == 0
    assert not any("IS NULL" in s for s in adapter.statements)


def test_a_null_heavy_chunk_column_fails_planning_end_to_end():
    adapter = StubNullCountingAdapter(
        nulls=855_000_000, pk_rows=[("measurement_id", "bigint", True)]
    )
    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    with pytest.raises(PlannerError, match="NULL"):
        plan_chunks("postgres", SCHEMA, TABLE, stats, CONFIG)


def test_a_small_table_never_pays_for_the_null_scan():
    adapter = StubNullCountingAdapter(
        nulls=0, pk_rows=[("measurement_id", "bigint", True)]
    )
    adapter.estimate = 1_000
    adapter.exact = 1_000

    stats = adapter.collect(SCHEMA, TABLE, CONFIG, LOGGER)

    assert stats.null_count is None, "nothing was measured, and nothing needed to be"
    assert not any("IS NULL" in s for s in adapter.statements)


# ---------------------------------------------------------------------------
# plan_table: another chunk column when the first is rejected or skewed
# ---------------------------------------------------------------------------
#
# Issue 3576: one bad column choice failed the whole cache build, although the
# table had a perfectly good column to chunk on. These drive plan_table through
# the real collect/plan_chunks path with canned catalogue answers.

import re

from create_cachedb_file_plugin.source_stats import plan_table

RESULTS_TABLE = "achilles_results"
RESULTS_ROWS = 900_000_000
RESULTS_CONFIG = ChunkConfig(target_chunk_rows=5_000_000, small_table_threshold=500_000)

#: pg_stats rows: (name, type, nullable, n_distinct, null_frac, top_freq).
RESULTS_STATS = [
    ("analysis_id", "integer", False, 300, 0.0, 0.4),
    ("stratum_1", "character varying", True, -0.5, 0.05, 0.001),
    ("count_value", "bigint", False, -0.2, 0.0, 0.02),
]


def _skewed_cuts(n=181, repeated=100):
    """Quantile cuts where one value fills ``repeated`` of them."""
    return list(range(n - repeated)) + [n] * repeated


class StubColumnAwareAdapter(PostgresSourceAdapter):
    """Postgres stub whose quantile cuts depend on the column asked for."""

    def __init__(self, cuts_by_column, stats_rows=(), row_count=RESULTS_ROWS):
        super().__init__(read_conn=None)
        self.cuts_by_column = cuts_by_column
        self.stats_rows = list(stats_rows)
        self.row_count = row_count
        self.boundary_columns = []

    def _scalar(self, statement):
        if "reltuples" in statement:
            return self.row_count
        if "IS NULL" in statement:
            return 0
        raise AssertionError(f"unexpected scalar statement: {statement}")

    def _rows(self, statement):
        if "indisprimary" in statement:
            return []  # results tables have no primary key
        if "pg_stats" in statement:
            return self.stats_rows
        if "percentile_disc" in statement:
            column = re.search(r'ORDER BY "([^"]+)"', statement).group(1)
            self.boundary_columns.append(column)
            return [(value,) for value in self.cuts_by_column[column]]
        if "pg_attribute" in statement:
            return [("integer", False)]  # the mapped column's metadata
        raise AssertionError(f"unexpected row statement: {statement}")


def test_a_rejected_mapped_column_falls_back_to_a_statistics_column():
    adapter = StubColumnAwareAdapter(
        {"analysis_id": [1] * 90 + [2] * 91, "count_value": list(range(181))},
        RESULTS_STATS,
    )

    stats, plan = plan_table(
        adapter, "postgres", SCHEMA, RESULTS_TABLE, RESULTS_CONFIG, LOGGER
    )

    assert adapter.boundary_columns == ["analysis_id", "count_value"]
    assert plan.strategy is ChunkStrategy.CHUNKED
    assert plan.column_name == "count_value"
    assert stats.column.kind.value == "STATISTICS"


def test_a_skewed_plan_is_replaced_when_another_column_plans_evenly():
    adapter = StubColumnAwareAdapter(
        {"analysis_id": _skewed_cuts(), "count_value": list(range(181))},
        RESULTS_STATS,
    )

    _, plan = plan_table(adapter, "postgres", SCHEMA, RESULTS_TABLE, RESULTS_CONFIG, LOGGER)

    assert plan.column_name == "count_value"
    assert not plan.is_skewed


def test_a_skewed_plan_is_kept_when_nothing_better_exists():
    """Never worse than before: the plan today's copy would run still runs."""
    adapter = StubColumnAwareAdapter({"analysis_id": _skewed_cuts()}, stats_rows=())

    _, plan = plan_table(adapter, "postgres", SCHEMA, RESULTS_TABLE, RESULTS_CONFIG, LOGGER)

    assert plan.column_name == "analysis_id"
    assert plan.is_skewed


def test_with_no_alternative_the_first_rejection_is_what_is_raised():
    adapter = StubColumnAwareAdapter({"analysis_id": [1] * 90 + [2] * 91}, stats_rows=())

    with pytest.raises(PlannerError, match="analysis_id"):
        plan_table(adapter, "postgres", SCHEMA, RESULTS_TABLE, RESULTS_CONFIG, LOGGER)


def test_plan_table_stops_after_the_attempt_limit():
    """Each attempt is a boundary query on the source, so the retries are capped."""
    low = [1] * 90 + [2] * 91
    adapter = StubColumnAwareAdapter(
        {"analysis_id": low, "count_value": low, "stratum_1": low},
        RESULTS_STATS,
    )

    with pytest.raises(PlannerError):
        plan_table(
            adapter, "postgres", SCHEMA, RESULTS_TABLE, RESULTS_CONFIG, LOGGER, max_attempts=2
        )

    assert len(adapter.boundary_columns) == 2


def test_a_table_that_plans_first_time_costs_one_boundary_query():
    adapter = StubColumnAwareAdapter({"analysis_id": list(range(181))}, RESULTS_STATS)

    _, plan = plan_table(adapter, "postgres", SCHEMA, RESULTS_TABLE, RESULTS_CONFIG, LOGGER)

    assert plan.column_name == "analysis_id"
    assert adapter.boundary_columns == ["analysis_id"]


# ---------------------------------------------------------------------------
# plan_postgres_table: page ranges for large Postgres tables, before collect()
# ---------------------------------------------------------------------------
#
# A page-range table must never pay for the column pick, the NULL count or the
# percentile_disc sort.

from create_cachedb_file_plugin.chunk_utils import compute_page_plan_id
from create_cachedb_file_plugin.source_stats import plan_postgres_table

COLUMNS_KEY = "measurement_id,person_id"
FILTERS_KEY = "no-filters"
#: (relkind, relhassubclass, amname, relfilenode, blocks)
HEAP_FACTS = ("r", False, "heap", 16384, 1_000_000)


class StubPageAdapter(StubPostgresAdapter):
    """StubPostgresAdapter that also answers the page-range catalogue queries,
    and records which planning steps were reached."""

    def __init__(self, estimate, exact, facts=HEAP_FACTS, version=160000, **kwargs):
        super().__init__(estimate, exact, **kwargs)
        self.facts = facts
        self.version = version
        self.calls = []

    def _scalar(self, statement):
        if "server_version_num" in statement:
            self.statements.append(statement)
            return self.version
        return super()._scalar(statement)

    def _rows(self, statement):
        if "pg_relation_size" in statement:
            self.statements.append(statement)
            return [] if self.facts is None else [self.facts]
        return super()._rows(statement)

    def page_facts(self, schema, table):
        self.calls.append("page_facts")
        return super().page_facts(schema, table)

    def collect(self, *args, **kwargs):
        self.calls.append("collect")
        return super().collect(*args, **kwargs)

    def pick_chunk_column(self, *args, **kwargs):
        self.calls.append("pick_chunk_column")
        return super().pick_chunk_column(*args, **kwargs)

    def column_boundaries(self, *args, **kwargs):
        self.calls.append("column_boundaries")
        return super().column_boundaries(*args, **kwargs)

    def count_nulls(self, *args, **kwargs):
        self.calls.append("count_nulls")
        return super().count_nulls(*args, **kwargs)


class PlanKeys:
    """The plan_keys callable. It counts its calls: on a '*' table it reads
    the source catalog."""

    def __init__(self):
        self.calls = 0

    def __call__(self):
        self.calls += 1
        return COLUMNS_KEY, FILTERS_KEY


def _plan_pg(adapter, chunk_count=None, plan_keys=None):
    return plan_postgres_table(
        adapter, "postgres", SCHEMA, TABLE, CONFIG, LOGGER,
        plan_keys if plan_keys is not None else PlanKeys(), chunk_count,
    )


def test_a_small_postgres_table_plans_exactly_as_plan_table_does():
    """Same SINGLE_STATEMENT plan_id, so existing small-table checkpoints still match."""
    adapter = StubPageAdapter(estimate=1_000, exact=1_000)
    reference = StubPageAdapter(estimate=1_000, exact=1_000)

    stats, plan = _plan_pg(adapter)
    ref_stats, ref_plan = plan_table(reference, "postgres", SCHEMA, TABLE, CONFIG, LOGGER)

    assert plan.strategy is ChunkStrategy.SINGLE_STATEMENT
    assert plan == ref_plan
    assert stats == ref_stats
    assert adapter.calls == []
    assert not any("server_version_num" in s for s in adapter.statements)


def test_a_large_eligible_table_gets_page_ranges_without_collect():
    adapter = StubPageAdapter(estimate=900_000_000, exact=900_000_000)

    stats, plan = _plan_pg(adapter)

    assert plan.strategy is ChunkStrategy.PAGE_RANGE
    assert len(plan.predicates) == 180
    assert plan.page_bounds[0][0] == 0
    assert plan.page_bounds[-1][1] is None
    assert plan.plan_id == compute_page_plan_id(
        "postgres", SCHEMA, TABLE, 16384, 1_000_000, 180, COLUMNS_KEY, FILTERS_KEY
    )
    assert stats.row_count == 900_000_000
    assert stats.column is None
    assert adapter.calls == ["page_facts"]
    for expensive in ("percentile_disc", "IS NULL", "indisprimary", "pg_stats"):
        assert not any(expensive in s for s in adapter.statements), expensive
    assert adapter.exact_counts_issued == []


@pytest.mark.parametrize(
    "facts, version, reason",
    [
        (HEAP_FACTS, 130000, "pg_version"),
        (None, 160000, "not_found"),
        (("p", False, None, 0, 0), 160000, "partitioned"),
        (("v", False, None, 0, 0), 160000, "view"),
        (("m", False, "heap", 16384, 10), 160000, "view"),
        (("f", False, None, 0, 0), 160000, "not_table"),
        (("r", True, "heap", 16384, 1_000_000), 160000, "inherited"),
        (("r", False, "columnar", 16384, 1_000_000), 160000, "not_heap"),
        (("r", False, "heap", 16384, 0), 160000, "no_blocks"),
    ],
)
def test_an_ineligible_table_falls_back_and_says_why(facts, version, reason, caplog):
    adapter = StubPageAdapter(estimate=900_000_000, exact=900_000_000, facts=facts, version=version)

    plan_keys = PlanKeys()
    with caplog.at_level(logging.INFO, logger=LOGGER.name):
        planned = _plan_pg(adapter, plan_keys=plan_keys)

    assert planned is None
    assert plan_keys.calls == 0
    assert "collect" not in adapter.calls
    stage_lines = [
        r.getMessage() for r in caplog.records if r.getMessage().startswith("stage=plan_attempt")
    ]
    assert len(stage_lines) == 1
    assert "outcome=fallback" in stage_lines[0]
    assert f"status=fallback reason={reason}" in stage_lines[0]


def test_a_near_threshold_estimate_is_confirmed_exactly_once():
    adapter = StubPageAdapter(estimate=550_000, exact=900_000_000)

    stats, plan = _plan_pg(adapter)

    assert len(adapter.exact_counts_issued) == 1
    assert stats.row_count == 900_000_000
    assert stats.row_count_is_exact is True
    assert plan.strategy is ChunkStrategy.PAGE_RANGE
