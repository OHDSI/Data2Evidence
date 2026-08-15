from data_characterization_plugin.types import DCOptionsType

BASE = dict(
    schemaName="cdm",
    databaseCode="db1",
    cdmVersionNumber="5.4",
    vocabSchemaName="vocab",
    resultsSchema="cdm_results",
)


def test_use_trex_connection_defaults_to_true():
    opts = DCOptionsType(**BASE)
    assert opts.useSourceConnection is False
    assert opts.use_trex_connection is True


def test_use_source_connection_disables_trex_connection():
    opts = DCOptionsType(**BASE, useSourceConnection=True)
    assert opts.use_trex_connection is False


def test_use_source_connection_survives_model_dump_roundtrip():
    opts = DCOptionsType(**BASE, useSourceConnection=True)
    again = DCOptionsType(**opts.model_dump())
    assert again.use_trex_connection is False
