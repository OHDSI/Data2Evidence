import pytest
import sqlalchemy as sa

from data_characterization_plugin.utils import (
    RESULTS_SCHEMA_TABLES,
    cdmresults_clear_cache_path,
    run_sql_statements,
    tables_to_drop,
    webapi_cache_source_key,
)

# Tables DC itself produces; everything else in a results schema belongs to Atlas.
DC_OWNED = {"concept_hierarchy", "achilles_result_concept_count"}


def test_legacy_mode_drops_the_full_results_schema_table_list():
    assert tables_to_drop(use_trex_connection=True) == RESULTS_SCHEMA_TABLES


def test_source_mode_drops_only_dc_owned_tables():
    tables = tables_to_drop(use_trex_connection=False)
    assert set(tables) == DC_OWNED
    for table in tables:
        assert table.startswith("achilles_") or table == "concept_hierarchy"


def test_source_mode_preserves_atlas_artifacts():
    tables = set(tables_to_drop(use_trex_connection=False))
    for atlas_table in (
        "cohort_cache",
        "cohort_inclusion",
        "cohort_inclusion_result",
        "ir_analysis_result",
        "cc_results",
        "pathway_analysis_paths",
        "heracles_results",
    ):
        assert atlas_table in RESULTS_SCHEMA_TABLES  # guard against list drift
        assert atlas_table not in tables


def test_tables_to_drop_does_not_mutate_the_shared_list():
    tables_to_drop(use_trex_connection=True).append("bogus")
    assert "bogus" not in RESULTS_SCHEMA_TABLES


# webapi_cache_source_key


def test_source_connection_run_clears_the_cache_of_its_own_dataset():
    assert (
        webapi_cache_source_key(use_trex_connection=False, dataset_id="ds-1") == "ds-1"
    )


def test_legacy_trex_run_has_no_webapi_source_to_clear():
    assert webapi_cache_source_key(use_trex_connection=True, dataset_id="ds-1") is None


def test_a_run_without_a_dataset_id_has_no_webapi_source_to_clear():
    assert webapi_cache_source_key(use_trex_connection=False, dataset_id=None) is None
    assert webapi_cache_source_key(use_trex_connection=False, dataset_id="") is None


def test_clear_cache_path_is_the_cdmresults_endpoint_for_the_source():
    assert cdmresults_clear_cache_path("ds-1") == "cdmresults/ds-1/clearCache"

# run_sql_statements


def _row_count(engine, table: str) -> int:
    with engine.connect() as conn:
        return conn.execute(sa.text(f"SELECT count(*) FROM {table}")).scalar()


def test_script_statements_are_committed(tmp_path):
    engine = sa.create_engine(f"sqlite:///{tmp_path / 'results.db'}")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE concept_hierarchy (concept_id INT)"))

    run_sql_statements(
        engine,
        "INSERT INTO concept_hierarchy VALUES (1);\n"
        "INSERT INTO concept_hierarchy VALUES (2);",
    )

    assert _row_count(engine, "concept_hierarchy") == 2


def test_a_failing_statement_rolls_back_the_whole_script(tmp_path):
    engine = sa.create_engine(f"sqlite:///{tmp_path / 'results.db'}")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE concept_hierarchy (concept_id INT)"))

    with pytest.raises(sa.exc.OperationalError):
        run_sql_statements(
            engine,
            "INSERT INTO concept_hierarchy VALUES (1);\n"
            "INSERT INTO missing_table VALUES (2);",
        )

    assert _row_count(engine, "concept_hierarchy") == 0


def test_an_ignorable_error_skips_the_statement_and_keeps_the_rest(tmp_path):
    engine = sa.create_engine(f"sqlite:///{tmp_path / 'results.db'}")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE concept_hierarchy (concept_id INT)"))
        conn.execute(sa.text("CREATE INDEX idx_ch ON concept_hierarchy (concept_id)"))

    run_sql_statements(
        engine,
        "CREATE INDEX idx_ch ON concept_hierarchy (concept_id);\n"
        "INSERT INTO concept_hierarchy VALUES (1);",
        is_ignorable_error=lambda e: "already exists" in str(e),
    )

    assert _row_count(engine, "concept_hierarchy") == 1
