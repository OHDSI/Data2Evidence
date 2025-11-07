import pytest
from typing import List
from pyqe.ql.person import Person
from pyqe.ql.attribute import Attribute, Constraint, Expression
from pyqe.ql.filter_card import _ExclusiveFilter, FilterCard, ConceptSet
from pyqe.types.enum_types import QueryType, FilterInfo, LogicalOperator, Domain, CardType


class TestPerson():
    def test_init_patient(self):
        # When
        patient = self._get_omop_patient()

        # Then
        assert patient._type == QueryType.FILTER_CARD.value
        assert patient._inactive == False
        assert patient._name == FilterInfo.BASIC_DATA.value
        assert patient._config_path == FilterInfo.PATIENT.value
        assert patient._instance_id == FilterInfo.PATIENT.value
        assert patient._attributes == []

    def test_get_patient_req_obj_without_attribute(self):
        # Given
        patient = self._get_omop_patient()

        # When
        req_obj = patient._req_obj()

        # Then
        expected: dict = {
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
        }
        assert req_obj == expected

    def test_get_excluded_patient_req_obj_without_attribute(self):
        # Given
        patient = self._get_omop_patient(CardType.EXCLUDED)

        # When
        req_obj = patient._req_obj()

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
            'type': 'BooleanContainer',
            'op': 'NOT'
        }
        assert req_obj == expected

    def test_raise_value_error_while_getting_patient_req_obj_with_invalid_card_type(self):
        # Given
        patient = self._get_omop_patient(None)

        # When & Then
        with pytest.raises(ValueError):
            patient._req_obj()

    def test_add_attribute_to_patient(self):
        # Given
        patient = self._get_omop_patient()
        attribute = Attribute('config_path')

        # When
        patient.add_attribute(attribute)

        # Then
        self._assert_patient_variables(patient)

    def test_get_patient_req_obj_with_attribute(self):
        # Given
        patient = self._get_omop_patient()
        attribute = Attribute('config_path')
        patient.add_attribute(attribute)

        # When
        req_obj = patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.config_path',
                    'constraints': {
                        'content': [],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_get_excluded_patient_req_obj_with_attribute(self):
        # Given
        patient = self._get_omop_patient(CardType.EXCLUDED)
        attribute = Attribute('config_path')
        patient.add_attribute(attribute)

        # When
        req_obj = patient._req_obj()

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
                    'content': [{
                        'configPath': 'patient.config_path',
                        'type': QueryType.ATTRIBUTE.value,
                        'instanceID': 'patient.config_path',
                        'constraints': {
                            'content': [],
                            'op': LogicalOperator.OR.value,
                            'type': QueryType.BOOLEAN_CONTAINER.value
                        }
                    }],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.AND.value
                },
                'advanceTimeFilter': None
            }],
            'type': 'BooleanContainer',
            'op': 'NOT'
        }
        assert req_obj == expected

    def test_get_same_patient_req_obj_with_attribute_with_separate_req_obj_creation(self):
        # Given
        patient = self._get_omop_patient()
        attribute = Attribute('config_path')
        patient.add_attribute(attribute)

        # When
        first_req_obj = patient._req_obj()
        second_req_obj = patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.config_path',
                    'constraints': {
                        'content': [],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert first_req_obj == expected
        assert first_req_obj == second_req_obj

    def test_add_county_attribute_to_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        patient = self._get_omop_patient()
        patient.add_county(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(patient._attributes, 'attributes.County', constraints)

    def test_add_state_attribute_to_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        patient = self._get_omop_patient()
        patient.add_state(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(patient._attributes, 'attributes.State', constraints)

    def test_add_ethnicity_attribute_to_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        patient = self._get_omop_patient()
        patient.add_ethnicity(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(
            patient._attributes, 'attributes.Ethnicity', constraints)

    def test_add_gender_attribute_to_patient(self):
        # Given
        constraints = [Constraint]

        # When
        patient = self._get_omop_patient()
        patient.add_gender(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(patient._attributes, 'attributes.Gender', constraints)

    def test_add_race_attribute_to_patient(self):
        # Given
        constraints = [Constraint]

        # When
        patient = self._get_omop_patient()
        patient.add_race(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(patient._attributes, 'attributes.Race', constraints)

    def test_add_patient_id_attribute_to_patient(self):
        # Given
        constraints = [Constraint]

        # When
        patient = self._get_omop_patient()
        patient.add_patient_id(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(patient._attributes, 'attributes.pid', constraints)

    def test_add_patient_count_attribute_to_patient(self):
        # Given
        constraints = [Constraint]

        # When
        patient = self._get_omop_patient()
        patient.add_patient_count(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(patient._attributes, 'attributes.pcount', constraints)

    def test_add_month_of_birth_attribute_to_patient(self):
        # Given
        constraints = [Constraint]

        # When
        patient = self._get_omop_patient()
        patient.add_month_of_birth(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(
            patient._attributes, 'attributes.monthOfBirth', constraints)

    def test_add_year_of_birth_attribute_to_patient(self):
        # Given
        constraints = [Constraint]

        # When
        patient = self._get_omop_patient()
        patient.add_yearofbirth(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(
            patient._attributes, 'attributes.yearOfBirth', constraints)

    def test_add_date_of_birth_attribute_to_patient(self):
        # Given
        constraints = [Constraint]

        # When
        patient = self._get_omop_patient()
        patient.add_date_of_birth(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(
            patient._attributes, 'attributes.dateOfBirth', constraints)

    def test_add_date_of_death_attribute_to_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        patient = self._get_omop_patient()
        patient.add_date_of_death(constraints)

        # Then
        self._assert_patient_variables(patient, constraints)
        self._assert_filter_card_attributes(
            patient._attributes, 'attributes.dateOfDeath', constraints)

    def test_add_concept_set_to_patient(self):
        # Given
        patient = self._get_omop_patient()
        concept_set = ConceptSet('GenderConceptSet', Domain.GENDER, ['M', 'F'])

        # When
        patient.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(patient, FilterInfo.BASIC_DATA.value,
                                           FilterInfo.PATIENT.value)
        self._assert_filter_card_concept_sets(patient._concept_sets, concept_set)

    def test_add_concept_set_with_excluded_concept_id_to_patient(self):
        # Given
        patient = self._get_omop_patient()
        concept_set = ConceptSet('GenderConceptSet', Domain.GENDER, ['F'])
        concept_set.exclude_concept_id('M')

        # When
        patient.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(patient, FilterInfo.BASIC_DATA.value,
                                           FilterInfo.PATIENT.value)
        self._assert_filter_card_concept_sets(patient._concept_sets, concept_set)

    def test_get_patient_req_obj_with_concept_id_attribute(self):
        # Given
        patient = self._get_omop_patient()
        concept_set = ConceptSet('GenderConceptSet', Domain.GENDER, ['M', 'F'])
        patient.add_concept_set(concept_set)

        # When
        req_obj = patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.attributes.genderconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.attributes.genderconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'M'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }, {
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'F'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_get_patient_req_obj_with_concept_set_with_excluded_concept_id(self):
        # Given
        patient = self._get_omop_patient()
        concept_set = ConceptSet('GenderConceptSet', Domain.GENDER, ['F'])
        concept_set.exclude_concept_id('M')
        patient.add_concept_set(concept_set)

        # When
        req_obj = patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.attributes.genderconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.attributes.genderconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'M'
                            }, {
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'F'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_get_patient_req_obj_with_concept_set_with_one_concept_id_and_multiple_excluded_concept_ids(self):
        # Given
        patient = self._get_omop_patient()
        concept_set = ConceptSet('GenderConceptSet', Domain.GENDER, ['X'])
        concept_set.exclude_concept_id('M')
        concept_set.exclude_concept_id('F')
        patient.add_concept_set(concept_set)

        # When
        req_obj = patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.attributes.genderconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.attributes.genderconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'M'
                            }, {
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'F'
                            }, {
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'X'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_get_patient_req_obj_with_concept_set_with_multiple_concept_codes_and_multiple_excluded_concept_codes(self):
        # Given
        patient = self._get_omop_patient()
        concept_set = ConceptSet('GenderConceptSet', Domain.GENDER, ['X', 'Y'])
        concept_set.exclude_concept_id('M')
        concept_set.exclude_concept_id('F')
        patient.add_concept_set(concept_set)

        # When
        req_obj = patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.attributes.genderconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.attributes.genderconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'M'
                            }, {
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'F'
                            }, {
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'X'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }, {
                            'content': [{
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'M'
                            }, {
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'F'
                            }, {
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Y'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_get_patient_req_obj_with_concept_set_with_multiple_excluded_concept_codes(self):
        # Given
        patient = self._get_omop_patient()
        concept_set = ConceptSet('GenderConceptSet', Domain.GENDER)
        concept_set.exclude_concept_id('M')
        concept_set.exclude_concept_id('F')
        patient.add_concept_set(concept_set)

        # When
        req_obj = patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.attributes.genderconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.attributes.genderconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'M'
                            }, {
                                'type': 'Expression',
                                'operator': '<>',
                                'value': 'F'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_init_vaccine_effectivness_patient(self):
        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()

        # Then
        assert vaccine_effectivness_patient._type == QueryType.FILTER_CARD.value
        assert vaccine_effectivness_patient._inactive == False
        assert vaccine_effectivness_patient._name == FilterInfo.BASIC_DATA.value
        assert vaccine_effectivness_patient._config_path == FilterInfo.PATIENT.value
        assert vaccine_effectivness_patient._instance_id == FilterInfo.PATIENT.value
        assert vaccine_effectivness_patient._attributes == []

    def test_get_vaccine_effectivness_patient_req_obj_without_attribute(self):
        # Given
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()

        # When
        req_obj = vaccine_effectivness_patient._req_obj()

        # Then
        expected: dict = {
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
        }
        assert req_obj == expected

    def test_add_attribute_to_vaccine_effectivness_patient(self):
        # Given
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        attribute = Attribute('config_path')

        # When
        vaccine_effectivness_patient.add_attribute(attribute)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient)

    def test_get_vaccine_effectivness_patient_req_obj_with_attribute(self):
        # Given
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        attribute = Attribute('config_path')
        vaccine_effectivness_patient.add_attribute(attribute)

        # When
        req_obj = vaccine_effectivness_patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.config_path',
                    'constraints': {
                        'content': [],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_get_same_vaccine_effectivness_patient_req_obj_with_attribute_with_separate_req_obj_creation(self):
        # Given
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        attribute = Attribute('config_path')
        vaccine_effectivness_patient.add_attribute(attribute)

        # When
        first_req_obj = vaccine_effectivness_patient._req_obj()
        second_req_obj = vaccine_effectivness_patient._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': FilterInfo.BASIC_DATA.value,
            'configPath': FilterInfo.PATIENT.value,
            'instanceNumber': 0,
            'instanceID': FilterInfo.PATIENT.value,
            'attributes': {
                'content': [{
                    'configPath': 'patient.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.config_path',
                    'constraints': {
                        'content': [],
                        'op': LogicalOperator.OR.value,
                        'type': QueryType.BOOLEAN_CONTAINER.value
                    }
                }],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert first_req_obj == expected
        assert first_req_obj == second_req_obj

    def test_add_status_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_status(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.status', constraints)

    def test_add_blood_type_code_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_blood_type_code(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.bloodTypeCode', constraints)

    def test_add_birth_year_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_birth_year(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.birthYear', constraints)

    def test_add_education_code_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_education_code(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.educationCode', constraints)

    def test_add_professional_group_code_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_professional_group_code(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.professionalGroupCode', constraints)

    def test_add_patient_id_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_patient_id(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.pid', constraints)

    def test_add_patient_count_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_patient_count(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.pcount', constraints)

    def test_add_height_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_height(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.height', constraints)

    def test_add_weight_attribute_to_vaccine_effectivness_patient(self):
        # Given
        constraints = [Constraint()]

        # When
        vaccine_effectivness_patient = self._get_vaccine_effectiveness_patient()
        vaccine_effectivness_patient.add_weight(constraints)

        # Then
        self._assert_patient_variables(vaccine_effectivness_patient, constraints)
        self._assert_filter_card_attributes(
            vaccine_effectivness_patient._attributes, 'attributes.weight', constraints)

    def _assert_patient_variables(self, patient,
                                  constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            patient, FilterInfo.BASIC_DATA.value, FilterInfo.PATIENT.value)
        assert patient._instance_id == FilterInfo.PATIENT.value

    def _assert_filter_card_variables(self, filter_card,
                                      name, config_path):
        assert filter_card._type == QueryType.FILTER_CARD.value
        assert filter_card._inactive == False
        assert filter_card._name == name
        assert filter_card._config_path == config_path

    def _assert_filter_card_attributes(self, attributes: List[Attribute],
                                       config_path: str,
                                       constraints: List[Constraint]):
        assert len(attributes) == 1
        attribute = attributes[0]
        assert attribute._config_path == config_path
        exclusive_constraint = attribute._constraints
        assert exclusive_constraint._constraints == constraints

    def _assert_filter_card_concept_sets(self, concept_sets: dict,
                                         concept_set: ConceptSet):
        assert len(concept_sets) == 1
        assert concept_sets[concept_set.domain][0] == concept_set.concept_ids
        assert concept_sets[concept_set.domain][1] == concept_set.excluded_concept_ids

    def _get_omop_patient(self, is_included: CardType = CardType.INCLUDED):
        Person.generate_patient_class(self._get_mock_omop_frontend_config())
        return Person.Patient(is_included)

    def _get_vaccine_effectiveness_patient(self):
        Person.generate_patient_class(self._get_mock_vaccine_effectiveness_frontend_config())
        return Person.Patient()

    def _get_mock_omop_frontend_config(self):
        return {
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
                        },
                        'Ethnicity': {
                            'name': 'Ethnicity'
                        },
                        'Gender': {
                            'name': 'Gender'
                        },
                        'Race': {
                            'name': 'Race'
                        },
                        'pid': {
                            'name': 'Patient ID'
                        },
                        'pcount': {
                            'name': 'Patient Count'
                        },
                        'monthOfBirth': {
                            'name': 'Month of Birth'
                        },
                        'yearOfBirth': {
                            'name': 'Year of Birth'
                        },
                        'dateOfBirth': {
                            'name': 'Date of Birth'
                        },
                        'dateOfDeath': {
                            'name': 'Date of Death'
                        },
                        'ethnicityconceptcode': {
                            'name': 'Ethnicity concept code'
                        },
                        'genderconceptcode': {
                            'name': 'Gender concept code'
                        },
                        'raceconceptcode': {
                            'name': 'Race concept code'
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
                        },
                        'specimen': {
                            'name': 'Specimen',
                            'attributes': {
                                'specimendate': {
                                    'name': 'Specimen Date'
                                },
                                'specimendatetime': {
                                    'name': 'Specimen Date/Time'
                                },
                                'quantity': {
                                    'name': 'Quantity'
                                },
                                'unit': {
                                    'name': 'Unit'
                                },
                                'specimenid': {
                                    'name': 'Specimen Id'
                                },
                                'specimenconceptcode': {
                                    'name': 'Specimen concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'anatomicsite': {
                                    'name': 'Anatomic site'
                                },
                                'specimenname': {
                                    'name': 'Specimen name'
                                },
                                'diseasestatus': {
                                    'name': 'Disease status'
                                },
                                'specimentype': {
                                    'name': 'Specimen type'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                },
                                'anatomicsiteconceptcode': {
                                    'name': 'Anatomic site concept code'
                                },
                                'diseasestatusconceptcode': {
                                    'name': 'Disease status concept code'
                                },
                                'specimentypeconceptcode': {
                                    'name': 'Specimen type concept code'
                                }
                            }
                        },
                        'proc': {
                            'name': 'Procedure Occurrence',
                            'attributes': {
                                'proctype': {
                                    'name': 'Procedure type'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'modifier': {
                                    'name': 'Modifier'
                                },
                                'procname': {
                                    'name': 'Procedure name'
                                },
                                'qty': {
                                    'name': 'Quantity'
                                },
                                'procdate': {
                                    'name': 'Procedure Date'
                                },
                                'procid': {
                                    'name': 'Procedure Occurrence Id'
                                },
                                'procconceptcode': {
                                    'name': 'Procedure concept code'
                                },
                                'procdatetime': {
                                    'name': 'Procedure Date/Time'
                                },
                                'proctypeconceptcode': {
                                    'name': 'Procedure type concept code'
                                },
                                'modifierconceptcode': {
                                    'name': 'Modifier concept code'
                                }
                            }
                        },
                        'ppperiod': {
                            'name': 'Payer Plan Period',
                            'attributes': {
                                'ppperiodid': {
                                    'name': 'Payer Plan Period Id'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                }
                            }
                        },
                        'obsperiod': {
                            'name': 'Observation Period',
                            'attributes': {
                                'obsperiodid': {
                                    'name': 'Observation period Id'
                                },
                                'periodtypeconceptcode': {
                                    'name': 'Observation period type concept code'
                                },
                                'periodtype': {
                                    'name': 'Period type'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                }
                            }
                        },
                        'observation': {
                            'name': 'Observation',
                            'attributes': {
                                'obstype': {
                                    'name': 'Observation type'
                                },
                                'numval': {
                                    'name': 'Value (numeric)'
                                },
                                'verbatimtext': {
                                    'name': 'Value (verbatim)'
                                },
                                'textval': {
                                    'name': 'Value (text)'
                                },
                                'qualifier': {
                                    'name': 'Qualifier'
                                },
                                'obsname': {
                                    'name': 'Observation Name'
                                },
                                'observationid': {
                                    'name': 'Observation Id'
                                },
                                'obsconceptcode': {
                                    'name': 'Observation concept code'
                                },
                                'obsdate': {
                                    'name': 'Observation Date'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'obsdatetime': {
                                    'name': 'Observation Date/Time'
                                },
                                'unit': {
                                    'name': 'Unit'
                                },
                                'obstypeconceptcode': {
                                    'name': 'Observation type concept code'
                                },
                                'valueasconceptcode': {
                                    'name': 'Value as concept code'
                                },
                                'qualifierconceptcode': {
                                    'name': 'Qualifier concept code'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                }
                            }
                        },
                        'measurement': {
                            'name': 'Measurement',
                            'attributes': {
                                'textval': {
                                    'name': 'Value (text)'
                                },
                                'measurementid': {
                                    'name': 'Measurement Id'
                                },
                                'measurementconceptcode': {
                                    'name': 'Measurement concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'measurementdate': {
                                    'name': 'Measurement date'
                                },
                                'measurementtype': {
                                    'name': 'Measurement type'
                                },
                                'measurementname': {
                                    'name': 'Measurement name'
                                },
                                'numval': {
                                    'name': 'Value (numeric)'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                },
                                'valueasconceptcode': {
                                    'name': 'Value as concept code'
                                },
                                'measurementtypeconceptcode': {
                                    'name': 'Measurement type concept code'
                                }
                            }
                        },
                        'drugexposure': {
                            'name': 'Drug Exposure',
                            'attributes': {
                                'dayssupply': {
                                    'name': 'Days of supply'
                                },
                                'verbatimenddate': {
                                    'name': 'Verbatim End Date'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'sig': {
                                    'name': 'Sig'
                                },
                                'drugexposureid': {
                                    'name': 'Drug Exposure Id'
                                },
                                'drugconceptcode': {
                                    'name': 'Drug concept code'
                                },
                                'routename': {
                                    'name': 'Route Name'
                                },
                                'lotnumber': {
                                    'name': 'Lot Number'
                                },
                                'drugname': {
                                    'name': 'Drug Name'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'drugtype': {
                                    'name': 'Drug Type'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'stopreason': {
                                    'name': 'Stop Reason'
                                },
                                'startdatetime': {
                                    'name': 'Start Date/Time'
                                },
                                'refills': {
                                    'name': 'Refills'
                                },
                                'enddatetime': {
                                    'name': 'End Date/Time'
                                },
                                'routeconceptcode': {
                                    'name': 'Route concept code'
                                },
                                'drugtypeconceptcode': {
                                    'name': 'Drug Type concept code'
                                }
                            }
                        },
                        'drugera': {
                            'name': 'Drug Era',
                            'attributes': {
                                'drugexpcount': {
                                    'name': 'Drug Exposure Count'
                                },
                                'gapdays': {
                                    'name': 'Gap Days'
                                },
                                'drugeraid': {
                                    'name': 'Drug Era Id'
                                },
                                'drugconceptcode': {
                                    'name': 'Drug concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'drugname': {
                                    'name': 'Drug Name'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                }
                            }
                        },
                        'doseera': {
                            'name': 'Dose Era',
                            'attributes': {
                                'doseeraid': {
                                    'name': 'Dose Era Id'
                                },
                                'drugconceptcode': {
                                    'name': 'Drug concept code'
                                },
                                'dosevalue': {
                                    'name': 'Dose Value'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'drug': {
                                    'name': 'Drug'
                                },
                                'unitname': {
                                    'name': 'Unit'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                }
                            }
                        },
                        'deviceexposure': {
                            'name': 'Device Exposure',
                            'attributes': {
                                'devicetypename': {
                                    'name': 'Device Type'
                                },
                                'deviceconceptcode': {
                                    'name': 'Device concept code'
                                },
                                'deviceexposureid': {
                                    'name': 'Device Exposure Id'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'devicename': {
                                    'name': 'Device Name'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'devicetypeconceptcode': {
                                    'name': 'Device Type concept code'
                                }
                            }
                        },
                        'death': {
                            'name': 'Death',
                            'attributes': {
                                'deathdate': {
                                    'name': 'Death Date'
                                },
                                'deathdatetime': {
                                    'name': 'Death Date/Time'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'deathtypeconceptcode': {
                                    'name': 'Death Type concept code'
                                },
                                'deathtype': {
                                    'name': 'Death Type'
                                }
                            }
                        },
                        'conditionoccurrence': {
                            'name': 'Condition Occurrence',
                            'attributes': {
                                'conditionoccurrenceid': {
                                    'name': 'Condition Occurrence Id'
                                },
                                'condconceptcode': {
                                    'name': 'Condition concept code'
                                },
                                'conditionname': {
                                    'name': 'Condition Name'
                                },
                                'conditiontype': {
                                    'name': 'Condition Type'
                                },
                                'conditionsource': {
                                    'name': 'Condition Source'
                                },
                                'conditionstatus': {
                                    'name': 'Condition Status'
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
                                'visitoccurrenceid': {
                                    'name': 'Visit Occurrence Id'
                                },
                                'conditiontypeconceptcode': {
                                    'name': 'Condition Type concept code'
                                },
                                'conditionsourceconceptcode': {
                                    'name': 'Condition Source concept code'
                                },
                                'conditionstatusconceptcode': {
                                    'name': 'Condition Status concept code'
                                }
                            }
                        },
                        'conditionera': {
                            'name': 'Condition Era',
                            'attributes': {
                                'conditioneraid': {
                                    'name': 'Condition Era Id'
                                },
                                'condconceptcode': {
                                    'name': 'Condition concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'count': {
                                    'name': 'Condition Occurrence Count'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'conditionname': {
                                    'name': 'Condition Name'
                                }
                            }
                        }
                    }
                }
            }
        }

    def _get_mock_vaccine_effectiveness_frontend_config(self):
        return {
            'meta': {
                'configId': 'some_config_id',
                'configVersion': 'A',
                'configStatus': '',
                'configName': 'VaccineEffectiveness PA',
                'configType': 'HC/MRI/PA',
                'dependentConfig': {
                    'configId': 'some_dependent_cdm_config_id',
                    'configVersion': '47'
                }
            },
            'config': {
                'patient': {
                    'attributes': {
                        'status': {
                            'name': 'Status'
                        },
                        'bloodTypeCode': {
                            'name': 'Blood Type Code'
                        },
                        'birthYear': {
                            'name': 'Birth Year'
                        },
                        'educationCode': {
                            'name': 'Education Code'
                        },
                        'professionalGroupCode': {
                            'name': 'Professional Group Code'
                        },
                        'pid': {
                            'name': 'Patient ID'
                        },
                        'pcount': {
                            'name': 'Patient Count'
                        },
                        'height': {
                            'name': 'Height'
                        },
                        'weight': {
                            'name': 'Weight'
                        }
                    },
                    'interactions': {
                        'vaccination': {
                            'name': 'Vaccination',
                            'attributes': {
                                'pneumococciVaccinated': {
                                    'name': 'Pneumococci Vaccinated'
                                },
                                'pneumococciVaccinatedDoses': {
                                    'name': 'Pneumococci Vaccinated Doses'
                                },
                                'pneumococciVaccinatedLocation': {
                                    'name': 'Pneumococci Vaccinated Location'
                                },
                                'pneumococciVaccinatedDate': {
                                    'name': 'Pneumococci Vaccinated Date'
                                }
                            }
                        },
                        'covidExposure': {
                            'name': 'Covid Exposure',
                            'attributes': {
                                'covidInfectedOutcome': {
                                    'name': 'Covid Infected Outcome'
                                },
                                'covidInfected': {
                                    'name': 'Covid Infected'
                                }
                            }
                        }
                    }
                }
            }
        }
