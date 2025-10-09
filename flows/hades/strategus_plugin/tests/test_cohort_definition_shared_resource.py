import pytest
from flows.hades.strategus_plugin.nodes import CohortDefinitionSharedResource, Result
from unittest.mock import patch, MagicMock

@patch('flows.hades.strategus_plugin.nodes.WebAPI')
@patch('prefect.runtime.flow_run.get_parent_flow_run_id', return_value="00000000-0000-0000-0000-000000000000")
def test_cohort_definition_shared_resource_task_returns_expected_classes(mock_get_parent_flow_run_id, MockWebAPI):
    # Mock the WebAPI instance and its methods
    mock_webapi_instance = MagicMock()
    mock_webapi_instance.get_cohort_definition.return_value = {
        "expression": {"ConceptSets":[{"id":0,"name":"Celecoxib","expression":{"items":[{"concept":{"CONCEPT_CLASS_ID":"Ingredient","CONCEPT_CODE":"140587","CONCEPT_ID":1118084,"CONCEPT_NAME":"celecoxib","DOMAIN_ID":"Drug","INVALID_REASON":"V","INVALID_REASON_CAPTION":"Valid","STANDARD_CONCEPT":"S","STANDARD_CONCEPT_CAPTION":"Standard","VOCABULARY_ID":"RxNorm"}}]}}],"PrimaryCriteria":{"CriteriaList":[{"DrugEra":{"CodesetId":0}}],"ObservationWindow":{"PriorDays":0,"PostDays":0},"PrimaryCriteriaLimit":{"Type":"All"}},"QualifiedLimit":{"Type":"First"},"ExpressionLimit":{"Type":"All"},"InclusionRules":[],"EndStrategy":{"CustomEra":{"DrugCodesetId":0,"GapDays":30,"Offset":0}},"CensoringCriteria":[],"CollapseSettings":{"CollapseType":"ERA","EraPad":0},"CensorWindow":{},"cdmVersionRange":">=5.0.0"},
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
                "cohortName": "Test Cohort"
            }
        ],
        "cohortType": "target"
    }
    obj = CohortDefinitionSharedResource(node)
    assert isinstance(obj, CohortDefinitionSharedResource)
    assert obj.cohortType.value == "target"

    task_run_context = {"id": "run1", "name": "test", "flow_run_id": "flow1"}
    result = obj.task(task_run_context)
    assert isinstance(result, Result)
    print("*******Error Message*******:")
    print(result.data)
    assert result.error is False

    # The result data is a dict with keys 'cohortDefinitionSharedResource' and 'cohortGeneratorModuleSpecifications'
    # Assert the R object class
    assert isinstance(result.data, dict)
    assert "cohortDefinitionSharedResource" in result.data
    assert "cohortGeneratorModuleSpecifications" in result.data
    # Check R class for the module specifications
    r_classes = list(result.data["cohortGeneratorModuleSpecifications"].rclass) if hasattr(result.data["cohortGeneratorModuleSpecifications"], 'rclass') else []
    assert "CohortGeneratorModuleSpecifications" in r_classes

    # # assert result.data is a pandas data frame with columns cohortId, cohortName, sql and json
    # df = convert_R_to_py(result.data)
    # assert hasattr(df, 'columns')
    # assert "cohortId" in df.columns
    # assert "cohortName" in df.columns
    # assert "sql" in df.columns
    # assert "json" in df.columns