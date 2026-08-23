import pytest

pydantic = pytest.importorskip("pydantic")

from create_cachedb_file_plugin.types import CreateCacheOptions


def _options(**overrides):
    payload = {
        "flowActionType": "create_datamart_cache",
        "databaseCode": "alpdev_pg",
        "schemaName": "cdmdefault",
        "tablesToCreateDuckdbFtsIndex": ["concept"],
    }
    payload.update(overrides)
    return CreateCacheOptions(**payload)


def test_fresh_copy_defaults_to_false():
    assert _options().fresh_copy is False
    assert _options().dry_run is False


def test_fresh_copy_accepts_the_camel_case_alias():
    assert _options(freshCopy=True).fresh_copy is True
    assert _options(dryRun=True).dry_run is True
