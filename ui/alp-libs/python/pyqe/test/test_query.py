import pytest
from pyqe import *
import os
from io import StringIO
from pyqe.api.query import Query
from pyqe.api.pa_config import PAConfig
from pyqe.api.study import Study
from pyqe.ql.person import Person
from pyqe.api.base import _AuthApi
from pyqe.ql.interaction import Interaction, Interactions
from pyqe.ql.filter_card import _ExclusiveFilter
from pyqe.ql.criteria_group import CriteriaGroup
from pyqe.types.enum_types import QueryType, LogicalOperator, MatchCriteria
from test.mock_object import MockResponse

setStudy = 'api/services/userStudies'
PA = 'pa/services/analytics.xsjs'

@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_AUTH_TYPE', '0')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setattr(PAConfig, '_get_frontend_config', _get_mock_frontend_config)
    monkeypatch.setattr(Study, 'get_user_study_list', _get_mock_study_list)
    monkeypatch.setattr(PAConfig, '_get_my_config', _get_mock_my_config)

def _get_omop_patient():
    Person.generate_patient_class(_get_mock_omop_frontend_config())
    return Person.Patient()
    
def test_init_query(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))

    # When
    query = Query('cohortName')

    # Then
    assert query.cohort_name == 'cohortName'
    assert query._filters == []
    assert query._interaction_instances == {}

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_raise_value_error_when_none_is_added_as_criteria_group(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')

    # When & Then
    with pytest.raises(ValueError) as e:
        query.add_criteria_group(None)

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_raise_value_error_when_criteria_group_with_none_match_criteria_is_added(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    patient = _get_omop_patient()
    # When & Thenß
    with pytest.raises(ValueError):
        query.add_criteria_group(CriteriaGroup(None, [patient]))

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_raise_value_error_when_criteria_group_with_zero_filter_is_added(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')

    # When & Then
    with pytest.raises(ValueError):
        query.add_criteria_group(CriteriaGroup(MatchCriteria.ANY))

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_raise_value_error_when_criteria_group_with_all_match_criteria_with_zero_inner_criteria_group_is_added(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')

    # When & Then
    with pytest.raises(ValueError):
        query.add_criteria_group(CriteriaGroup(MatchCriteria.ALL))

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_raise_value_error_when_criteria_group_with_any_match_criteria_and_inner_criteria_group_is_added(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    criteria_group = CriteriaGroup(MatchCriteria.ANY)
    criteria_group.add_exclusive_group(CriteriaGroup(MatchCriteria.ALL, [Person.Patient()]))

    # When & Then
    with pytest.raises(ValueError):
        query.add_criteria_group(criteria_group)

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_add_criteria_group_with_patient(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    patient = Person.Patient()

    # When
    query.add_criteria_group(CriteriaGroup(MatchCriteria.ANY, [patient]))

    # Then
    assert len(query._filters) == 1
    exclusive_filter = query._filters[0]
    assert isinstance(exclusive_filter, _ExclusiveFilter)
    assert patient._instance_number == 0

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_add_criteria_group_with_match_any_criteria_and_interaction_instance_number_is_updated_based_on_config_path_count(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    interaction_a = Interaction('nameA', 'configPathA')
    interaction_b1 = Interaction('nameB', 'configPathB')
    interaction_b2 = Interaction('nameB', 'configPathB')
    interaction_b3 = Interaction('nameB', 'configPathB')

    # When
    query.add_criteria_group(CriteriaGroup(MatchCriteria.ANY,
                                           [interaction_a, interaction_b1, interaction_b2, interaction_b3]))

    # Then
    assert len(query._filters) == 1
    assert interaction_a._instance_number == 1
    assert interaction_b1._instance_number == 1
    assert interaction_b2._instance_number == 2
    assert interaction_b3._instance_number == 3

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_add_criteria_group_with_match_all_criteria_and_interaction_instance_number_is_updated_based_on_config_path_count(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    interaction_a = Interaction('nameA', 'configPathA')
    interaction_b1 = Interaction('nameB', 'configPathB')
    interaction_b2 = Interaction('nameB', 'configPathB')
    interaction_b3 = Interaction('nameB', 'configPathB')

    # When
    query.add_criteria_group(CriteriaGroup(MatchCriteria.ALL,
                                           [interaction_a, interaction_b1, interaction_b2, interaction_b3]))

    # Then
    assert len(query._filters) == 4
    assert interaction_a._instance_number == 1
    assert interaction_b1._instance_number == 1
    assert interaction_b2._instance_number == 2
    assert interaction_b3._instance_number == 3

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_add_nested_criteria_group_and_interaction_instance_number_is_updated_based_on_config_path_count(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    interaction_a = Interaction('nameA', 'configPathA')
    interaction_b1 = Interaction('nameB', 'configPathB')
    interaction_b2 = Interaction('nameB', 'configPathB')
    interaction_b3 = Interaction('nameB', 'configPathB')

    any_criteria_group = CriteriaGroup(MatchCriteria.ANY,
                                       [interaction_a, interaction_b1])
    all_criteria_group = CriteriaGroup(MatchCriteria.ALL,
                                       [interaction_b2, interaction_b3])
    criteria_group = CriteriaGroup(MatchCriteria.ALL)
    criteria_group.add_exclusive_group(any_criteria_group)
    criteria_group.add_exclusive_group(all_criteria_group)

    # When
    query.add_criteria_group(criteria_group)

    # Then
    assert len(query._filters) == 3
    assert query._filters[0]._cards[0] == interaction_a
    assert query._filters[0]._cards[1] == interaction_b1
    assert query._filters[1]._cards[0] == interaction_b2
    assert query._filters[2]._cards[0] == interaction_b3

    assert interaction_a._instance_number == 1
    assert interaction_b1._instance_number == 1
    assert interaction_b2._instance_number == 2
    assert interaction_b3._instance_number == 3

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_add_nested_criteria_group_with_filters_and_interaction_instance_number_is_updated_based_on_config_path_count(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    interaction_a = Interaction('nameA', 'configPathA')
    interaction_b1 = Interaction('nameB', 'configPathB')
    interaction_b2 = Interaction('nameB', 'configPathB')
    interaction_b3 = Interaction('nameB', 'configPathB')

    criteria_group = CriteriaGroup(MatchCriteria.ALL, [interaction_b1, interaction_b2])
    any_criteria_group = CriteriaGroup(MatchCriteria.ANY,
                                       [interaction_a, interaction_b3])
    criteria_group.add_exclusive_group(any_criteria_group)

    # When
    query.add_criteria_group(criteria_group)

    # Then
    assert len(query._filters) == 3
    assert query._filters[0]._cards[0] == interaction_b1
    assert query._filters[1]._cards[0] == interaction_b2
    assert query._filters[2]._cards[0] == interaction_a
    assert query._filters[2]._cards[1] == interaction_b3

    assert interaction_a._instance_number == 1
    assert interaction_b1._instance_number == 1
    assert interaction_b2._instance_number == 2
    assert interaction_b3._instance_number == 3

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_add_filters_with_patient(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    patient = Person.Patient()

    # When
    query.add_filters([patient])

    # Then
    assert len(query._filters) == 1
    exclusive_filter = query._filters[0]
    assert isinstance(exclusive_filter, _ExclusiveFilter)
    assert patient._instance_number == 0

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_add_filters_and_interaction_instance_number_is_updated_based_on_config_path_count(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    interaction_a = Interaction('nameA', 'configPathA')
    interaction_b1 = Interaction('nameB', 'configPathB')
    interaction_b2 = Interaction('nameB', 'configPathB')
    interaction_b3 = Interaction('nameB', 'configPathB')
    filter1 = [interaction_a, interaction_b1, interaction_b2]
    filter2 = [interaction_b3]

    # When
    query.add_filters(filter1)
    query.add_filters(filter2)

    # Then
    assert len(query._filters) == 2
    assert interaction_a._instance_number == 1
    assert interaction_b1._instance_number == 1
    assert interaction_b2._instance_number == 2
    assert interaction_b3._instance_number == 3

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_select_study_from_user_input(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('query')
    
    # When
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')

    # Then
    assert query._selectedStudyId == '9f0c44f1-8de9-4d4c-80c0-abcde134799b'
    assert query._study_name == 'first.study.name'
    assert query._study_config_id == 'first.pa.config.id'
    assert query._study_config_version == 'B'
    assert query._study_config_assigned_name == 'OMOP_GDM_PA_CONF'

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_clear_selected_study(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('query')

    # When
    query._clear_selected_study()

    # Then
    assert query._selectedStudyId == None

    # Teardown to reset env
    query._clear_study_config()

def test_clear_study_config(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    query = Query('query')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')

    # When
    query._clear_study_config()

    # Then
    assert query._study_config_id == None
    assert query._study_config_version == None
    assert query._study_config_assigned_name == None

    # Teardown
    query._clear_selected_study()


def test_get_cohort_with_config_selection(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    
    patient = Person.Patient()
    query.add_filters([patient])
    interaction = Interaction('name', 'configPath')
    query.add_filters([interaction])
    mock_patient_req_obj = {'type': 'patient'}
    mock_interaction_req_obj = {'type': 'interaction'}

    monkeypatch.setattr('pyqe.ql.person.Person.Patient._req_obj',
                        lambda x: mock_patient_req_obj)
    monkeypatch.setattr('pyqe.ql.interaction.Interaction._req_obj',
                        lambda x: mock_interaction_req_obj)

    # When
    cohort = query.get_cohort(['patient.attributes.pid'])

    # Then
    assert cohort == {
        'name': 'cohortName',
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b',
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [mock_patient_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }, {
                    'content': [mock_interaction_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value,
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [{
                'configPath': 'patient.attributes.pid',
                'order': '',
                'seq': 0
            }]
        }
    }

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_get_cohort_with_selected_config(setup, monkeypatch):
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))

    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])
    interaction = Interaction('name', 'configPath')
    query.add_filters([interaction])
    mock_patient_req_obj = {'type': 'patient'}
    mock_interaction_req_obj = {'type': 'interaction'}

    monkeypatch.setattr('pyqe.ql.person.Person.Patient._req_obj',
                        lambda x: mock_patient_req_obj)
    monkeypatch.setattr('pyqe.ql.interaction.Interaction._req_obj',
                        lambda x: mock_interaction_req_obj)

    # When
    cohort = query.get_cohort(['patient.attributes.pid'])

    # Then
    assert cohort == {
        'name': 'cohortName',
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b',
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [mock_patient_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }, {
                    'content': [mock_interaction_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value,
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [{
                'configPath': 'patient.attributes.pid',
                'order': '',
                'seq': 0
            }]
        }
    }

    # Teardown to reset env
    query._clear_selected_study()
    query._clear_study_config()


def test_get_patient_count_filter_with_config_selection(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1\n2'))

    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])
    interaction = Interaction('name', 'configPath')
    query.add_filters([interaction])
    mock_patient_req_obj = {'type': 'patient'}
    mock_interaction_req_obj = {'type': 'interaction'}

    monkeypatch.setattr('pyqe.ql.person.Person.Patient._req_obj',
                        lambda x: mock_patient_req_obj)
    monkeypatch.setattr('pyqe.ql.interaction.Interaction._req_obj',
                        lambda x: mock_interaction_req_obj)

    # When
    patient_count_filter = query.get_patient_count_filter()

    # Then
    assert patient_count_filter == {
        'filter': {
            'configMetadata': {
                'id': 'first.pa.config.id',
                'version': 'B'
            },
            'cards': {
                'content': [{
                    'content': [mock_patient_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }, {
                    'content': [mock_interaction_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            }
        },
        'axisSelection': [],
        'metadata': {'version': 3},
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b'
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_get_patient_count_filter_with_selected_config(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('2'))
    query = Query('cohortName')
    query.set_study('7eb1fc8d-5091-4b88-be49-bb1ba014cc99')
    patient = Person.Patient()
    query.add_filters([patient])
    interaction = Interaction('name', 'configPath')
    query.add_filters([interaction])
    mock_patient_req_obj = {'type': 'patient'}
    mock_interaction_req_obj = {'type': 'interaction'}

    monkeypatch.setattr('pyqe.ql.person.Person.Patient._req_obj',
                        lambda x: mock_patient_req_obj)
    monkeypatch.setattr('pyqe.ql.interaction.Interaction._req_obj',
                        lambda x: mock_interaction_req_obj)

    # When
    patient_count_filter = query.get_patient_count_filter()

    # Then
    assert patient_count_filter == {
        'filter': {
            'configMetadata': {
                'id': 'first.pa.config.id',
                'version': 'B'
            },
            'cards': {
                'content': [{
                    'content': [mock_patient_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }, {
                    'content': [mock_interaction_req_obj],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.OR.value
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            }
        },
        'axisSelection': [],
        'metadata': {'version': 3},
        'datasetId': '7eb1fc8d-5091-4b88-be49-bb1ba014cc99'
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_configure_columns_using_config_without_interactions(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])

    # When
    query._configure_columns()

    # Then
    assert query._column_config_paths == ['patient.attributes.age', 'patient.attributes.gender']
    assert query._patient_column_config_paths == [
        'patient.attributes.age', 'patient.attributes.gender']
    assert query._filter_attributes_config_paths_dict == {'Patient': {
        'Age': 'patient.attributes.age',
        'Gender': 'patient.attributes.gender',
    }}

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_configure_columns_using_config_with_interactions(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])

    # When
    query._configure_columns()

    # Then
    assert query._column_config_paths == ['patient.attributes.age', 'patient.attributes.gender']
    assert query._patient_column_config_paths == [
        'patient.attributes.age', 'patient.attributes.gender']
    assert query._filter_attributes_config_paths_dict == {
        'Patient': {
            'Age': 'patient.attributes.age',
            'Gender': 'patient.attributes.gender',
        }
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_generate_cohort_columns(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])
    query._configure_columns()

    # When
    cohort_columns = query._generate_cohort_columns(query._column_config_paths)

    # Then
    assert cohort_columns == [
        {'configPath': 'patient.attributes.age', 'order': '', 'seq': 0},
        {'configPath': 'patient.attributes.gender', 'order': '', 'seq': 1}]

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_get_cohort_with_all_columns(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])

    # When
    cohort = query.get_cohort()

    # Then
    assert cohort == {
        'name': 'cohortName',
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b',
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [{
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }],
                    'type': 'BooleanContainer',
                    'op': 'OR'
                }],
                'type': 'BooleanContainer',
                'op': 'AND'
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [
                {
                    'configPath': 'patient.attributes.age',
                    'order': '',
                    'seq': 0
                },
                {
                    'configPath': 'patient.attributes.gender',
                    'order': '',
                    'seq': 1
                }
            ]
        }
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_get_cohort_with_provided_columns(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])
    columns = [
        'patient.attributes.gender',
        'patient.interactions.visit.attributes.visitdate',
        'patient.interactions.conditionera.attributes.conditioneraid'
    ]

    # When
    cohort = query.get_cohort(columns)

    # Then
    assert cohort == {
        'name': 'cohortName',
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b',
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [{
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }],
                    'type': 'BooleanContainer',
                    'op': 'OR'
                }],
                'type': 'BooleanContainer',
                'op': 'AND'
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [
                {
                    'configPath': 'patient.attributes.gender',
                    'order': '',
                    'seq': 0
                },
                {
                    'configPath': 'patient.interactions.visit.attributes.visitdate',
                    'order': '',
                    'seq': 1
                },
                {
                    'configPath': 'patient.interactions.conditionera.attributes.conditioneraid',
                    'order': '',
                    'seq': 2
                }
            ]
        }
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_get_dataframe_cohort_with_selected_filter_card_columns(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))

    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])

    # When
    dataframe_cohort = query.get_dataframe_cohort()

    # Then
    assert dataframe_cohort == {
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [{
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }],
                    'type': 'BooleanContainer',
                    'op': 'OR'
                }],
                'type': 'BooleanContainer',
                'op': 'AND'
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [
                {
                    'configPath': 'patient.attributes.age',
                    'order': '',
                    'seq': 0
                },
                {
                    'configPath': 'patient.attributes.gender',
                    'order': '',
                    'seq': 1
                }
            ]
        },
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b'
    }
    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_get_dataframe_cohort_with_multiple_filter_cards_and_single_selected_filter_card_columns(setup, monkeypatch):
    # Given
    # Multiple inputs are separated via \n in StringIO
    monkeypatch.setattr('sys.stdin', StringIO('1\n1'))
    
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient_a = Person.Patient()
    patient_b = Person.Patient()
    interaction = Interaction('interaction', 'configPath')
    query.add_filters([patient_a, patient_b, interaction])

    # When
    dataframe_cohort = query.get_dataframe_cohort()

    # Then
    assert dataframe_cohort == {
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [{
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }, {
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }, {
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'interaction',
                        'configPath': 'configPath',
                        'instanceNumber': 1,
                        'instanceID': 'configPath.1',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }],
                    'type': 'BooleanContainer',
                    'op': 'OR'
                }],
                'type': 'BooleanContainer',
                'op': 'AND'
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [
                {
                    'configPath': 'patient.attributes.age',
                    'order': '',
                    'seq': 0
                },
                {
                    'configPath': 'patient.attributes.gender',
                    'order': '',
                    'seq': 1
                }
            ]
        },
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b'
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_get_dataframe_cohort_with_provided_columns(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])
    columns = [
        'patient.attributes.gender'
    ]

    # When
    dataframe_cohort = query.get_dataframe_cohort(columns)

    # Then
    assert dataframe_cohort == {
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [{
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }],
                    'type': 'BooleanContainer',
                    'op': 'OR'
                }],
                'type': 'BooleanContainer',
                'op': 'AND'
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [
                {
                    'configPath': 'patient.attributes.gender', 'order': '', 'seq': 0
                }
            ]
        },
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b'
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_get_dataframe_cohort_with_provided_columns_and_multiple_filter_cards_of_same_class(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient_a = Person.Patient()
    patient_b = Person.Patient()
    query.add_filters([patient_a, patient_b])
    columns = [
        'patient.attributes.gender',
        'patient.attributes.age'
    ]

    # When
    dataframe_cohort = query.get_dataframe_cohort(columns)

    # Then
    assert dataframe_cohort == {
        'cohortDefinition': {
            'cards': {
                'content': [{
                    'content': [{
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }, {
                        'type': 'FilterCard',
                        'inactive': False,
                        'name': 'Basic Data',
                        'configPath': 'patient',
                        'instanceNumber': 0,
                        'instanceID': 'patient',
                        'attributes': {
                            'content': [],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        },
                        'advanceTimeFilter': None
                    }],
                    'type': 'BooleanContainer',
                    'op': 'OR'
                }],
                'type': 'BooleanContainer',
                'op': 'AND'
            },
            'configData': {
                'configId': 'first.pa.config.id',
                'configVersion': 'B'
            },
            'axes': [],
            'guarded': True,
            'offset': 0,
            'columns': [{
                'configPath': 'patient.attributes.gender', 'order': '', 'seq': 0
            },
                {
                'configPath': 'patient.attributes.age', 'order': '', 'seq': 1
            }]
        },
        'datasetId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b'
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_only_valid_columns_returned_while_getting_dataframe_cohort_with_multiple_filter_card_classes_column_config_paths_added_to_query(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))

    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    query.add_filters([patient])
    columns = [
        'patient.attributes.gender',
        'patient.interactions.visit.attributes.visitdate',
        'patient.interactions.conditionera.attributes.conditioneraid'
    ]

    # When & Then
    dataframe_cohort = query.get_dataframe_cohort(columns)

    # Then
    assert dataframe_cohort == {
        "cohortDefinition": {
            "cards": {
                "content": [
                    {
                        "content": [
                            {
                                "type": "FilterCard",
                                "inactive": False,
                                "name": "Basic Data",
                                "configPath": "patient",
                                "instanceNumber": 0,
                                "instanceID": "patient",
                                "attributes": {
                                    "content": [],
                                    "type": "BooleanContainer",
                                    "op": "AND"
                                },
                                'advanceTimeFilter': None
                            }
                        ],
                        "type": "BooleanContainer",
                        "op": "OR"
                    }
                ],
                "type": "BooleanContainer",
                "op": "AND"
            },
            "configData": {
                "configId": "first.pa.config.id",
                "configVersion": "B"
            },
            "axes": [],
            "guarded": True,
            "offset": 0,
            "columns": [
                {
                    "configPath": "patient.attributes.gender",
                    "order": "",
                    "seq": 0
                }
            ]
        },
        "datasetId": '9f0c44f1-8de9-4d4c-80c0-abcde134799b'
    }

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()


def test_dictionary_returned_while_getting_entities_dataframe_cohort(setup, monkeypatch):
    # Given
    monkeypatch.setattr('sys.stdin', StringIO('1'))
    query = Query('cohortName')
    query.set_study('9f0c44f1-8de9-4d4c-80c0-abcde134799b')
    patient = Person.Patient()
    a_visit = Interaction('nameA', 'configPathA')
    query.add_filters([patient, a_visit])
    columns = [
        'patient.attributes.gender',
        'patient.interactions.visit.attributes.visitdate',
        'patient.interactions.conditionera.attributes.conditioneraid'
    ]

    # When & Then
    dataframe_cohort = query.get_entities_dataframe_cohort(columns)

    # Then
    assert list(dataframe_cohort.keys()) == ['Patient', 'Interaction', 'visit', 'conditionera']

    # Teardown
    query._clear_selected_study()
    query._clear_study_config()
def _get_mock_frontend_config(setup, pa_config, config_id, config_version):
    fe_config = [{
        'config': {
            'patient': {
                'attributes': {
                    'age': {
                        'name': 'Age'
                    },
                    'gender': {
                        'name': 'Gender'
                    },
                }
            }
        }
    }
    ]
    if config_id == 'config.id.with.interactions':
        fe_config[0]['config']['patient']['interactions'] = {}
        fe_config[0]['config']['patient']['interactions']['visit'] = {
            'name': 'Visit',
            'attributes': {
                'visittype': {
                    'name': 'Visit Type'
                },
                'visitdate': {
                    'name': 'Visit Date'
                }
            }
        }
        fe_config[0]['config']['patient']['interactions']['conditionera'] = {
            'name': 'Condition Era',
            'attributes': {
                'conditioneraid': {
                    'name': 'Condition Era Id'
                }
            }
        }
    return fe_config

def _get_mock_my_config(setup, selected_study_id):
    my_config = [{
        'config': {
            'patient': {
                'attributes': {
                    'age': {
                        'name': 'Age'
                    },
                    'gender': {
                        'name': 'Gender'
                    },
                }
            }
        }, 
        'meta': {
            'configId': 'first.pa.config.id',
            'configVersion': 'B',
            'configStatus': '',
            'configName': 'OMOP_GDM_PA_CONF',
            'dependentConfig':
                {
                    'configId': 'd10f83a0-ade9-4a33-90ae-cf760813953b',
                    'configVersion': '1'
                }
        }
    }]
    if my_config == 'config.id.with.interactions':
        my_config[0]['config']['patient']['interactions'] = {}
        my_config[0]['config']['patient']['interactions']['visit'] = {
            'name': 'Visit',
            'attributes': {
                'visittype': {
                    'name': 'Visit Type'
                },
                'visitdate': {
                    'name': 'Visit Date'
                }
            }
        }
        my_config[0]['config']['patient']['interactions']['conditionera'] = {
            'name': 'Condition Era',
            'attributes': {
                'conditioneraid': {
                    'name': 'Condition Era Id'
                }
            }
        }
    return my_config

def _get_mock_omop_frontend_config():
    return [{
        'meta': {
            'configId': 'some_config_id',
            'configVersion': 'A',
            'configStatus': '',
            'configName': 'SCHEMA OMOP PA',
            'configType': 'HC/MRI/PA',
            'dependentConfig': {
                'configId': 'some_dependent_cdm_config_id',
                'configVersion': '1'
            },
        },
        'config': {
            'patient': {
                'attributes': {
                    'County': {
                        'name': 'County'
                    },
                    'State': {
                        'name': 'State'
                    }
                },
                'interactions': {
                    'visit': {
                        'name': 'Visit',
                        'attributes': {
                            'visitid': {
                                'name': 'Visit occurrence Id'
                            },
                            'visitconceptcode': {
                                'name': 'Visit concept code'
                            },
                            'visitname': {
                                'name': 'Visit name'
                            },
                            'visittype': {
                                'name': 'Visit type'
                            },
                            'pid': {
                                'name': 'Patient Id'
                            },
                            'startdate': {
                                'name': 'Start Date'
                            },
                            'enddate': {
                                'name': 'End Date'
                            },
                            'visittypeconceptcode': {
                                'name': 'Visit type concept code'
                            }
                        }
                    }
                }
            }
        }
    }]
    
def _get_mock_study_list(study):
    return [
        {
            'databaseName': 'alpdev_pg',
            'id': '9f0c44f1-8de9-4d4c-80c0-abcde134799b',
            'dialect': 'postgres', 
            'vocabSchemaName': 'cdmvocab',
            'dashboards': [],
            'tags': [],
            'attributes': [],
            'tenant': {
                'id': 'e0348e4d-2e17-43f2-a3c6-efd752d17c23',
                'name': 'Tenant',
                'system': 'Research System'
            }, 
            'tokenStudyCode': 'first.study.name', 
            'studyDetail': {
                'name': 'first.study.name', 
                'description': '', 
                'summary': '', 
                'showRequestAccess': False
            }
        },
        {
            'databaseName': 'alpdev_pg',
            'id': '7eb1fc8d-5091-4b88-be49-bb1ba014cc99',
            'dialect': 'postgres', 
            'vocabSchemaName': 'cdmvocab',
            'dashboards': [],
            'tags': [],
            'attributes': [],
            'tenant': {
                'id': 'e0348e4d-2e17-43f2-a3c6-efd752d17c23',
                'name': 'Tenant',
                'system': 'Research System'
            }, 
            'tokenStudyCode': 'second.study.name', 
            'studyDetail': {
                'name': 'second.study.name', 
                'description': '', 
                'summary': '', 
                'showRequestAccess': False
            }
        }
    ]
