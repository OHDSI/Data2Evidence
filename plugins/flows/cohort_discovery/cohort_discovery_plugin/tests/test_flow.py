import json
from unittest.mock import patch, MagicMock

import pytest
from prefect.testing.utilities import prefect_test_harness

from cohort_discovery_plugin.types import CohortDiscoveryOptions

def _fake_creds():
    return MagicMock(dialect="postgres", host="h", port=5432, databaseName="omop",
                     user="u", password=MagicMock(get_secret_value=lambda: "pw"))

def test_flow_builds_artifact_from_child_output():
    from cohort_discovery_plugin import flow as flowmod
    child_json = json.dumps({"results": [
        {"analysis": None, "count": 12, "files": [], "raw": {}},
        {"analysis": "DISTRIBUTION", "code": "DEMOGRAPHICS", "count": None,
         "files": [{"k": 1}], "raw": {}},
    ], "error": None})
    with prefect_test_harness():
        with patch.object(flowmod, "_resolve_credentials", return_value=(_fake_creds(), "cdm", "omop")), \
             patch.object(flowmod, "_run_child", return_value=child_json), \
             patch.object(flowmod, "create_markdown_artifact") as art:
            env = flowmod.cohort_discovery_plugin(
                CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))
    assert env.availability["count"] == 12
    assert env.distributions["DEMOGRAPHICS"] == [{"k": 1}]
    assert env.metadata["datasetId"] == "ds1"
    assert env.errors == []
    art.assert_called_once()

def test_flow_persists_artifact_then_hard_fails_on_child_error():
    from cohort_discovery_plugin import flow as flowmod
    child_json = json.dumps({"results": [], "error": "ValueError: unsupported rule"})
    with prefect_test_harness():
        with patch.object(flowmod, "_resolve_credentials", return_value=(_fake_creds(), "cdm", "omop")), \
             patch.object(flowmod, "_run_child", return_value=child_json), \
             patch.object(flowmod, "create_markdown_artifact") as art, \
             pytest.raises(RuntimeError):
            flowmod.cohort_discovery_plugin(
                CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))

    # The failure must still be persisted as an artifact, with the child error
    # carried in the envelope's `errors`.
    art.assert_called_once()
    kwargs = art.call_args.kwargs
    assert kwargs["key"] == "cohort-discovery-result"
    payload = json.loads(kwargs["markdown"].split("```json\n", 1)[1].rsplit("\n```", 1)[0])
    assert payload["errors"], "expected the child error in the persisted envelope"
    assert "unsupported rule" in json.dumps(payload["errors"])


def test_icd_main_task_hard_fails_with_error_in_artifact():
    """ICD-MAIN is rejected by Bunny itself (NotImplementedError in execute_query
    before any solver runs), so it surfaces as a child error. There is no config
    that enables it — this pins that it hard-fails rather than silently
    returning an empty/partial result."""
    from cohort_discovery_plugin import flow as flowmod
    child_json = json.dumps({"results": [], "error": (
        "NotImplementedError: ICD-MAIN queries are not yet supported. "
        "See: https://github.com/Health-Informatics-UoN/hutch-bunny/issues/30")})
    with prefect_test_harness():
        with patch.object(flowmod, "_resolve_credentials", return_value=(_fake_creds(), "cdm", "omop")), \
             patch.object(flowmod, "_run_child", return_value=child_json), \
             patch.object(flowmod, "create_markdown_artifact") as art, \
             pytest.raises(RuntimeError):
            flowmod.cohort_discovery_plugin(
                CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))

    art.assert_called_once()
    payload = json.loads(
        art.call_args.kwargs["markdown"].split("```json\n", 1)[1].rsplit("\n```", 1)[0])
    assert "ICD-MAIN" in json.dumps(payload["errors"])
    # No result is fabricated for the rejected task.
    assert payload["availability"]["count"] is None
    assert payload["distributions"] == {}


def _dao(dialect, database_name, cache_id):
    dao = MagicMock()
    dao.cache_id = cache_id
    dao.tenant_configs = MagicMock(dialect=dialect, databaseName=database_name)
    return dao

def _fake_dbdao_module(monkeypatch, dao):
    """DBDao is imported lazily inside _resolve_credentials (it pulls in ibis),
    so stub the module in sys.modules rather than importing it."""
    import sys, types as _types
    monkeypatch.setitem(sys.modules, "_shared_flow_utils.dao.DBDao",
                        _types.SimpleNamespace(DBDao=lambda **kwargs: dao))

def test_resolve_uses_database_name_for_postgres(monkeypatch):
    """cache_id defaults to database_code in DaoBase, so it must NOT be used as
    the postgres database name."""
    from cohort_discovery_plugin import flow as flowmod
    _fake_dbdao_module(monkeypatch, _dao("postgres", "omop", "pg1"))
    _, _, database = flowmod._resolve_credentials(
        CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))
    assert database == "omop"

def test_resolve_uses_cache_id_for_trex(monkeypatch):
    from cohort_discovery_plugin import flow as flowmod
    _fake_dbdao_module(monkeypatch, _dao("trex", "db_code", "cache-abc"))
    _, _, database = flowmod._resolve_credentials(
        CohortDiscoveryOptions(datasetId="ds1", databaseCode="db_code",
                               cacheId="cache-abc", schemaName="cdm"))
    assert database == "cache-abc"
