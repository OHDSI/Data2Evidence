"""Control-flow assertions about ``copy.py``.

See ``copy_source.py`` for why these are parsed rather than executed.
"""

from .copy_source import (
    COPY_SOURCE_PATH,
    calls_to,
    dry_run_guarded_branch,
    function_node,
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
