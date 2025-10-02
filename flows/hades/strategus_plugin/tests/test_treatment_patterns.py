import pytest
from flows.hades.strategus_plugin.nodes import TreatmentPatterns, Result
from flows.hades.strategus_plugin.nodes import CohortDefinitionSharedResource

def test_treatment_patterns_constructor_and_task():
    # sample TreatmentPatterns json_graph
    # json_graph = {"edges":{"e1":{"source":"treatment_patterns_node_0"},"e2":{"source":"cohort_node_0","target":"treatment_patterns_node_0"},"e3":{"source":"cohort_node_1","target":"treatment_patterns_node_0"},"e4":{"source":"cohort_node_2","target":"treatment_patterns_node_0"}},"nodes":{"cohort_node_0":{"id":"1d749dd2-0a72-460e-92f0-b2a99dfa65a4","type":"cohort_node","cohorts":[{"cohortId":10,"cohortName":"Depression", "cohortType": "target"}]},"cohort_node_1":{"id":"a1ef0e24-0cea-413e-9be7-470931e55bd2","type":"cohort_node","cohorts":[{"cohortId": 9,"cohortName":"NewUsersBupropion", "cohortType": "event"}]},"cohort_node_2":{"id":"9f162813-4757-4297-a39c-e18a0b92a8a8","type":"cohort_node","cohorts":[{"cohortId":11,"cohortName":"NewUsersSSRI", "cohortType": "exit"}]},"treatment_patterns_node_0":{"id":"3e81d37b-be4c-4873-ac85-425f5a4a4b18","type":"treatment_patterns_node","ageWindow":5,"splitTime":30,"censorType":"minCellCount","minCellCount":1,"maxPathLength":5,"minEraDuration":7,"eraCollapseSize":14,"filterTreatments":"First","combinationWindow":7,"minPostCombinationDuration":7, "overlapMethod": "truncate", "concatTargets": True, "startAnchor": "startDate", "windowStart": 0,"endAnchor": "endDate","windowEnd": 0}}}
    node = {"id":"3e81d37b-be4c-4873-ac85-425f5a4a4b18","type":"treatment_patterns_node","ageWindow":5,"splitTime":30,"censorType":"minCellCount","minCellCount":1,"maxPathLength":5,"minEraDuration":7,"eraCollapseSize":14,"filterTreatments":"First","combinationWindow":7,"minPostCombinationDuration":7, "overlapMethod": "truncate", "concatTargets": True, "startAnchor": "startDate", "windowStart": 0,"endAnchor": "endDate","windowEnd": 0, "flowOptions": {}}
    obj = TreatmentPatterns(node)
    assert isinstance(obj, TreatmentPatterns)

    # Construct a minimal valid CohortDefinitionSharedResource node
    cohort_node_dict = {
        "id": "cohort1",
        "type": "cohort_node",
        "flowOptions": {},
        "cohorts": [
            {
                "cohortId": 1,
                "cohortType": "target",
                "cohortName": "Test Cohort"
            }
        ]
    }
    cohort_node = CohortDefinitionSharedResource(cohort_node_dict)
    task_run_context = {"id": "run1", "name": "test", "flow_run_id": "flow1"}
    cohort_result = Result(False, None, cohort_node, task_run_context)
    task_input = {"cohort1": cohort_result}

    result = obj.task(task_input, task_run_context)
    assert isinstance(result, Result)
    assert result.error is False
    # Check the R class attribute for 'TreatmentPatternsModule'
    r_classes = list(result.data.rclass) if hasattr(result.data, 'rclass') else []
    assert "TreatmentPatternsModuleSpecifications" in r_classes
