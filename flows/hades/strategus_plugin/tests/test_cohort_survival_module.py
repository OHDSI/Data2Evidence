from flows.hades.strategus_plugin.nodes import CohortSurvivalModuleNode, CohortDefinitionSharedResource, Result
from unittest.mock import patch, MagicMock

@patch('flows.hades.strategus_plugin.nodes.WebAPI')
@patch('prefect.runtime.flow_run.get_parent_flow_run_id', return_value="00000000-0000-0000-0000-000000000000")
def test_cohort_survival_module_node_task_returns_expected_result(mock_get_parent_flow_run_id, MockWebAPI):
    # Mock the WebAPI instance and its methods
    mock_webapi_instance = MagicMock()
    mock_webapi_instance.get_cohort_definition.return_value = {
        "expression": {"ConceptSets":[{"id":0,"name":"Celecoxib","expression":{"items":[{"concept":{"CONCEPT_CLASS_ID":"Ingredient","CONCEPT_CODE":"140587","CONCEPT_ID":1118084,"CONCEPT_NAME":"celecoxib","DOMAIN_ID":"Drug","INVALID_REASON":"V","INVALID_REASON_CAPTION":"Valid","STANDARD_CONCEPT":"S","STANDARD_CONCEPT_CAPTION":"Standard","VOCABULARY_ID":"RxNorm"}}]}}],"PrimaryCriteria":{"CriteriaList":[{"DrugEra":{"CodesetId":0}}],"ObservationWindow":{"PriorDays":0,"PostDays":0},"PrimaryCriteriaLimit":{"Type":"All"}},"QualifiedLimit":{"Type":"First"},"ExpressionLimit":{"Type":"All"},"InclusionRules":[],"EndStrategy":{"CustomEra":{"DrugCodesetId":0,"GapDays":30,"Offset":0}},"CensoringCriteria":[],"CollapseSettings":{"CollapseType":"ERA","EraPad":0},"CensorWindow":{},"cdmVersionRange":">=5.0.0"},
        "name": "Test Cohort"
    }
    MockWebAPI.return_value = mock_webapi_instance

    # Create minimal target and outcome cohort nodes
    target_node = {
        "id": "cohort_target",
        "type": "cohort_node",
        "flowOptions": {"datasetId": "dummy-dataset-id"},
        "cohorts": [{"cohortId": 1, "cohortName": "Target Cohort", "cohortType": "target"}],
        "cohortType": "target"
    }
    outcome_node = {
        "id": "cohort_outcome",
        "type": "cohort_node",
        "flowOptions": {"datasetId": "dummy-dataset-id"},
        "cohorts": [{"cohortId": 2, "cohortName": "Outcome Cohort", "cohortType": "outcome"}],
        "cohortType": "outcome"
    }
    target_cohort = CohortDefinitionSharedResource(target_node)
    outcome_cohort = CohortDefinitionSharedResource(outcome_node)
    task_run_context = {"id": "run1", "name": "test", "flow_run_id": "flow1"}
    target_result = target_cohort.task(task_run_context)
    outcome_result = outcome_cohort.task(task_run_context)
    input_results = {
        target_node["id"]: target_result,
        outcome_node["id"]: outcome_result
    }

    node = {
        "id": "survival1",
        "type": "cohort_survival_module_node",
        "flowOptions": {},
        "strata": "gender,age_group",
        "eventGap": 14,
        "followupDays": 180,
        "analysisType": "single_event",
        "targetCohortTable": "cohort",
        "outcomeCohortTable": "cohort"
    }
    obj = CohortSurvivalModuleNode(node)
    assert isinstance(obj, CohortSurvivalModuleNode)

    result = obj.task(input_results, task_run_context)
    assert isinstance(result, Result)
    assert result.error is False
    # Check the R class attribute for 'CohortSurvivalModuleSpecifications'
    r_classes = list(result.data.rclass) if hasattr(result.data, 'rclass') else []
    assert "CohortSurvivalModuleSpecifications" in r_classes
