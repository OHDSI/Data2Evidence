import json
from unittest.mock import patch, MagicMock
from prefect.testing.utilities import prefect_test_harness
from cohort_discovery_plugin.types import CohortDiscoveryOptions

def test_flow_builds_artifact_from_child_output():
    from cohort_discovery_plugin import flow as flowmod
    child_json = json.dumps({"results": [
        {"analysis": None, "count": 12, "distributions": {}, "raw": {"count": 12}},
        {"analysis": "DEMOGRAPHICS", "count": None, "distributions": {"DEMOGRAPHICS": [{"k": 1}]}, "raw": {}},
    ], "error": None})
    fake_creds = MagicMock(dialect="postgres", host="h", port=5432, databaseName="omop",
                           user="u", password=MagicMock(get_secret_value=lambda: "pw"))
    with prefect_test_harness():
        with patch.object(flowmod, "_resolve_credentials", return_value=(fake_creds, "cdm")), \
             patch.object(flowmod, "_run_child", return_value=child_json), \
             patch.object(flowmod, "create_markdown_artifact") as art:
            env = flowmod.cohort_discovery_plugin(
                CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))
    assert env.availability["count"] == 12
    assert env.distributions["DEMOGRAPHICS"] == [{"k": 1}]
    assert env.metadata["datasetId"] == "ds1"
    art.assert_called_once()

def test_flow_hard_fails_on_child_error():
    from cohort_discovery_plugin import flow as flowmod
    child_json = json.dumps({"results": [], "error": "ValueError: unsupported rule"})
    fake_creds = MagicMock(dialect="postgres", host="h", port=5432, databaseName="omop",
                           user="u", password=MagicMock(get_secret_value=lambda: "pw"))
    with prefect_test_harness():
        with patch.object(flowmod, "_resolve_credentials", return_value=(fake_creds, "cdm")), \
             patch.object(flowmod, "_run_child", return_value=child_json), \
             patch.object(flowmod, "create_markdown_artifact"):
            try:
                flowmod.cohort_discovery_plugin(
                    CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))
                assert False, "expected RuntimeError"
            except RuntimeError:
                pass
