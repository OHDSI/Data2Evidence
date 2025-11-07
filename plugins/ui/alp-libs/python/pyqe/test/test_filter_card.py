import pytest
from pyqe.ql.person import Person
from pyqe.ql.filter_card import _ExclusiveFilter, FilterCard, ConceptSet
from pyqe.types.enum_types import QueryType, FilterInfo, LogicalOperator, Domain


class TestFilterCard():
    def test_init_exclusive_filter(self):
        # Given
        filter_card = FilterCard('name', 'config_path')

        # When
        exclusive_filter = _ExclusiveFilter([filter_card])

        # Then
        assert exclusive_filter._cards[0] == filter_card

    def test_get_exclusive_filter_req_obj(self):
        # Given
        patient = self._get_omop_patient()
        exclusive_filter = _ExclusiveFilter([patient])

        # When
        req_obj = exclusive_filter._req_obj()

        # Then
        expected: dict = {
            'content': [{
                'type': QueryType.FILTER_CARD.value,
                'inactive': False,
                'name': FilterInfo.BASIC_DATA.value,
                'configPath': FilterInfo.PATIENT.value,
                'instanceNumber': 0,
                'instanceID': FilterInfo.PATIENT.value,
                'attributes': {
                    'content': [],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.AND.value
                },
                'advanceTimeFilter': None
            }],
            'type': QueryType.BOOLEAN_CONTAINER.value,
            'op': LogicalOperator.OR.value
        }
        assert req_obj == expected

    def test_init_filter_card(self):
        # When
        filter_card = FilterCard('name', 'config_path')

        # Then
        assert filter_card._type == QueryType.FILTER_CARD.value
        assert filter_card._inactive == False
        assert filter_card._name == 'name'
        assert filter_card._config_path == 'config_path'
        assert filter_card._attributes == []
        assert filter_card._advance_time_filter == []

    def test_raise_value_error_when_concept_set_with_none_domain_is_added_in_filter_card(self):
        # Given
        filter_card = FilterCard('name', 'config_path')
        concept_set = ConceptSet('NoneConceptSet', None, [])

        # When & Then
        with pytest.raises(ValueError) as e:
            filter_card.add_concept_set(concept_set)

    def _get_omop_patient(self):
        Person.generate_patient_class(self._get_mock_omop_frontend_config())
        return Person.Patient()

    def _get_mock_omop_frontend_config(self):
        return [
            {
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
        }
        ]
