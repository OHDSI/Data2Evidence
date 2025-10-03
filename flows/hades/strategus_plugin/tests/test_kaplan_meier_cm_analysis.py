import pytest
from flows.hades.strategus_plugin.nodes import KaplanMeierCMAnalysis, Result

def test_kaplan_meier_cm_analysis_task_returns_cmAnalysis():
    node = {
        "id": "42617632-4b59-4a32-b9ce-6e1fc9d66907",
        "type": "kaplan_meier_node",
        "flowOptions": {},
        "kaplanMeierArgs": {
            "analysisId": 1,
            "description": "Kaplan-Meier survival analysis",
            "timeAtRisks": [],
            "createStudyPopArgs": {
                "endAnchor": "cohort end",
                "startAnchor": "cohort start",
                "riskWindowEnd": 0,
                "riskWindowStart": 1,
                "firstExposureOnly": True,
                "requireTimeAtRisk": False,
                "priorOutcomeLookback": 0,
                "removeDuplicateSubjects": "keep first",
                "removeSubjectsWithPriorOutcome": False
            },
            "getDbCohortMethodDataArgs": {
                "studyStartDate": "",
                "studyEndDate": ""
            }
        }
    }
    obj = KaplanMeierCMAnalysis(node)
    assert isinstance(obj, KaplanMeierCMAnalysis)

    task_run_context = {"id": "run1", "name": "test", "flow_run_id": "flow1"}
    task_input = {}  # or minimal required input

    result = obj.task(task_input, task_run_context)
    assert isinstance(result, Result)
    assert result.error is False

    # Assert the R object class
    r_classes = list(result.data.rclass) if hasattr(result.data, 'rclass') else []
    assert "cmAnalysis" in r_classes

def test_kaplan_meier_cm_analysis_missing_args_raises():
    with pytest.raises(ValueError):
        KaplanMeierCMAnalysis({"id": "x", "type": "kaplan_meier_node", "flowOptions": {}})
