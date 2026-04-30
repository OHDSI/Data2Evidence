import pytest
from unittest.mock import patch, MagicMock
from flows.hades.strategus_plugin.nodes import TargetComparatorOutcomes, CMOutcomes, CohortDefinitionSharedResource, Result

NODE_DATA = {
    "id": "dd791b14-39fd-49eb-a8d6-4854886a11bf",
    "type": "target_comparator_outcomes_node",
    "flowOptions": {},
    "targetId": 1,
    "comparatorId": 1,
    "trueEffectSize": 1,
    "priorOutcomeLookback": 30,
    "excludedCovariateConceptIds": [],
    "includedCovariateConceptIds": []
}

@patch('flows.hades.strategus_plugin.nodes.WebAPI')
@patch('prefect.runtime.flow_run.get_parent_flow_run_id', return_value="00000000-0000-0000-0000-000000000000")
def test_target_comparator_outcomes_task_returns_outcome(mock_get_parent_flow_run_id, MockWebAPI):
    obj = TargetComparatorOutcomes(NODE_DATA)
    assert isinstance(obj, TargetComparatorOutcomes)

    # Mock required input nodes
    cm_outcomes_node = {
        "id": "350b6ce3-6217-4b40-9776-ddd76cfc3f52",
        "type": "outcomes_node",
        "flowOptions": {},
        "trueEffectSize": 1,
        "outcomeOfInterest": True,
        "priorOutcomeLookback": 30
    }
    cohort_def_node = {
        "id": "efe05169-838d-4d5b-b000-c2b853b02bdd",
        "type": "cohort_node",
        "flowOptions": {},
        "cohorts": [{"cohortId": 2, "cohortType": "target", "cohortName": "NewUsersSSRI"}],
        "cohortType": "target"
    }
    cm_outcomes = CMOutcomes(cm_outcomes_node)
    cohort_def = CohortDefinitionSharedResource(cohort_def_node)
    # Mock WebAPI instance and its methods
    mock_webapi_instance = MagicMock()
    mock_webapi_instance.get_cohort_definition.return_value = {
        "expression": {"ConceptSets":[{"id":0,"name":"Celecoxib","expression":{"items":[{"concept":{"CONCEPT_CLASS_ID":"Ingredient","CONCEPT_CODE":"140587","CONCEPT_ID":1118084,"CONCEPT_NAME":"celecoxib","DOMAIN_ID":"Drug","INVALID_REASON":"V","INVALID_REASON_CAPTION":"Valid","STANDARD_CONCEPT":"S","STANDARD_CONCEPT_CAPTION":"Standard","VOCABULARY_ID":"RxNorm"}}]}}],"PrimaryCriteria":{"CriteriaList":[{"DrugEra":{"CodesetId":0}}],"ObservationWindow":{"PriorDays":0,"PostDays":0},"PrimaryCriteriaLimit":{"Type":"All"}},"QualifiedLimit":{"Type":"First"},"ExpressionLimit":{"Type":"All"},"InclusionRules":[],"EndStrategy":{"CustomEra":{"DrugCodesetId":0,"GapDays":30,"Offset":0}},"CensoringCriteria":[],"CollapseSettings":{"CollapseType":"ERA","EraPad":0},"CensorWindow":{},"cdmVersionRange":">=5.0.0"},
        "name": "Test Cohort"
    }
    MockWebAPI.return_value = mock_webapi_instance
    task_run_context = {"id": "run1", "name": "test", "flow_run_id": "flow1"}
    cohort_def_result = cohort_def.task(task_run_context)
    cm_outcomes_result = cm_outcomes.task({cohort_def_node["id"]: cohort_def_result}, task_run_context)
    input_results = {
        cm_outcomes_node["id"]: cm_outcomes_result,
        cohort_def_node["id"]: cohort_def_result
    }
    result = obj.task(input_results, task_run_context)
    assert isinstance(result, Result)
    assert result.error is False
    r_classes = list(result.data.rclass) if hasattr(result.data, 'rclass') else []
    assert "targetcomparatoroutcomes" in [cls.lower() for cls in r_classes]
