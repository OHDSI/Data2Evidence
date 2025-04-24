import pytest
from pyqe.ql.criteria_group import CriteriaGroup
from pyqe.ql.filter_card import FilterCard
from pyqe.types.enum_types import MatchCriteria


def test_raise_value_error_when_init_criteria_group_with_none_criteria_match():
    # When & Then
    with pytest.raises(ValueError) as e:
        criteria_group = CriteriaGroup(None)


def test_init_criteria_group():
    # Given
    criteria_match = MatchCriteria.ALL

    # When
    criteria_group = CriteriaGroup(criteria_match)

    # Then
    assert criteria_group._criteria_match == criteria_match
    assert criteria_group._filters == []
    assert criteria_group._groups == []


def test_init_criteria_group_with_filters():
    # Given
    criteria_match = MatchCriteria.ALL
    filters = [FilterCard('name', 'configPath')]

    # When
    criteria_group = CriteriaGroup(criteria_match, filters)

    # Then
    assert criteria_group._criteria_match == criteria_match
    assert criteria_group._filters == filters
    assert criteria_group._groups == []


def test_add_exclusive_group():
    # Given
    criteria_match = MatchCriteria.ALL
    criteria_group = CriteriaGroup(criteria_match)
    inner_group = CriteriaGroup(MatchCriteria.ANY, [FilterCard('name', 'configPath')])

    # When
    criteria_group.add_exclusive_group(inner_group)

    # Then
    assert criteria_group._criteria_match == criteria_match
    assert criteria_group._filters == []
    assert criteria_group._groups == [inner_group]