"""Unit tests for the pure chunk planner."""

import ast
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import pytest

from create_cachedb_file_plugin.chunk_utils import (
    MAX_CHUNK_SIZE_MULTIPLE,
    MAX_NULL_CHUNK_MULTIPLE,
    _thin_boundaries,
    build_predicates,
    compute_plan_id,
    describe_dry_run_summary,
    describe_plan,
    find_column_case_insensitive,
    normalise_boundaries,
    plan_chunks,
    quote_identifier,
    resolve_chunk_count,
    resolve_target_chunk_rows,
    sql_literal,
)
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
    ChunkStats,
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
    """Identical inputs hash the same; a different plan hashes differently."""
    predicates = ('"measurement_id" < 10', '"measurement_id" >= 10')
    other = ('"measurement_id" < 11', '"measurement_id" >= 11')
    args = ("bigquery", "cdm", "measurement", "measurement_id")
    a = compute_plan_id(*args, ChunkStrategy.CHUNKED, predicates)
    b = compute_plan_id(*args, ChunkStrategy.CHUNKED, predicates)
    c = compute_plan_id(*args, ChunkStrategy.CHUNKED, other)
    assert a == b
    assert a != c


def test_plan_id_changes_with_the_strategy():
    a = compute_plan_id("bigquery", "cdm", "person", None, ChunkStrategy.SINGLE_STATEMENT, ())
    b = compute_plan_id("bigquery", "cdm", "person", None, ChunkStrategy.CHUNKED, ())
    assert a != b


def test_plan_id_changes_when_the_null_chunk_appears():
    """The resume key must not collide across different predicate sets."""
    config = ChunkConfig(target_chunk_rows=5_000_000, max_chunks=10)
    boundaries = tuple(range(0, 12))
    not_null = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, boundaries), config
    )
    nullable = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, boundaries, nullable=True), config
    )
    assert len(nullable.predicates) == len(not_null.predicates) + 1
    assert nullable.plan_id != not_null.plan_id


def test_plan_id_ignores_boundaries_that_do_not_reach_the_predicates():
    """Appending rows past the table max must not invalidate the checkpoints.

    15M rows, not 900M: four boundaries make three chunks, and three chunks of
    a 900M-row table are each 60x the target, which MAX_CHUNK_SIZE_MULTIPLE now
    rejects. The row count is incidental to what this test is about.
    """
    config = ChunkConfig(target_chunk_rows=5_000_000)
    first = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(15_000_000, (0, 10, 20, 30)), config
    )
    grown = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(15_000_000, (-100, 10, 20, 9_999)), config
    )
    assert first.predicates == grown.predicates
    assert first.plan_id == grown.plan_id


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


def _cut_values(predicates):
    """The integer boundary values a plan's interval predicates actually cut on."""
    cuts = []
    for predicate in predicates:
        for token in predicate.replace("AND", " ").split():
            if token.lstrip("-").isdigit() and int(token) not in cuts:
                cuts.append(int(token))
    return sorted(cuts)


def _gaps(values):
    return [b - a for a, b in zip(values, values[1:])]


def test_thin_boundaries_keeps_the_outer_values_and_spreads_the_rest():
    values = list(range(20_000))
    thinned = _thin_boundaries(values, 11)
    assert len(thinned) == 11
    assert thinned[0] == values[0]
    assert thinned[-1] == values[-1]
    # values == indices here, so the gaps are the retained-index gaps.
    assert max(_gaps(thinned)) - min(_gaps(thinned)) <= 1


def test_thin_boundaries_leaves_short_input_alone():
    assert _thin_boundaries([1, 2, 3], 11) == [1, 2, 3]
    assert _thin_boundaries([], 11) == []


def test_thin_boundaries_never_returns_more_than_asked_for():
    """max_values < 2 asked for fewer boundaries, not for the whole list back."""
    values = list(range(20_000))
    assert _thin_boundaries(values, 1) == [0, 19_999]
    assert _thin_boundaries(values, 0) == [0, 19_999]


def test_thin_boundaries_deduplicates_repeated_picks():
    assert _thin_boundaries([1, 1, 1, 1, 1, 1], 4) == [1]


def _thinning_plan(nullable=False):
    config = ChunkConfig(target_chunk_rows=5_000_000, max_chunks=10)
    boundaries = tuple(range(20_000))
    return plan_chunks(
        "bigquery",
        "cdm",
        "measurement",
        _stats(900_000_000, boundaries, nullable=nullable),
        config,
    )


def test_thinning_makes_max_chunks_bind():
    """chunk_count+1 boundaries survive, so 20,000 quantiles become 10 chunks."""
    assert len(_thinning_plan().predicates) == 10
    # The NULL chunk is the eleventh, and is the only thing allowed above the cap.
    assert len(_thinning_plan(nullable=True).predicates) == 11


def test_thinning_retains_cuts_from_across_the_whole_range():
    """Head-truncating to values[:max_values] would cut only on 1..9."""
    cuts = _cut_values(_thinning_plan().predicates)
    assert len(cuts) == 9
    assert cuts[0] <= 0.2 * 19_999
    assert cuts[-1] >= 0.8 * 19_999


def test_thinning_spaces_the_retained_cuts_evenly():
    cuts = _cut_values(_thinning_plan().predicates)
    gaps = _gaps(cuts)
    assert max(gaps) - min(gaps) <= 1


@pytest.mark.parametrize(
    "kwargs",
    [
        {"target_chunk_rows": 0},
        {"target_chunk_rows": -1},
        {"target_chunk_rows": 1_000, "max_chunks": 0},
        {"target_chunk_rows": 1_000, "max_chunks": -5},
        {"target_chunk_rows": 1_000, "min_chunk_rows": 0},
        {"target_chunk_rows": 1_000, "min_chunk_rows": -5},
        {"target_chunk_rows": 1_000, "small_table_threshold": 0},
        {"target_chunk_rows": 1_000, "small_table_threshold": -5},
    ],
)
def test_chunk_config_rejects_non_positive_bounds(kwargs):
    """chunkSize: 0 used to reach resolve_chunk_count and raise ZeroDivisionError."""
    with pytest.raises(PlannerError):
        ChunkConfig(**kwargs)


@pytest.mark.parametrize("bad", [1.5, "1000", True, None])
def test_chunk_config_rejects_non_integer_bounds(bad):
    with pytest.raises(PlannerError):
        ChunkConfig(target_chunk_rows=bad)


def test_chunk_config_accepts_positive_bounds():
    config = ChunkConfig(
        target_chunk_rows=1, max_chunks=1, min_chunk_rows=1, small_table_threshold=1
    )
    assert config.target_chunk_rows == 1


@pytest.mark.parametrize("override", [0, -1])
def test_target_chunk_rows_rejects_non_positive_override(override):
    """chunkSize: -1 used to silently yield one unbounded chunk."""
    with pytest.raises(PlannerError):
        resolve_target_chunk_rows("bigquery", override)


def test_normalise_boundaries_sorts_dedupes_and_drops_nulls():
    assert normalise_boundaries([3, None, 1, 3, 2]) == [1, 2, 3]
    assert normalise_boundaries([]) == []


@pytest.mark.parametrize(
    "raw",
    [
        [1, "two"],
        [date(2020, 1, 1), datetime(2020, 1, 1)],
        [[1], [2]],
    ],
)
def test_normalise_boundaries_keeps_type_errors_inside_the_taxonomy(raw):
    """The orchestration layer catches CacheCopyError; a bare TypeError escapes it."""
    with pytest.raises(PlannerError) as excinfo:
        normalise_boundaries(raw)
    assert isinstance(excinfo.value, CacheCopyError)


def test_build_predicates_reports_mixed_boundary_types_as_planner_errors():
    with pytest.raises(PlannerError):
        build_predicates(_column(), [1, "two", 3])


def test_quote_identifier_escapes_embedded_quotes():
    assert quote_identifier("measurement_id") == '"measurement_id"'
    assert quote_identifier('we"ird') == '"we""ird"'


def test_decimal_boundaries_render_in_plain_notation():
    """1E+3 would be typed DOUBLE by DuckDB -- the lossy float case we reject."""
    assert sql_literal(Decimal("1E+3")) == "1000"
    assert sql_literal(Decimal("1.50")) == "1.50"
    assert sql_literal(Decimal("-2E-3")) == "-0.002"
    assert "E" not in sql_literal(Decimal("1E+30"))


@pytest.mark.parametrize("value", ["NaN", "-NaN", "Infinity", "-Infinity"])
def test_non_finite_decimal_boundaries_are_rejected(value):
    """DuckDB parses a bare NaN/Infinity as a column reference, not a number."""
    with pytest.raises(PlannerError):
        sql_literal(Decimal(value))


def test_planner_modules_do_not_drag_in_prefect():
    """tests/README.md calls this import discipline load-bearing; enforce it."""
    import create_cachedb_file_plugin.checkpoint  # noqa: F401
    import create_cachedb_file_plugin.chunk_utils  # noqa: F401
    import create_cachedb_file_plugin.errors  # noqa: F401
    import create_cachedb_file_plugin.planner_types  # noqa: F401

    assert "prefect" not in sys.modules


def test_describe_plan_reports_a_single_statement():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    plan = plan_chunks("bigquery", "cdm", "person", _stats(499_999), config)
    assert describe_plan(plan, "cdm", "person") == (
        "cdm.person: single statement (below small-table threshold)"
    )


def test_describe_plan_reports_the_chunked_shape():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    plan = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, range(181), nullable=True), config
    )
    line = describe_plan(plan, "cdm", "measurement")
    assert line.startswith("cdm.measurement: 181 chunks on measurement_id (MAPPED_ID)")
    assert "~5,000,000 rows/chunk" in line
    assert "null_chunk=True" in line
    assert f"plan_id={plan.plan_id[:12]}" in line


def test_estimated_rows_per_chunk_excludes_the_null_chunk():
    """The NULL chunk is not a slice of the value range, so it is not a divisor."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    boundaries = tuple(range(181))
    not_null = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, boundaries), config
    )
    nullable = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, boundaries, nullable=True), config
    )
    assert not_null.estimated_rows_per_chunk == 5_000_000
    assert nullable.estimated_rows_per_chunk == not_null.estimated_rows_per_chunk


@pytest.mark.parametrize(
    "target,expected",
    [
        ("PERSON_ID", "person_id"),
        ("person_id", "person_id"),
        ("Measurement_Date", "measurement_date"),
        ("missing", None),
        ("", None),
    ],
)
def test_find_column_case_insensitive(target, expected):
    columns = ["person_id", "measurement_date", "value_as_number"]
    assert find_column_case_insensitive(columns, target) == expected


def test_find_column_case_insensitive_returns_the_source_spelling():
    assert find_column_case_insensitive(["PersonId"], "personid") == "PersonId"


# ---------------------------------------------------------------------------
# copy.create_select_query, read as source text
# ---------------------------------------------------------------------------

COPY_SOURCE_PATH = Path(__file__).resolve().parent.parent / "copy.py"


def _function_source(path: Path, name: str) -> str:
    """The source text of one top-level function in ``path``.

    Read rather than imported on purpose: ``copy.py`` imports prefect, which
    this suite's virtualenv does not have. ``ast`` scopes the assertion to the
    one function instead of grepping the whole file, so an unrelated ``OFFSET``
    elsewhere in the module cannot make the test pass or fail by accident.
    """
    source = path.read_text()
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return ast.get_source_segment(source, node)
    raise AssertionError(f"{path.name} has no top-level function named {name!r}")


def test_create_select_query_has_no_limit_offset_branch():
    """The LIMIT/OFFSET chunk branch is gone and must not come back.

    It was unreachable -- every caller passes a predicate string or None -- and
    it paged with no ORDER BY, so successive pages could overlap or skip rows
    depending on the source's scan order.
    """
    body = _function_source(COPY_SOURCE_PATH, "create_select_query")
    assert "OFFSET" not in body
    assert "isinstance(where_sql, tuple)" not in body


# ---------------------------------------------------------------------------
# The NULL chunk is unbounded, so an oversized one has to be rejected
# ---------------------------------------------------------------------------
#
# build_predicates appends exactly one '"col" IS NULL' predicate and nothing
# ever sizes or splits it -- it cannot be split, since every row in it has the
# same key. A 95%-NULL chunk column therefore puts ~19x the target rows into
# one INSERT. That bites hardest on BigQuery, where INFORMATION_SCHEMA reports
# almost every column is_nullable = 'YES', so a NULL-heavy partition or cluster
# column produces one chunk holding most of a multi-hundred-million-row table:
# straight through the 1h cache_chunk_timeout, and a plausible OOM.


def _nullable_stats(row_count, boundaries, null_count):
    return ChunkStats(
        row_count=row_count,
        row_count_is_exact=True,
        column=_column(nullable=True),
        boundaries=tuple(boundaries),
        null_count=null_count,
    )


def test_an_oversized_null_chunk_is_rejected():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    stats = _nullable_stats(900_000_000, range(181), null_count=855_000_000)
    with pytest.raises(PlannerError) as excinfo:
        plan_chunks("bigquery", "cdm", "measurement", stats, config)

    message = str(excinfo.value)
    assert "measurement_id" in message, "the message must name the column"
    assert "855,000,000" in message, "and how many NULLs are in it"
    assert "chunk column" in message.lower(), "and suggest picking a different one"


def test_the_null_chunk_limit_is_a_multiple_of_the_target():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    limit = MAX_NULL_CHUNK_MULTIPLE * config.target_chunk_rows

    at_the_limit = _nullable_stats(900_000_000, range(181), null_count=limit)
    plan = plan_chunks("bigquery", "cdm", "measurement", at_the_limit, config)
    assert plan.includes_null_chunk is True

    over_the_limit = _nullable_stats(900_000_000, range(181), null_count=limit + 1)
    with pytest.raises(PlannerError):
        plan_chunks("bigquery", "cdm", "measurement", over_the_limit, config)


def test_nulls_on_a_non_nullable_column_cannot_fail_the_plan():
    """There is no NULL chunk to be oversized when the column is NOT NULL."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    stats = ChunkStats(
        row_count=900_000_000,
        row_count_is_exact=True,
        column=_column(nullable=False),
        boundaries=tuple(range(181)),
        null_count=855_000_000,
    )
    plan = plan_chunks("bigquery", "cdm", "measurement", stats, config)
    assert plan.includes_null_chunk is False


def test_an_unmeasured_null_count_does_not_fail_the_plan():
    """null_count is None when nothing counted; that is not evidence of a problem."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    stats = _nullable_stats(900_000_000, range(181), null_count=None)
    assert plan_chunks("bigquery", "cdm", "measurement", stats, config).includes_null_chunk


def test_a_small_table_is_never_failed_by_its_null_count():
    """Below the threshold there are no chunks at all, so there is no NULL chunk."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    stats = _nullable_stats(499_999, (), null_count=499_999)
    plan = plan_chunks("bigquery", "cdm", "person", stats, config)
    assert plan.strategy is ChunkStrategy.SINGLE_STATEMENT


# ---------------------------------------------------------------------------
# A plan with two or three enormous chunks is not a chunked plan
# ---------------------------------------------------------------------------
#
# The interval_count < 2 guard only catches a plan that collapsed all the way
# to one predicate. Three distinct values give two chunks, one of them holding
# most of the table, and that passed every guard and was logged as CHUNKED.
# CHUNK_COLUMN_MAP has real examples -- fact_relationship -> domain_concept_id_1
# (2-4 distinct values), drug_strength -> drug_concept_id -- and on BigQuery
# pick_bq_candidate actively *prefers* the partition column, so a table
# partitioned on a handful of dates has exactly this shape.


def test_a_three_valued_chunk_column_is_rejected():
    """fact_relationship.domain_concept_id_1: 3 distinct values, 2 chunks."""
    config = ChunkConfig(target_chunk_rows=5_000_000)
    stats = _stats(900_000_000, (10, 20, 30))
    with pytest.raises(PlannerError) as excinfo:
        plan_chunks("bigquery", "cdm", "fact_relationship", stats, config)

    message = str(excinfo.value)
    assert "measurement_id" in message, "the message must name the column"
    assert "3 distinct" in message, "and the distinct boundary count"
    assert "450,000,000" in message, "and the per-chunk estimate"
    assert "5,000,000" in message, "and the target it is measured against"


def test_a_handful_of_partition_dates_is_rejected():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    stats = _stats(900_000_000, (1, 2, 3, 4))
    with pytest.raises(PlannerError, match="4 distinct"):
        plan_chunks("bigquery", "cdm", "measurement", stats, config)


def test_the_size_limit_is_a_multiple_of_what_the_planner_asked_for():
    config = ChunkConfig(target_chunk_rows=5_000_000, min_chunk_rows=1)
    # Four boundaries -> three intervals, so row_count / 3 is the chunk size.
    at_the_limit = _stats(3 * MAX_CHUNK_SIZE_MULTIPLE * 5_000_000, (1, 2, 3, 4))
    assert len(plan_chunks("bigquery", "cdm", "t", at_the_limit, config).predicates) == 3

    over_the_limit = _stats(3 * MAX_CHUNK_SIZE_MULTIPLE * 5_000_000 + 3, (1, 2, 3, 4))
    with pytest.raises(PlannerError):
        plan_chunks("bigquery", "cdm", "t", over_the_limit, config)


def test_a_well_spread_chunk_column_is_unaffected():
    config = ChunkConfig(target_chunk_rows=5_000_000)
    plan = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, range(181)), config
    )
    assert plan.estimated_rows_per_chunk == 5_000_000


def test_chunks_forced_large_by_the_max_chunks_cap_are_not_rejected():
    """The cap deliberately trades chunk size for a bounded predicate list.

    Failing here would leave the operator no recourse: raising chunkSize makes
    the chunks bigger, not smaller, and max_chunks is not a flow option. So the
    limit is measured against what the planner asked for after its own caps,
    not against target_chunk_rows alone.
    """
    config = ChunkConfig(target_chunk_rows=5_000_000, max_chunks=10)
    plan = plan_chunks(
        "bigquery", "cdm", "measurement", _stats(900_000_000, range(20_000)), config
    )
    assert len(plan.predicates) == 10
    assert plan.estimated_rows_per_chunk == 90_000_000


def test_a_single_interval_plan_still_gets_the_low_cardinality_message():
    """The two guards overlap; the more specific one has to win.

    interval_count < 2 is not redundant either way round: a 600k-row table with
    one interval and a 5M-row target is well inside the size limit, so only the
    degenerate-plan guard catches it.
    """
    config = ChunkConfig(target_chunk_rows=5_000_000, small_table_threshold=500_000)
    with pytest.raises(PlannerError, match="low-cardinality"):
        plan_chunks("bigquery", "cdm", "measurement", _stats(900_000_000, (1, 9)), config)
    with pytest.raises(PlannerError, match="low-cardinality"):
        plan_chunks("bigquery", "cdm", "measurement", _stats(600_000, (1, 9)), config)


# ---------------------------------------------------------------------------
# The dry-run summary line
# ---------------------------------------------------------------------------


def test_dry_run_summary_reports_both_totals():
    line = describe_dry_run_summary("cdm", planned=12, unplannable=["fact_relationship"])
    assert "cdm" in line
    assert "12" in line
    assert "1" in line
    assert "fact_relationship" in line


def test_dry_run_summary_says_so_when_everything_planned():
    line = describe_dry_run_summary("cdm", planned=13, unplannable=[])
    assert "13" in line
    assert "0" in line


def test_dry_run_summary_lists_every_failure_not_just_the_first():
    """The whole point of not aborting on the first PlannerError."""
    line = describe_dry_run_summary("cdm", planned=1, unplannable=["a", "b", "c"])
    for table in ("a", "b", "c"):
        assert table in line
