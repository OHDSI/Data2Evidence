"""Control-flow assertions about ``copy.py``.

See ``copy_source.py`` for why these are parsed rather than executed.
"""

import ast

from .copy_source import (
    COPY_SOURCE_PATH,
    calls_to,
    dry_run_guarded_branch,
    function_node,
    handled_exception_names,
    handlers_for,
    string_constants,
)


# ---------------------------------------------------------------------------
# dryRun must not create indexes
# ---------------------------------------------------------------------------
#
# copy_table returns before creating the target under dryRun, so copy_indexes
# would run "CREATE UNIQUE INDEX ... ON <target> (...)" against a table that
# does not exist. On Postgres get_indexes_for_pk always reports a real primary
# key, so the first table raises a CatalogException, burns the task's three
# retries and kills the flow -- dryRun was unusable there.


def test_copy_indexes_is_skipped_under_dry_run():
    func = function_node(COPY_SOURCE_PATH, "create_schema_tables")
    assert calls_to(func, "copy_indexes"), "copy_indexes must still run for a real copy"
    assert dry_run_guarded_branch(func, "copy_indexes") is not None, (
        "copy_indexes must be guarded by 'if not copy_params.dry_run'; unguarded it "
        "indexes a target that a dry run never created"
    )


def test_skipping_index_creation_is_logged():
    func = function_node(COPY_SOURCE_PATH, "create_schema_tables")
    skipped_branch = dry_run_guarded_branch(func, "copy_indexes")
    message = string_constants(skipped_branch).lower()
    assert "dry run" in message
    assert "index" in message


# ---------------------------------------------------------------------------
# A reconciliation mismatch must clear the resume point; a chunk failure must not
# ---------------------------------------------------------------------------
#
# On ReconciliationError chunks_completed already equals chunks_total, so
# keeping the resume point makes the next run copy zero chunks and reconcile to
# the same mismatch forever. On ChunkCopyError the resume point is the entire
# point of the branch -- it is what stops a 900M-row table restarting at chunk
# 0 on every retry (issue 3033).


def test_reconciliation_mismatch_clears_the_resume_point():
    func = function_node(COPY_SOURCE_PATH, "copy_table_task")
    handlers = handlers_for(func, "ReconciliationError")
    assert handlers, "copy_table_task needs a handler for ReconciliationError specifically"
    assert any(calls_to(handler, "clear_resume_point") for handler in handlers)


def test_only_the_reconciliation_handler_clears_the_resume_point():
    func = function_node(COPY_SOURCE_PATH, "copy_table_task")
    for handler in handlers_for(func, "ChunkCopyError") + handlers_for(func, "Exception"):
        names = handled_exception_names(handler)
        if "ReconciliationError" in names:
            continue
        assert not calls_to(handler, "clear_resume_point"), (
            f"the 'except {'/'.join(sorted(names))}' handler must keep the resume point: "
            "it is what makes a retried chunk copy resume instead of restarting"
        )


# ---------------------------------------------------------------------------
# A dry run must be non-destructive and must not stop at the first bad table
# ---------------------------------------------------------------------------


def test_ensure_status_tables_is_told_about_the_dry_run():
    """It ran before the dryRun check and DROPped a legacy status table."""
    func = function_node(COPY_SOURCE_PATH, "create_schema_tables")
    calls = calls_to(func, "ensure_status_tables")
    assert calls, "create_schema_tables must still create the bookkeeping tables"
    assert all(
        any(keyword.arg == "dry_run" for keyword in call.keywords) for call in calls
    ), "ensure_status_tables must be passed dry_run, or a dry run destroys real state"


def test_a_planner_error_under_dry_run_does_not_abort_the_schema():
    func = function_node(COPY_SOURCE_PATH, "create_schema_tables")
    handlers = handlers_for(func, "PlannerError")
    assert handlers, (
        "a dry run exists to list every unplannable table; without a handler the "
        "operator only ever learns about the first one"
    )


def test_outside_a_dry_run_a_planner_error_still_fails_fast():
    func = function_node(COPY_SOURCE_PATH, "create_schema_tables")
    handler = handlers_for(func, "PlannerError")[0]
    reraises = [
        node
        for node in ast.walk(handler)
        if isinstance(node, ast.If)
        and isinstance(node.test, ast.UnaryOp)
        and isinstance(node.test.op, ast.Not)
        and isinstance(node.test.operand, ast.Attribute)
        and node.test.operand.attr == "dry_run"
        and any(isinstance(inner, ast.Raise) for stmt in node.body for inner in ast.walk(stmt))
    ]
    assert reraises, "a real run must still fail fast on an unplannable table"


def test_the_dry_run_reports_a_summary():
    func = function_node(COPY_SOURCE_PATH, "create_schema_tables")
    assert calls_to(func, "describe_dry_run_summary"), (
        "the operator needs to be told how many tables planned cleanly and how many "
        "did not, not just a stream of per-table errors"
    )


def test_mark_failed_is_not_written_during_a_dry_run():
    """A dry run may not have a status table to write to, and must not create one."""
    func = function_node(COPY_SOURCE_PATH, "copy_table_task")
    assert calls_to(func, "mark_failed"), "a real failure must still be recorded"
    assert dry_run_guarded_branch(func, "mark_failed") is not None


# ---------------------------------------------------------------------------
# Per-chunk observability (acceptance criterion 14)
# ---------------------------------------------------------------------------


def test_the_chunk_log_line_is_emitted_after_the_work():
    func = function_node(COPY_SOURCE_PATH, "copy_table_chunk")
    assert calls_to(func, "describe_chunk_progress"), (
        "a chunk has to report rows copied and elapsed time, not just its predicate"
    )


def test_execute_statement_timings_are_captured_rather_than_discarded():
    """execute_statement is @time_execution decorated and returns the elapsed
    seconds; every caller used to throw that away."""
    func = function_node(COPY_SOURCE_PATH, "copy_table_chunk")
    assigned = [
        node
        for node in ast.walk(func)
        if isinstance(node, ast.Assign) and calls_to(node.value, "execute_statement")
    ]
    assert len(assigned) >= 2, "both the DELETE and the INSERT timings are wanted"


def test_the_bigquery_bytes_limitation_is_recorded():
    """total_bytes_processed is not available through the DuckDB BigQuery
    extension path, so it must be documented rather than faked."""
    func = function_node(COPY_SOURCE_PATH, "copy_table_chunk")
    source = COPY_SOURCE_PATH.read_text()
    start, end = func.lineno, func.end_lineno
    body = "\n".join(source.splitlines()[start - 1 : end])
    assert "total_bytes_processed" in body
