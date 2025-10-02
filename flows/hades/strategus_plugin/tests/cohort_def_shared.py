import pytest
from flows.hades.strategus_plugin.rnodes.CohortDefinition import CohortDefinitionSharedResource
from flows.hades.strategus_plugin.types import CohortNodeType


def make_node(cohortId=1, cohortName="Test Cohort", cohortType=None):
    cohort = {"cohortId": cohortId, "cohortName": cohortName}
    if cohortType is not None:
        cohort["cohortType"] = cohortType
    return {"id": "node1", "type": "cohort_node", "flowOptions": {}, "cohorts": [cohort]}


def test_valid_target_type():
    node = make_node(cohortId=2, cohortName="Depression", cohortType="target")
    obj = CohortDefinitionSharedResource(node)
    assert obj.cohortId == 2
    assert obj.cohortName == "Depression"
    assert obj.cohortType == CohortNodeType.TARGET


def test_missing_cohortType_defaults_event():
    node = make_node(cohortId=3, cohortName="NoType")
    obj = CohortDefinitionSharedResource(node)
    assert obj.cohortType == CohortNodeType.EVENT


def test_empty_cohortType_defaults_event():
    node = make_node(cohortId=4, cohortName="EmptyType", cohortType="")
    obj = CohortDefinitionSharedResource(node)
    assert obj.cohortType == CohortNodeType.EVENT


def test_whitespace_cohortType_defaults_event():
    node = make_node(cohortId=5, cohortName="WhitespaceType", cohortType="   ")
    obj = CohortDefinitionSharedResource(node)
    assert obj.cohortType == CohortNodeType.EVENT


def test_invalid_cohortType_raises():
    node = make_node(cohortId=6, cohortName="InvalidType", cohortType="not_a_type")
    with pytest.raises(ValueError):
        CohortDefinitionSharedResource(node)


def test_multiple_cohorts_uses_first():
    node = {"id": "node2", "type": "cohort_node", "flowOptions": {}, "cohorts": [
        {"cohortId": 10, "cohortName": "First", "cohortType": "event"},
        {"cohortId": 20, "cohortName": "Second", "cohortType": "target"}
    ]}
    obj = CohortDefinitionSharedResource(node)
    assert obj.cohortId == 10
    assert obj.cohortName == "First"
    assert obj.cohortType == CohortNodeType.EVENT


def test_missing_cohorts_key_raises():
    node = {"id": "node3", "type": "cohort_node", "flowOptions": {}}
    with pytest.raises(KeyError):
        CohortDefinitionSharedResource(node)


def test_empty_cohorts_list_raises():
    node = {"id": "node4", "type": "cohort_node", "flowOptions": {}, "cohorts": []}
    with pytest.raises(IndexError):
        CohortDefinitionSharedResource(node)
