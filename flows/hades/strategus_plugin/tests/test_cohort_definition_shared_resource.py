import pytest
from flows.hades.strategus_plugin.nodes import CohortDefinitionSharedResource, Result
from unittest.mock import patch, MagicMock

@patch('flows.hades.strategus_plugin.nodes.WebAPI')
@patch('prefect.runtime.flow_run.get_parent_flow_run_id', return_value="00000000-0000-0000-0000-000000000000")
def test_cohort_definition_shared_resource_task_returns_expected_classes(mock_get_parent_flow_run_id, MockWebAPI):
    # Mock the WebAPI instance and its methods
    mock_webapi_instance = MagicMock()
    mock_webapi_instance.get_cohort_definition.return_value = {
        "expression": {},
        "name": "Test Cohort"
    }
    MockWebAPI.return_value = mock_webapi_instance

    node = {
        "id": "cohort1",
        "type": "cohort_node",
        "flowOptions": {"datasetId": "dummy-dataset-id"},
        "cohorts": [
            {
                "cohortId": 1,
                "cohortType": "target",
                "cohortName": "Test Cohort"
            }
        ]
    }
    obj = CohortDefinitionSharedResource(node)
    assert isinstance(obj, CohortDefinitionSharedResource)

    task_run_context = {"id": "run1", "name": "test", "flow_run_id": "flow1"}
    # The .task() method does not require input, just context
    result = obj.task(task_run_context)
    assert isinstance(result, Result)
    assert result.error is False

    # The result data is a dict with keys 'cohortDefinitionSharedResource' and 'cohortGeneratorModuleSpecifications'
    assert isinstance(result.data, dict)
    assert "cohortDefinitionSharedResource" in result.data
    assert "cohortGeneratorModuleSpecifications" in result.data
    # Check R class for the module specifications
    r_classes = list(result.data["cohortGeneratorModuleSpecifications"].rclass) if hasattr(result.data["cohortGeneratorModuleSpecifications"], 'rclass') else []
    assert "CohortGeneratorModuleSpecifications" in r_classes
