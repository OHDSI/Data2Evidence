from data_characterization_plugin.utils import RESULTS_SCHEMA_TABLES, tables_to_drop

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
