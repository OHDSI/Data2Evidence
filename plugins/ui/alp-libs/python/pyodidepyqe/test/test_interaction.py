import pytest
from typing import List
from pyqe.ql.interaction import Interaction, Interactions
from pyqe.ql.attribute import Attribute, Constraint, Expression
from pyqe.ql.filter_card import _ExclusiveFilter, FilterCard, ConceptSet
from pyqe.types.enum_types import QueryType, FilterInfo, LogicalOperator, Domain, CardType


class TestInteractions():
    def test_init_interaction(self):
        # When
        interaction = Interaction('name', 'interaction')

        # Then
        assert interaction._type == QueryType.FILTER_CARD.value
        assert interaction._inactive == False
        assert interaction._name == 'name'
        assert interaction._config_path == 'interaction'
        assert interaction._attributes == []
        assert interaction.get_instance_id() == 'interaction.1'

    def test_get_interaction_req_obj_without_attribute(self):
        # Given
        interaction = Interaction('name', 'interaction.without.attribute')

        # When
        req_obj = interaction._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'interaction.without.attribute',
            'instanceNumber': 1,
            'instanceID': 'interaction.without.attribute.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_get_excluded_interaction_req_obj_without_attribute(self):
        # Given
        interaction = Interaction('name', 'interaction.without.attribute', CardType.EXCLUDED)

        # When
        req_obj = interaction._req_obj()

        # Then
        expected: dict = {
            'content': [{
                'type': QueryType.FILTER_CARD.value,
                'inactive': False,
                'name': 'name',
                'configPath': 'interaction.without.attribute',
                'instanceNumber': 1,
                'instanceID': 'interaction.without.attribute.1',
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

    def test_init_visit(self):
        # When
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name')

        # Then
        assert visit._type == QueryType.FILTER_CARD.value
        assert visit._inactive == False
        assert visit._name == 'name'
        assert visit._config_path == 'patient.interactions.visit'
        assert visit._attributes == []
        assert visit.get_instance_id() == 'patient.interactions.visit.1'

    def test_get_visit_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name')

        # When
        req_obj = visit._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.visit',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.visit.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name')
        attribute = Attribute('config_path')

        # When
        visit.add_attribute(attribute)

        # Then
        self._assert_visit_variables(visit, 'config_path')

    def test_add_visit_id_attribute_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        visit = Interactions.Visit('name').add_visit_occurrence_id(constraints)

        # Then
        self._assert_visit_variables(visit, 'attributes.visitid', constraints)

    def test_add_visit_name_attribute_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        visit = Interactions.Visit('name').add_visit_name(constraints)

        # Then
        self._assert_visit_variables(visit, 'attributes.visitname', constraints)

    def test_add_visit_type_attribute_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        visit = Interactions.Visit('name').add_visit_type(constraints)

        # Then
        self._assert_visit_variables(visit, 'attributes.visittype', constraints)

    def test_add_patient_id_attribute_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        visit = Interactions.Visit('name').add_patient_id(constraints)

        # Then
        self._assert_visit_variables(visit, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        visit = Interactions.Visit('name').add_start_date(constraints)

        # Then
        self._assert_visit_variables(visit, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        visit = Interactions.Visit('name').add_end_date(constraints)

        # Then
        self._assert_visit_variables(visit, 'attributes.enddate', constraints)

    def test_get_visit_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name')
        attribute = Attribute('config_path')
        visit.add_attribute(attribute)

        # When
        req_obj = visit._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.visit',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.visit.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.visit.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.visit.1.config_path',
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

    def test_get_excluded_visit_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name', CardType.EXCLUDED)
        attribute = Attribute('config_path')
        visit.add_attribute(attribute)

        # When
        req_obj = visit._req_obj()

        # Then
        expected: dict = {
            'content': [{
                'type': QueryType.FILTER_CARD.value,
                'inactive': False,
                'name': 'name',
                'configPath': 'patient.interactions.visit',
                'instanceNumber': 1,
                'instanceID': 'patient.interactions.visit.1',
                'attributes': {
                    'content': [{
                        'configPath': 'patient.interactions.visit.config_path',
                        'type': QueryType.ATTRIBUTE.value,
                        'instanceID': 'patient.interactions.visit.1.config_path',
                        'constraints': {
                            'content': [],
                            'op': LogicalOperator.OR.value,
                            'type': QueryType.BOOLEAN_CONTAINER.value
                        }
                    }],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.AND.value
                }
            }],
            'type': 'BooleanContainer',
            'op': 'NOT'
        }
        assert req_obj == expected

    def test_add_concept_set_to_visit(self):
        # Given
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name')
        concept_set = ConceptSet('VisitConceptSet', Domain.VISIT, ['Outpatient', 'Inpatient'])

        # When
        visit.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(visit, 'name', 'patient.interactions.visit')
        self._assert_filter_card_concept_sets(visit._concept_sets, concept_set)

    def test_get_visit_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name')
        concept_set = ConceptSet('VisitConceptSet', Domain.VISIT, ['Outpatient', 'Inpatient'])
        visit.add_concept_set(concept_set)

        # When
        req_obj = visit._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.visit',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.visit.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.visit.attributes.visitconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.visit.1.attributes.visitconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Outpatient'
                            }],
                            'type': 'BooleanContainer',
                            'op': 'AND'
                        }, {
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Inpatient'
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

    def test_get_excluded_visit_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        visit = Interactions.Visit('name', CardType.EXCLUDED)
        concept_set = ConceptSet('VisitConceptSet', Domain.VISIT, ['Outpatient', 'Inpatient'])
        visit.add_concept_set(concept_set)

        # When
        req_obj = visit._req_obj()

        # Then
        expected: dict = {
            'content': [{
                'type': QueryType.FILTER_CARD.value,
                'inactive': False,
                'name': 'name',
                'configPath': 'patient.interactions.visit',
                'instanceNumber': 1,
                'instanceID': 'patient.interactions.visit.1',
                'attributes': {
                    'content': [{
                        'configPath': 'patient.interactions.visit.attributes.visitconceptid',
                        'type': QueryType.ATTRIBUTE.value,
                        'instanceID': 'patient.interactions.visit.1.attributes.visitconceptid',
                        'constraints': {
                            'content': [{
                                'content': [{
                                    'type': 'Expression',
                                    'operator': '=',
                                    'value': 'Outpatient'
                                }],
                                'type': 'BooleanContainer',
                                'op': 'AND'
                            }, {
                                'content': [{
                                    'type': 'Expression',
                                    'operator': '=',
                                    'value': 'Inpatient'
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
            }],
            'type': 'BooleanContainer',
            'op': 'NOT'
        }
        assert req_obj == expected

    def test_init_condition_occurrence(self):
        # When
        self._generate_omop_patient_interactions()
        condition_occurrence = Interactions.ConditionOccurrence('name')

        # Then
        assert condition_occurrence._type == QueryType.FILTER_CARD.value
        assert condition_occurrence._inactive == False
        assert condition_occurrence._name == 'name'
        assert condition_occurrence._config_path == 'patient.interactions.conditionoccurrence'
        assert condition_occurrence._attributes == []
        assert condition_occurrence.get_instance_id() == 'patient.interactions.conditionoccurrence.1'

    def test_get_condition_occurrence_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_occurrence = Interactions.ConditionOccurrence('name')

        # When
        req_obj = condition_occurrence._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.conditionoccurrence',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.conditionoccurrence.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_occurrence = Interactions.ConditionOccurrence('name')
        attribute = Attribute('config_path')

        # When
        condition_occurrence.add_attribute(attribute)

        # Then
        self._assert_condition_occurrence_variables(condition_occurrence, 'config_path')

    def test_add_condition_name_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence(
            'name').add_condition_name(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.conditionname', constraints)

    def test_add_condition_type_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence(
            'name').add_condition_type(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.conditiontype', constraints)

    def test_add_condition_source_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence(
            'name').add_condition_source(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.conditionsource', constraints)

    def test_add_condition_status_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence(
            'name').add_condition_status(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.conditionstatus', constraints)

    def test_add_patient_id_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence('name').add_patient_id(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence('name').add_start_date(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence('name').add_end_date(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.enddate', constraints)

    def test_add_visit_occurrence_id_attribute_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_occurrence = Interactions.ConditionOccurrence(
            'name').add_visit_occurrence_id(constraints)

        # Then
        self._assert_condition_occurrence_variables(
            condition_occurrence, 'attributes.visitoccurrenceid', constraints)

    def test_get_condition_occurrence_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_occurrence = Interactions.ConditionOccurrence('name')
        attribute = Attribute('config_path')
        condition_occurrence.add_attribute(attribute)

        # When
        req_obj = condition_occurrence._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.conditionoccurrence',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.conditionoccurrence.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.conditionoccurrence.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.conditionoccurrence.1.config_path',
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

    def test_add_concept_set_to_condition_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_occurrence = Interactions.ConditionOccurrence('name')
        concept_set = ConceptSet('ConditionConceptSet', Domain.CONDITION, ['Condition-A'])

        # When
        condition_occurrence.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            condition_occurrence, 'name', 'patient.interactions.conditionoccurrence')
        self._assert_filter_card_concept_sets(condition_occurrence._concept_sets, concept_set)

    def test_get_condition_occurrence_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_occurrence = Interactions.ConditionOccurrence('name')
        concept_set = ConceptSet('ConditionConceptSet', Domain.CONDITION, ['Condition-A'])
        condition_occurrence.add_concept_set(concept_set)

        # When
        req_obj = condition_occurrence._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.conditionoccurrence',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.conditionoccurrence.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.conditionoccurrence.attributes.conditionconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.conditionoccurrence.1.attributes.conditionconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Condition-A'
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

    def test_init_condition_era(self):
        # When
        self._generate_omop_patient_interactions()
        condition_era = Interactions.ConditionEra('name')

        # Then
        assert condition_era._type == QueryType.FILTER_CARD.value
        assert condition_era._inactive == False
        assert condition_era._name == 'name'
        assert condition_era._config_path == 'patient.interactions.conditionera'
        assert condition_era._attributes == []
        assert condition_era.get_instance_id() == 'patient.interactions.conditionera.1'

    def test_get_condition_era_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_era = Interactions.ConditionEra('name')

        # When
        req_obj = condition_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.conditionera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.conditionera.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_condition_era(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_era = Interactions.ConditionEra('name')
        attribute = Attribute('config_path')

        # When
        condition_era.add_attribute(attribute)

        # Then
        self._assert_condition_era_variables(condition_era, 'config_path')

    def test_add_condition_era_id_attribute_to_condition_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_era = Interactions.ConditionEra('name').add_condition_era_id(constraints)

        # Then
        self._assert_condition_era_variables(
            condition_era, 'attributes.conditioneraid', constraints)

    def test_add_patient_id_attribute_to_condition_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_era = Interactions.ConditionEra('name').add_patient_id(constraints)

        # Then
        self._assert_condition_era_variables(condition_era, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_condition_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_era = Interactions.ConditionEra('name').add_start_date(constraints)

        # Then
        self._assert_condition_era_variables(condition_era, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_condition_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_era = Interactions.ConditionEra('name').add_end_date(constraints)

        # Then
        self._assert_condition_era_variables(condition_era, 'attributes.enddate', constraints)

    def test_add_condition_name_attribute_to_condition_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        condition_era = Interactions.ConditionEra('name').add_condition_name(constraints)

        # Then
        self._assert_condition_era_variables(
            condition_era, 'attributes.conditionname', constraints)

    def test_get_condition_era_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_era = Interactions.ConditionEra('name')
        attribute = Attribute('config_path')
        condition_era.add_attribute(attribute)

        # When
        req_obj = condition_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.conditionera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.conditionera.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.conditionera.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.conditionera.1.config_path',
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

    def test_add_concept_set_to_condition_era(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_era = Interactions.ConditionEra('name')
        concept_set = ConceptSet('ConditionConceptSet', Domain.CONDITION, ['Condition-A'])

        # When
        condition_era.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            condition_era, 'name', 'patient.interactions.conditionera')
        self._assert_filter_card_concept_sets(condition_era._concept_sets, concept_set)

    def test_get_condition_era_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        condition_era = Interactions.ConditionEra('name')
        concept_set = ConceptSet('ConditionConceptSet', Domain.CONDITION, ['Condition-A'])
        condition_era.add_concept_set(concept_set)

        # When
        req_obj = condition_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.conditionera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.conditionera.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.conditionera.attributes.conditionconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.conditionera.1.attributes.conditionconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Condition-A'
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

    def test_init_procedure_occurrence(self):
        # When
        self._generate_omop_patient_interactions()
        procedure_occurrence = Interactions.ProcedureOccurrence('name')

        # Then
        assert procedure_occurrence._type == QueryType.FILTER_CARD.value
        assert procedure_occurrence._inactive == False
        assert procedure_occurrence._name == 'name'
        assert procedure_occurrence._config_path == 'patient.interactions.proc'
        assert procedure_occurrence._attributes == []
        assert procedure_occurrence.get_instance_id() == 'patient.interactions.proc.1'

    def test_get_procedure_occurrence_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        procedure_occurrence = Interactions.ProcedureOccurrence('name')

        # When
        req_obj = procedure_occurrence._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.proc',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.proc.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        procedure_occurrence = Interactions.ProcedureOccurrence('name')
        attribute = Attribute('config_path')

        # When
        procedure_occurrence.add_attribute(attribute)

        # Then
        self._assert_procedure_occurrence_variables(procedure_occurrence, 'config_path')

    def test_add_procedure_type_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence(
            'name').add_procedure_type(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.proctype', constraints)

    def test_add_patient_id_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence('name').add_patient_id(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.pid', constraints)

    def test_add_modifier_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence('name').add_modifier(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.modifier', constraints)

    def test_add_procedure_name_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence(
            'name').add_procedure_name(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.procname', constraints)

    def test_add_quantity_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence('name').add_quantity(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.qty', constraints)

    def test_add_procedure_date_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence(
            'name').add_procedure_date(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.procdate', constraints)

    def test_add_procedure_id_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence(
            'name').add_procedure_occurrence_id(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.procid', constraints)

    def test_add_procedure_date_time_attribute_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        procedure_occurrence = Interactions.ProcedureOccurrence(
            'name').add_procedure_date_time(constraints)

        # Then
        self._assert_procedure_occurrence_variables(
            procedure_occurrence, 'attributes.procdatetime', constraints)

    def test_get_procedure_occurrence_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        procedure_occurrence = Interactions.ProcedureOccurrence('name')
        attribute = Attribute('config_path')
        procedure_occurrence.add_attribute(attribute)

        # When
        req_obj = procedure_occurrence._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.proc',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.proc.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.proc.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.proc.1.config_path',
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

    def test_add_concept_set_to_procedure_occurrence(self):
        # Given
        self._generate_omop_patient_interactions()
        procedure_occurrence = Interactions.ProcedureOccurrence('name')
        concept_set = ConceptSet('ProcedureConceptSet', Domain.PROCEDURE, ['Procedure-A'])

        # When
        procedure_occurrence.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            procedure_occurrence, 'name', 'patient.interactions.proc')
        self._assert_filter_card_concept_sets(procedure_occurrence._concept_sets, concept_set)

    def test_get_procedure_occurrence_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        procedure_occurrence = Interactions.ProcedureOccurrence('name')
        concept_set = ConceptSet('ProcedureConceptSet', Domain.PROCEDURE, ['Procedure-A'])
        procedure_occurrence.add_concept_set(concept_set)

        # When
        req_obj = procedure_occurrence._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.proc',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.proc.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.proc.attributes.procconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.proc.1.attributes.procconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Procedure-A'
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

    def test_init_measurement(self):
        # When
        self._generate_omop_patient_interactions()
        measurement = Interactions.Measurement('name')

        # Then
        assert measurement._type == QueryType.FILTER_CARD.value
        assert measurement._inactive == False
        assert measurement._name == 'name'
        assert measurement._config_path == 'patient.interactions.measurement'
        assert measurement._attributes == []
        assert measurement.get_instance_id() == 'patient.interactions.measurement.1'

    def test_get_measurement_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        measurement = Interactions.Measurement('name')

        # When
        req_obj = measurement._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.measurement',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.measurement.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        measurement = Interactions.Measurement('name')
        attribute = Attribute('config_path')

        # When
        measurement.add_attribute(attribute)

        # Then
        assert measurement._type == QueryType.FILTER_CARD.value
        assert measurement._inactive == False
        assert measurement._name == 'name'
        assert measurement._config_path == 'patient.interactions.measurement'

        assert len(measurement._attributes) == 1
        attribute = measurement._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_numeric_value_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        measurement = Interactions.Measurement('name').add_value_numeric(constraints)

        # Then
        self._assert_measurement_variables(measurement, 'attributes.numval', constraints)

    def test_add_measurement_id_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        measurement = Interactions.Measurement('name').add_measurement_id(constraints)

        # Then
        self._assert_measurement_variables(measurement, 'attributes.measurementid', constraints)

    def test_add_patient_id_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        measurement = Interactions.Measurement('name').add_patient_id(constraints)

        # Then
        self._assert_measurement_variables(measurement, 'attributes.pid', constraints)

    def test_add_measurement_date_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        measurement = Interactions.Measurement('name').add_measurement_date(constraints)

        # Then
        self._assert_measurement_variables(measurement, 'attributes.measurementdate', constraints)

    def test_add_measurement_type_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        measurement = Interactions.Measurement('name').add_measurement_type(constraints)

        # Then
        self._assert_measurement_variables(measurement, 'attributes.measurementtype', constraints)

    def test_add_measurement_name_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        measurement = Interactions.Measurement('name').add_measurement_name(constraints)

        # Then
        self._assert_measurement_variables(measurement, 'attributes.measurementname', constraints)

    def test_add_text_value_attribute_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        measurement = Interactions.Measurement('name').add_value_text(constraints)

        # Then
        self._assert_measurement_variables(measurement, 'attributes.textval', constraints)

    def test_get_measurement_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        measurement = Interactions.Measurement('name')
        attribute = Attribute('config_path')
        measurement.add_attribute(attribute)

        # When
        req_obj = measurement._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.measurement',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.measurement.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.measurement.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.measurement.1.config_path',
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

    def test_add_concept_set_to_measurement(self):
        # Given
        self._generate_omop_patient_interactions()
        measurement = Interactions.Measurement('name')
        concept_set = ConceptSet('MeasurementConceptSet', Domain.MEASUREMENT, ['Measurement-A'])

        # When
        measurement.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            measurement, 'name', 'patient.interactions.measurement')
        self._assert_filter_card_concept_sets(measurement._concept_sets, concept_set)

    def test_get_measurement_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        measurement = Interactions.Measurement('name')
        concept_set = ConceptSet('MeasurementConceptSet', Domain.MEASUREMENT, ['Measurement-A'])
        measurement.add_concept_set(concept_set)

        # When
        req_obj = measurement._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.measurement',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.measurement.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.measurement.attributes.measurementconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.measurement.1.attributes.measurementconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Measurement-A'
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

    def test_init_device_exposure(self):
        # When
        self._generate_omop_patient_interactions()
        device_exposure = Interactions.DeviceExposure('name')

        # Then
        assert device_exposure._type == QueryType.FILTER_CARD.value
        assert device_exposure._inactive == False
        assert device_exposure._name == 'name'
        assert device_exposure._config_path == 'patient.interactions.deviceexposure'
        assert device_exposure._attributes == []
        assert device_exposure.get_instance_id() == 'patient.interactions.deviceexposure.1'

    def test_get_device_exposure_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        device_exposure = Interactions.DeviceExposure('name')

        # When
        req_obj = device_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.deviceexposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.deviceexposure.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        device_exposure = Interactions.DeviceExposure('name')
        attribute = Attribute('config_path')

        # When
        device_exposure.add_attribute(attribute)

        # Then
        assert device_exposure._type == QueryType.FILTER_CARD.value
        assert device_exposure._inactive == False
        assert device_exposure._name == 'name'
        assert device_exposure._config_path == 'patient.interactions.deviceexposure'

        assert len(device_exposure._attributes) == 1
        attribute = device_exposure._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_device_type_attribute_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        device_exposure = Interactions.DeviceExposure('name').add_device_type(constraints)

        # Then
        self._assert_device_exposure_variables(
            device_exposure, 'attributes.devicetypename', constraints)

    def test_add_device_exposure_id_attribute_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        device_exposure = Interactions.DeviceExposure('name').add_device_exposure_id(constraints)

        # Then
        self._assert_device_exposure_variables(
            device_exposure, 'attributes.deviceexposureid', constraints)

    def test_add_device_name_attribute_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        device_exposure = Interactions.DeviceExposure('name').add_device_name(constraints)

        # Then
        self._assert_device_exposure_variables(
            device_exposure, 'attributes.devicename', constraints)

    def test_add_patient_id_attribute_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        device_exposure = Interactions.DeviceExposure('name').add_patient_id(constraints)

        # Then
        self._assert_device_exposure_variables(device_exposure, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        device_exposure = Interactions.DeviceExposure('name').add_start_date(constraints)

        # Then
        self._assert_device_exposure_variables(
            device_exposure, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        device_exposure = Interactions.DeviceExposure('name').add_end_date(constraints)

        # Then
        self._assert_device_exposure_variables(device_exposure, 'attributes.enddate', constraints)

    def test_get_device_exposure_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        device_exposure = Interactions.DeviceExposure('name')
        attribute = Attribute('config_path')
        device_exposure.add_attribute(attribute)

        # When
        req_obj = device_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.deviceexposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.deviceexposure.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.deviceexposure.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.deviceexposure.1.config_path',
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

    def test_add_concept_set_to_device_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        device_exposure = Interactions.DeviceExposure('name')
        concept_set = ConceptSet('DeviceExposureConceptSet',
                                 Domain.DEVICE, ['Device-A'])

        # When
        device_exposure.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            device_exposure, 'name', 'patient.interactions.deviceexposure')
        self._assert_filter_card_concept_sets(device_exposure._concept_sets, concept_set)

    def test_get_device_exposure_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        device_exposure = Interactions.DeviceExposure('name')
        concept_set = ConceptSet('DeviceExposureConceptSet',
                                 Domain.DEVICE, ['Device-A'])
        device_exposure.add_concept_set(concept_set)

        # When
        req_obj = device_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.deviceexposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.deviceexposure.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.deviceexposure.attributes.deviceconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.deviceexposure.1.attributes.deviceconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Device-A'
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

    def test_init_drug_exposure(self):
        # When
        self._generate_omop_patient_interactions()
        drug_exposure = Interactions.DrugExposure('name')

        # Then
        assert drug_exposure._type == QueryType.FILTER_CARD.value
        assert drug_exposure._inactive == False
        assert drug_exposure._name == 'name'
        assert drug_exposure._config_path == 'patient.interactions.drugexposure'
        assert drug_exposure._attributes == []
        assert drug_exposure.get_instance_id() == 'patient.interactions.drugexposure.1'

    def test_get_drug_exposure_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_exposure = Interactions.DrugExposure('name')

        # When
        req_obj = drug_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.drugexposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.drugexposure.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_exposure = Interactions.DrugExposure('name')
        attribute = Attribute('config_path')

        # When
        drug_exposure.add_attribute(attribute)

        # Then
        assert drug_exposure._type == QueryType.FILTER_CARD.value
        assert drug_exposure._inactive == False
        assert drug_exposure._name == 'name'
        assert drug_exposure._config_path == 'patient.interactions.drugexposure'

        assert len(drug_exposure._attributes) == 1
        attribute = drug_exposure._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_days_supply_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_days_of_supply(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.dayssupply', constraints)

    def test_add_verbatim_end_date_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_verbatim_end_date(constraints)

        # Then
        self._assert_drug_exposure_variables(
            drug_exposure, 'attributes.verbatimenddate', constraints)

    def test_add_sig_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_sig(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.sig', constraints)

    def test_add_drug_exposure_id_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_drug_exposure_id(constraints)

        # Then
        self._assert_drug_exposure_variables(
            drug_exposure, 'attributes.drugexposureid', constraints)

    def test_add_route_name_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_route_name(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.routename', constraints)

    def test_add_lot_number_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_lot_number(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.lotnumber', constraints)

    def test_add_drug_name_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_drug_name(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.drugname', constraints)

    def test_add_patient_id_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_patient_id(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_start_date(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_end_date(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.enddate', constraints)

    def test_add_drug_type_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_drug_type(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.drugtype', constraints)

    def test_add_stop_reason_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_stop_reason(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.stopreason', constraints)

    def test_add_start_date_time_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_start_date_time(constraints)

        # Then
        self._assert_drug_exposure_variables(
            drug_exposure, 'attributes.startdatetime', constraints)

    def test_add_end_date_time_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_end_date_time(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.enddatetime', constraints)

    def test_add_refills_attribute_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_exposure = Interactions.DrugExposure('name').add_refills(constraints)

        # Then
        self._assert_drug_exposure_variables(drug_exposure, 'attributes.refills', constraints)

    def test_get_drug_exposure_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_exposure = Interactions.DrugExposure('name')
        attribute = Attribute('config_path')
        drug_exposure.add_attribute(attribute)

        # When
        req_obj = drug_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.drugexposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.drugexposure.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.drugexposure.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.drugexposure.1.config_path',
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

    def test_add_concept_set_to_drug_exposure(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_exposure = Interactions.DrugExposure('name')
        concept_set = ConceptSet('DrugExposureConceptSet',
                                 Domain.DRUG, ['Drug-A'])

        # When
        drug_exposure.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            drug_exposure, 'name', 'patient.interactions.drugexposure')
        self._assert_filter_card_concept_sets(drug_exposure._concept_sets, concept_set)

    def test_get_drug_exposure_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_exposure = Interactions.DrugExposure('name')
        concept_set = ConceptSet('DrugExposureConceptSet',
                                 Domain.DRUG, ['Drug-A'])
        drug_exposure.add_concept_set(concept_set)

        # When
        req_obj = drug_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.drugexposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.drugexposure.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.drugexposure.attributes.drugconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.drugexposure.1.attributes.drugconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Drug-A'
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

    def test_init_drug_era(self):
        # When
        self._generate_omop_patient_interactions()
        drug_era = Interactions.DrugEra('name')

        # Then
        assert drug_era._type == QueryType.FILTER_CARD.value
        assert drug_era._inactive == False
        assert drug_era._name == 'name'
        assert drug_era._config_path == 'patient.interactions.drugera'
        assert drug_era._attributes == []
        assert drug_era.get_instance_id() == 'patient.interactions.drugera.1'

    def test_get_drug_era_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_era = Interactions.DrugEra('name')

        # When
        req_obj = drug_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.drugera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.drugera.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_era = Interactions.DrugEra('name')
        attribute = Attribute('config_path')

        # When
        drug_era.add_attribute(attribute)

        # Then
        assert drug_era._type == QueryType.FILTER_CARD.value
        assert drug_era._inactive == False
        assert drug_era._name == 'name'
        assert drug_era._config_path == 'patient.interactions.drugera'

        assert len(drug_era._attributes) == 1
        attribute = drug_era._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_drug_exposure_count_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_era = Interactions.DrugEra('name').add_drug_exposure_count(constraints)

        # Then
        self._assert_drug_era_variables(drug_era, 'attributes.drugexpcount', constraints)

    def test_add_gap_days_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_era = Interactions.DrugEra('name').add_gap_days(constraints)

        # Then
        self._assert_drug_era_variables(drug_era, 'attributes.gapdays', constraints)

    def test_add_drug_era_id_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_era = Interactions.DrugEra('name').add_drug_era_id(constraints)

        # Then
        self._assert_drug_era_variables(drug_era, 'attributes.drugeraid', constraints)

    def test_add_drug_name_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_era = Interactions.DrugEra('name').add_drug_name(constraints)

        # Then
        self._assert_drug_era_variables(drug_era, 'attributes.drugname', constraints)

    def test_add_patient_id_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_era = Interactions.DrugEra('name').add_patient_id(constraints)

        # Then
        self._assert_drug_era_variables(drug_era, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_era = Interactions.DrugEra('name').add_start_date(constraints)

        # Then
        self._assert_drug_era_variables(drug_era, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        drug_era = Interactions.DrugEra('name').add_end_date(constraints)

        # Then
        self._assert_drug_era_variables(drug_era, 'attributes.enddate', constraints)

    def test_get_drug_era_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_era = Interactions.DrugEra('name')
        attribute = Attribute('config_path')
        drug_era.add_attribute(attribute)

        # When
        req_obj = drug_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.drugera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.drugera.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.drugera.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.drugera.1.config_path',
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

    def test_add_concept_set_to_drug_era(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_era = Interactions.DrugEra('name')
        concept_set = ConceptSet('DrugEraConceptSet',
                                 Domain.DRUG, ['Drug-A'])

        # When
        drug_era.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            drug_era, 'name', 'patient.interactions.drugera')
        self._assert_filter_card_concept_sets(drug_era._concept_sets, concept_set)

    def test_get_drug_era_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        drug_era = Interactions.DrugEra('name')
        concept_set = ConceptSet('DrugEraConceptSet',
                                 Domain.DRUG, ['Drug-A'])
        drug_era.add_concept_set(concept_set)

        # When
        req_obj = drug_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.drugera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.drugera.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.drugera.attributes.drugconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.drugera.1.attributes.drugconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Drug-A'
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

    def test_init_dose_era(self):
        # When
        self._generate_omop_patient_interactions()
        dose_era = Interactions.DoseEra('name')

        # Then
        assert dose_era._type == QueryType.FILTER_CARD.value
        assert dose_era._inactive == False
        assert dose_era._name == 'name'
        assert dose_era._config_path == 'patient.interactions.doseera'
        assert dose_era._attributes == []
        assert dose_era.get_instance_id() == 'patient.interactions.doseera.1'

    def test_get_dose_era_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        dose_era = Interactions.DoseEra('name')

        # When
        req_obj = dose_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.doseera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.doseera.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_dose_era(self):
        # Given
        self._generate_omop_patient_interactions()
        dose_era = Interactions.DoseEra('name')
        attribute = Attribute('config_path')

        # When
        dose_era.add_attribute(attribute)

        # Then
        assert dose_era._type == QueryType.FILTER_CARD.value
        assert dose_era._inactive == False
        assert dose_era._name == 'name'
        assert dose_era._config_path == 'patient.interactions.doseera'

        assert len(dose_era._attributes) == 1
        attribute = dose_era._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_dose_era_id_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        dose_era = Interactions.DoseEra('name').add_dose_era_id(constraints)

        # Then
        self._assert_dose_era_variables(dose_era, 'attributes.doseeraid', constraints)

    def test_add_dose_value_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        dose_era = Interactions.DoseEra('name').add_dose_value(constraints)

        # Then
        self._assert_dose_era_variables(dose_era, 'attributes.dosevalue', constraints)

    def test_add_patient_id_attribute_to_dose_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        dose_era = Interactions.DoseEra('name').add_patient_id(constraints)

        # Then
        self._assert_dose_era_variables(dose_era, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_dose_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        dose_era = Interactions.DoseEra('name').add_start_date(constraints)

        # Then
        self._assert_dose_era_variables(dose_era, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_dose_era(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        dose_era = Interactions.DoseEra('name').add_end_date(constraints)

        # Then
        self._assert_dose_era_variables(dose_era, 'attributes.enddate', constraints)

    def test_add_unit_name_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        dose_era = Interactions.DoseEra('name').add_unit(constraints)

        # Then
        self._assert_dose_era_variables(dose_era, 'attributes.unitname', constraints)

    def test_add_drug_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        dose_era = Interactions.DoseEra('name').add_drug(constraints)

        # Then
        self._assert_dose_era_variables(dose_era, 'attributes.drug', constraints)

    def test_get_dose_era_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        dose_era = Interactions.DoseEra('name')
        attribute = Attribute('config_path')
        dose_era.add_attribute(attribute)

        # When
        req_obj = dose_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.doseera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.doseera.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.doseera.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.doseera.1.config_path',
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

    def test_add_concept_set_to_dose_era(self):
        # Given
        self._generate_omop_patient_interactions()
        dose_era = Interactions.DoseEra('name')
        concept_set = ConceptSet('DoseEraConceptSet',
                                 Domain.UNIT, ['Unit-A'])

        # When
        dose_era.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            dose_era, 'name', 'patient.interactions.doseera')
        self._assert_filter_card_concept_sets(dose_era._concept_sets, concept_set)

    def test_get_dose_era_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        dose_era = Interactions.DoseEra('name')
        concept_set = ConceptSet('DoseEraConceptSet',
                                 Domain.UNIT, ['Unit-A'])
        dose_era.add_concept_set(concept_set)

        # When
        req_obj = dose_era._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.doseera',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.doseera.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.doseera.attributes.unitconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.doseera.1.attributes.unitconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Unit-A'
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

    def test_init_specimen(self):
        # When
        self._generate_omop_patient_interactions()
        specimen = Interactions.Specimen('name')

        # Then
        assert specimen._type == QueryType.FILTER_CARD.value
        assert specimen._inactive == False
        assert specimen._name == 'name'
        assert specimen._config_path == 'patient.interactions.specimen'
        assert specimen._attributes == []
        assert specimen.get_instance_id() == 'patient.interactions.specimen.1'

    def test_get_specimen_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        specimen = Interactions.Specimen('name')

        # When
        req_obj = specimen._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.specimen',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.specimen.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        specimen = Interactions.Specimen('name')
        attribute = Attribute('config_path')

        # When
        specimen.add_attribute(attribute)

        # Then
        assert specimen._type == QueryType.FILTER_CARD.value
        assert specimen._inactive == False
        assert specimen._name == 'name'
        assert specimen._config_path == 'patient.interactions.specimen'

        assert len(specimen._attributes) == 1
        attribute = specimen._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_specimen_date_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_specimen_date(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.specimendate', constraints)

    def test_add_specimen_date_time_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_specimen_date_time(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.specimendatetime', constraints)

    def test_add_quantity_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_quantity(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.quantity', constraints)

    def test_add_unit_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_unit(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.unit', constraints)

    def test_add_specimen_id_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_specimen_id(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.specimenid', constraints)

    def test_add_patient_id_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_patient_id(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.pid', constraints)

    def test_add_anatomic_site_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_anatomic_site(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.anatomicsite', constraints)

    def test_add_specimen_name_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_specimen_name(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.specimenname', constraints)

    def test_add_disease_status_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_disease_status(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.diseasestatus', constraints)

    def test_add_specimen_type_attribute_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        specimen = Interactions.Specimen('name').add_specimen_type(constraints)

        # Then
        self._assert_specimen_variables(specimen, 'attributes.specimentype', constraints)

    def test_get_specimen_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        specimen = Interactions.Specimen('name')
        attribute = Attribute('config_path')
        specimen.add_attribute(attribute)

        # When
        req_obj = specimen._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.specimen',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.specimen.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.specimen.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.specimen.1.config_path',
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

    def test_add_concept_set_to_specimen(self):
        # Given
        self._generate_omop_patient_interactions()
        specimen = Interactions.Specimen('name')
        concept_set = ConceptSet('SpecimenConceptSet',
                                 Domain.ANATOMIC_SITE, ['Anatomic-Site-A'])

        # When
        specimen.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            specimen, 'name', 'patient.interactions.specimen')
        self._assert_filter_card_concept_sets(specimen._concept_sets, concept_set)

    def test_get_specimen_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        specimen = Interactions.Specimen('name')
        concept_set = ConceptSet('SpecimenConceptSet',
                                 Domain.ANATOMIC_SITE, ['Anatomic-Site-A'])
        specimen.add_concept_set(concept_set)

        # When
        req_obj = specimen._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.specimen',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.specimen.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.specimen.attributes.anatomicsiteconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.specimen.1.attributes.anatomicsiteconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Anatomic-Site-A'
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

    def test_init_payer_plan_period(self):
        # When
        self._generate_omop_patient_interactions()
        payer_plan_period = Interactions.PayerPlanPeriod('name')

        # Then
        assert payer_plan_period._type == QueryType.FILTER_CARD.value
        assert payer_plan_period._inactive == False
        assert payer_plan_period._name == 'name'
        assert payer_plan_period._config_path == 'patient.interactions.ppperiod'
        assert payer_plan_period._attributes == []
        assert payer_plan_period.get_instance_id() == 'patient.interactions.ppperiod.1'

    def test_get_payer_plan_period_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        payer_plan_period = Interactions.PayerPlanPeriod('name')

        # When
        req_obj = payer_plan_period._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.ppperiod',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.ppperiod.1',
            'attributes': {
                    'content': [],
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_payer_plan_period(self):
        # Given
        self._generate_omop_patient_interactions()
        payer_plan_period = Interactions.PayerPlanPeriod('name')
        attribute = Attribute('config_path')

        # When
        payer_plan_period.add_attribute(attribute)

        # Then
        assert payer_plan_period._type == QueryType.FILTER_CARD.value
        assert payer_plan_period._inactive == False
        assert payer_plan_period._name == 'name'
        assert payer_plan_period._config_path == 'patient.interactions.ppperiod'

        assert len(payer_plan_period._attributes) == 1
        attribute = payer_plan_period._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_period_id_attribute_to_payer_plan_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        payer_plan_period = Interactions.PayerPlanPeriod(
            'name').add_payer_plan_period_id(constraints)

        # Then
        self._assert_payer_plan_period_variables(
            payer_plan_period, 'attributes.ppperiodid', constraints)

    def test_add_patient_id_attribute_to_payer_plan_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        payer_plan_period = Interactions.PayerPlanPeriod('name').add_patient_id(constraints)

        # Then
        self._assert_payer_plan_period_variables(payer_plan_period, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_payer_plan_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        payer_plan_period = Interactions.PayerPlanPeriod('name').add_start_date(constraints)

        # Then
        self._assert_payer_plan_period_variables(
            payer_plan_period, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_payer_plan_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        payer_plan_period = Interactions.PayerPlanPeriod('name').add_end_date(constraints)

        # Then
        self._assert_payer_plan_period_variables(
            payer_plan_period, 'attributes.enddate', constraints)

    def test_get_payer_plan_period_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        payer_plan_period = Interactions.PayerPlanPeriod('name')
        attribute = Attribute('config_path')
        payer_plan_period.add_attribute(attribute)

        # When
        req_obj = payer_plan_period._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.ppperiod',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.ppperiod.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.ppperiod.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.ppperiod.1.config_path',
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

    def test_raise_value_error_when_concept_set_is_added_in_payer_plan_period(self):
        # Given
        self._generate_omop_patient_interactions()
        payer_plan_period = Interactions.PayerPlanPeriod('name')
        concept_set = ConceptSet('UnitConceptSet', Domain.UNIT, [])

        # When & Then
        with pytest.raises(ValueError) as e:
            payer_plan_period.add_concept_set(concept_set)

    def test_init_observation_period(self):
        # When
        self._generate_omop_patient_interactions()
        observation_period = Interactions.ObservationPeriod('name')

        # Then
        assert observation_period._type == QueryType.FILTER_CARD.value
        assert observation_period._inactive == False
        assert observation_period._name == 'name'
        assert observation_period._config_path == 'patient.interactions.obsperiod'
        assert observation_period._attributes == []
        assert observation_period.get_instance_id() == 'patient.interactions.obsperiod.1'

    def test_get_observation_period_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        observation_period = Interactions.ObservationPeriod('name')

        # When
        req_obj = observation_period._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.obsperiod',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.obsperiod.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_observation_period(self):
        # Given
        self._generate_omop_patient_interactions()
        observation_period = Interactions.ObservationPeriod('name')
        attribute = Attribute('config_path')

        # When
        observation_period.add_attribute(attribute)

        # Then
        assert observation_period._type == QueryType.FILTER_CARD.value
        assert observation_period._inactive == False
        assert observation_period._name == 'name'
        assert observation_period._config_path == 'patient.interactions.obsperiod'

        assert len(observation_period._attributes) == 1
        attribute = observation_period._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_period_id_attribute_to_observation_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation_period = Interactions.ObservationPeriod(
            'name').add_observation_period_id(constraints)

        # Then
        self._assert_observation_period_variables(
            observation_period, 'attributes.obsperiodid', constraints)

    def test_add_period_type_attribute_to_observation_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation_period = Interactions.ObservationPeriod('name').add_period_type(constraints)

        # Then
        self._assert_observation_period_variables(
            observation_period, 'attributes.periodtype', constraints)

    def test_add_patient_id_attribute_to_observation_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation_period = Interactions.ObservationPeriod('name').add_patient_id(constraints)

        # Then
        self._assert_observation_period_variables(
            observation_period, 'attributes.pid', constraints)

    def test_add_start_date_attribute_to_observation_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation_period = Interactions.ObservationPeriod('name').add_start_date(constraints)

        # Then
        self._assert_observation_period_variables(
            observation_period, 'attributes.startdate', constraints)

    def test_add_end_date_attribute_to_observation_period(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation_period = Interactions.ObservationPeriod('name').add_end_date(constraints)

        # Then
        self._assert_observation_period_variables(
            observation_period, 'attributes.enddate', constraints)

    def test_get_observation_period_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        observation_period = Interactions.ObservationPeriod('name')
        attribute = Attribute('config_path')
        observation_period.add_attribute(attribute)

        # When
        req_obj = observation_period._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.obsperiod',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.obsperiod.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.obsperiod.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.obsperiod.1.config_path',
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

    def test_add_concept_set_to_observation_period(self):
        # Given
        self._generate_omop_patient_interactions()
        observation_period = Interactions.ObservationPeriod('name')
        concept_set = ConceptSet('ObservationPeriodConceptSet',
                                 Domain.OBSERVATION_PERIOD_TYPE, ['Observation-Period-Type-A'])

        # When
        observation_period.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            observation_period, 'name', 'patient.interactions.obsperiod')
        self._assert_filter_card_concept_sets(observation_period._concept_sets, concept_set)

    def test_get_observation_period_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        observation_period = Interactions.ObservationPeriod('name')
        concept_set = ConceptSet('ObservationPeriodConceptSet',
                                 Domain.OBSERVATION_PERIOD_TYPE, ['Observation-Period-Type-A'])
        observation_period.add_concept_set(concept_set)

        # When
        req_obj = observation_period._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.obsperiod',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.obsperiod.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.obsperiod.attributes.periodtypeconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.obsperiod.1.attributes.periodtypeconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Observation-Period-Type-A'
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

    def test_init_observation(self):
        # When
        self._generate_omop_patient_interactions()
        observation = Interactions.Observation('name')

        # Then
        assert observation._type == QueryType.FILTER_CARD.value
        assert observation._inactive == False
        assert observation._name == 'name'
        assert observation._config_path == 'patient.interactions.observation'
        assert observation._attributes == []
        assert observation.get_instance_id() == 'patient.interactions.observation.1'

    def test_get_observation_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        observation = Interactions.Observation('name')

        # When
        req_obj = observation._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.observation',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.observation.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        observation = Interactions.Observation('name')
        attribute = Attribute('config_path')

        # When
        observation.add_attribute(attribute)

        # Then
        assert observation._type == QueryType.FILTER_CARD.value
        assert observation._inactive == False
        assert observation._name == 'name'
        assert observation._config_path == 'patient.interactions.observation'

        assert len(observation._attributes) == 1
        attribute = observation._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_patient_id_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_patient_id(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.pid', constraints)

    def test_add_observation_type_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_observation_type(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.obstype', constraints)

    def test_add_numeric_value_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_value_numeric(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.numval', constraints)

    def test_add_verbatim_value_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_value_verbatim(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.verbatimtext', constraints)

    def test_add_text_value_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_value_text(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.textval', constraints)

    def test_add_qualifier_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_qualifier(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.qualifier', constraints)

    def test_add_observation_name_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_observation_name(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.obsname', constraints)

    def test_add_observation_id_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_observation_id(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.observationid', constraints)

    def test_add_observation_date_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_observation_date(constraints)

        # Then
        self._assert_observation_variables(observation, 'attributes.obsdate', constraints)

    def test_add_observation_date_time_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_observation_date_time(constraints)

       # Then
        self._assert_observation_variables(observation, 'attributes.obsdatetime', constraints)

    def test_add_unit_attribute_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        observation = Interactions.Observation('name').add_unit(constraints)

       # Then
        self._assert_observation_variables(observation, 'attributes.unit', constraints)

    def test_get_observation_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        observation = Interactions.Observation('name')
        attribute = Attribute('config_path')
        observation.add_attribute(attribute)

        # When
        req_obj = observation._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.observation',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.observation.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.observation.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.observation.1.config_path',
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

    def test_add_concept_set_to_observation(self):
        # Given
        self._generate_omop_patient_interactions()
        observation = Interactions.Observation('name')
        concept_set = ConceptSet('ObservationConceptSet',
                                 Domain.OBSERVATION, ['Observation-A'])

        # When
        observation.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            observation, 'name', 'patient.interactions.observation')
        self._assert_filter_card_concept_sets(observation._concept_sets, concept_set)

    def test_get_observation_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        observation = Interactions.Observation('name')
        concept_set = ConceptSet('ObservationConceptSet',
                                 Domain.OBSERVATION, ['Observation-A'])
        observation.add_concept_set(concept_set)

        # When
        req_obj = observation._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.observation',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.observation.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.observation.attributes.obsconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.observation.1.attributes.obsconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Observation-A'
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

    def test_init_death(self):
        # When
        self._generate_omop_patient_interactions()
        death = Interactions.Death('name')

        # Then
        assert death._type == QueryType.FILTER_CARD.value
        assert death._inactive == False
        assert death._name == 'name'
        assert death._config_path == 'patient.interactions.death'
        assert death._attributes == []
        assert death.get_instance_id() == 'patient.interactions.death.1'

    def test_get_death_req_obj_without_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        death = Interactions.Death('name')

        # When
        req_obj = death._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.death',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.death.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_death(self):
        # Given
        self._generate_omop_patient_interactions()
        death = Interactions.Death('name')
        attribute = Attribute('config_path')

        # When
        death.add_attribute(attribute)

        # Then
        assert death._type == QueryType.FILTER_CARD.value
        assert death._inactive == False
        assert death._name == 'name'
        assert death._config_path == 'patient.interactions.death'

        assert len(death._attributes) == 1
        attribute = death._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_patient_id_attribute_to_death(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        death = Interactions.Death('name').add_patient_id(constraints)

        # Then
        self._assert_death_variables(death, 'attributes.pid', constraints)

    def test_add_death_date_attribute_to_death(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        death = Interactions.Death('name').add_death_date(constraints)

        # Then
        self._assert_death_variables(death, 'attributes.deathdate', constraints)

    def test_add_death_date_time_attribute_to_death(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        death = Interactions.Death('name').add_death_date_time(constraints)

        # Then
        self._assert_death_variables(death, 'attributes.deathdatetime', constraints)

    def test_add_death_type_attribute_to_death(self):
        # Given
        self._generate_omop_patient_interactions()
        constraints = [Constraint()]

        # When
        death = Interactions.Death('name').add_death_type(constraints)

        # Then
        self._assert_death_variables(death, 'attributes.deathtype', constraints)

    def test_get_death_req_obj_with_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        death = Interactions.Death('name')
        attribute = Attribute('config_path')
        death.add_attribute(attribute)

        # When
        req_obj = death._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.death',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.death.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.death.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.death.1.config_path',
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

    def test_add_concept_set_to_death(self):
        # Given
        self._generate_omop_patient_interactions()
        death = Interactions.Death('name')
        concept_set = ConceptSet('DeathConceptSet',
                                 Domain.DEATH_TYPE, ['Death-Type-A'])

        # When
        death.add_concept_set(concept_set)

        # Then
        self._assert_filter_card_variables(
            death, 'name', 'patient.interactions.death')
        self._assert_filter_card_concept_sets(death._concept_sets, concept_set)

    def test_get_death_req_obj_with_concept_id_attribute(self):
        # Given
        self._generate_omop_patient_interactions()
        death = Interactions.Death('name')
        concept_set = ConceptSet('DeathConceptSet',
                                 Domain.DEATH_TYPE, ['Death-Type-A'])
        death.add_concept_set(concept_set)

        # When
        req_obj = death._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.death',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.death.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.death.attributes.deathtypeconceptid',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.death.1.attributes.deathtypeconceptid',
                    'constraints': {
                        'content': [{
                            'content': [{
                                'type': 'Expression',
                                'operator': '=',
                                'value': 'Death-Type-A'
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

    def test_init_vaccination(self):
        # When
        self._generate_vaccine_effectiveness_interactions()
        vaccination = Interactions.Vaccination('name')

        # Then
        assert vaccination._type == QueryType.FILTER_CARD.value
        assert vaccination._inactive == False
        assert vaccination._name == 'name'
        assert vaccination._config_path == 'patient.interactions.vaccination'
        assert vaccination._attributes == []
        assert vaccination.get_instance_id() == 'patient.interactions.vaccination.1'

    def test_get_vaccination_req_obj_without_attribute(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        vaccination = Interactions.Vaccination('name')

        # When
        req_obj = vaccination._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.vaccination',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.vaccination.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_vaccination(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        vaccination = Interactions.Vaccination('name')
        attribute = Attribute('config_path')

        # When
        vaccination.add_attribute(attribute)

        # Then
        assert vaccination._type == QueryType.FILTER_CARD.value
        assert vaccination._inactive == False
        assert vaccination._name == 'name'
        assert vaccination._config_path == 'patient.interactions.vaccination'

        assert len(vaccination._attributes) == 1
        attribute = vaccination._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_pneumococci_vaccinated_attribute_to_vaccination(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        constraints = [Constraint()]

        # When
        vaccination = Interactions.Vaccination('name').add_pneumococci_vaccinated(constraints)

        # Then
        self._assert_vaccination_variables(
            vaccination, 'attributes.pneumococciVaccinated', constraints)

    def test_add_pneumococci_vaccinated_doses_attribute_to_vaccination(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        constraints = [Constraint()]

        # When
        vaccination = Interactions.Vaccination(
            'name').add_pneumococci_vaccinated_doses(constraints)

        # Then
        self._assert_vaccination_variables(
            vaccination, 'attributes.pneumococciVaccinatedDoses', constraints)

    def test_add_pneumococci_vaccinated_location_attribute_to_vaccination(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        constraints = [Constraint()]

        # When
        vaccination = Interactions.Vaccination(
            'name').add_pneumococci_vaccinated_location(constraints)

        # Then
        self._assert_vaccination_variables(
            vaccination, 'attributes.pneumococciVaccinatedLocation', constraints)

    def test_add_pneumococci_vaccinated_date_attribute_to_vaccination(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        constraints = [Constraint()]

        # When
        vaccination = Interactions.Vaccination('name').add_pneumococci_vaccinated_date(constraints)

        # Then
        self._assert_vaccination_variables(
            vaccination, 'attributes.pneumococciVaccinatedDate', constraints)

    def test_get_vaccination_req_obj_with_attribute(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        vaccination = Interactions.Vaccination('name')
        attribute = Attribute('config_path')
        vaccination.add_attribute(attribute)

        # When
        req_obj = vaccination._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.vaccination',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.vaccination.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.vaccination.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.vaccination.1.config_path',
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

    def test_init_covid_exposure(self):
        # When
        self._generate_vaccine_effectiveness_interactions()
        covid_exposure = Interactions.CovidExposure('name')

        # Then
        assert covid_exposure._type == QueryType.FILTER_CARD.value
        assert covid_exposure._inactive == False
        assert covid_exposure._name == 'name'
        assert covid_exposure._config_path == 'patient.interactions.covidExposure'
        assert covid_exposure._attributes == []
        assert covid_exposure.get_instance_id() == 'patient.interactions.covidExposure.1'

    def test_get_covid_exposure_req_obj_without_attribute(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        covid_exposure = Interactions.CovidExposure('name')

        # When
        req_obj = covid_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.covidExposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.covidExposure.1',
            'attributes': {
                'content': [],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': None
        }
        assert req_obj == expected

    def test_add_attribute_to_covid_exposure(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        covid_exposure = Interactions.CovidExposure('name')
        attribute = Attribute('config_path')

        # When
        covid_exposure.add_attribute(attribute)

        # Then
        assert covid_exposure._type == QueryType.FILTER_CARD.value
        assert covid_exposure._inactive == False
        assert covid_exposure._name == 'name'
        assert covid_exposure._config_path == 'patient.interactions.covidExposure'

        assert len(covid_exposure._attributes) == 1
        attribute = covid_exposure._attributes[0]
        assert isinstance(attribute, Attribute)

    def test_add_covid_infected_outcome_attribute_to_covid_exposure(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        constraints = [Constraint()]

        # When
        covid_exposure = Interactions.CovidExposure('name').add_covid_infected_outcome(constraints)

        # Then
        self._assert_covid_exposure_variables(
            covid_exposure, 'attributes.covidInfectedOutcome', constraints)

    def test_add_covid_infected_attribute_to_covid_exposure(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        constraints = [Constraint()]

        # When
        covid_exposure = Interactions.CovidExposure('name').add_covid_infected(constraints)

        # Then
        self._assert_covid_exposure_variables(
            covid_exposure, 'attributes.covidInfected', constraints)

    def test_get_covid_exposure_req_obj_with_attribute(self):
        # Given
        self._generate_vaccine_effectiveness_interactions()
        covid_exposure = Interactions.CovidExposure('name')
        attribute = Attribute('config_path')
        covid_exposure.add_attribute(attribute)

        # When
        req_obj = covid_exposure._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.FILTER_CARD.value,
            'inactive': False,
            'name': 'name',
            'configPath': 'patient.interactions.covidExposure',
            'instanceNumber': 1,
            'instanceID': 'patient.interactions.covidExposure.1',
            'attributes': {
                'content': [{
                    'configPath': 'patient.interactions.covidExposure.config_path',
                    'type': QueryType.ATTRIBUTE.value,
                    'instanceID': 'patient.interactions.covidExposure.1.config_path',
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

    def _assert_visit_variables(self, visit, config_path: str,
                                constraints: List[Constraint] = []):
        self._assert_filter_card_variables(visit, 'name', 'patient.interactions.visit')
        self._assert_filter_card_attributes(visit._attributes, config_path, constraints)

    def _assert_condition_occurrence_variables(self, condition_occurrence, config_path: str,
                                               constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            condition_occurrence, 'name', 'patient.interactions.conditionoccurrence')
        self._assert_filter_card_attributes(
            condition_occurrence._attributes, config_path, constraints)

    def _assert_condition_era_variables(self, condition_era, config_path: str,
                                        constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            condition_era, 'name', 'patient.interactions.conditionera')
        self._assert_filter_card_attributes(condition_era._attributes, config_path, constraints)

    def _assert_procedure_occurrence_variables(self, procedure_occurrence, config_path: str,
                                               constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            procedure_occurrence, 'name', 'patient.interactions.proc')
        self._assert_filter_card_attributes(
            procedure_occurrence._attributes, config_path, constraints)

    def _assert_measurement_variables(self, measurement, config_path: str,
                                      constraints: List[Constraint] = []):
        self._assert_filter_card_variables(measurement, 'name', 'patient.interactions.measurement')
        self._assert_filter_card_attributes(measurement._attributes, config_path, constraints)

    def _assert_device_exposure_variables(self, device_exposure, config_path: str,
                                          constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            device_exposure, 'name', 'patient.interactions.deviceexposure')
        self._assert_filter_card_attributes(device_exposure._attributes, config_path, constraints)

    def _assert_drug_exposure_variables(self, drug_exposure, config_path: str,
                                        constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            drug_exposure, 'name', 'patient.interactions.drugexposure')
        self._assert_filter_card_attributes(drug_exposure._attributes, config_path, constraints)

    def _assert_drug_era_variables(self, drug_era, config_path: str,
                                   constraints: List[Constraint] = []):
        self._assert_filter_card_variables(drug_era, 'name', 'patient.interactions.drugera')
        self._assert_filter_card_attributes(drug_era._attributes, config_path, constraints)

    def _assert_dose_era_variables(self, dose_era, config_path: str,
                                   constraints: List[Constraint] = []):
        self._assert_filter_card_variables(dose_era, 'name', 'patient.interactions.doseera')
        self._assert_filter_card_attributes(dose_era._attributes, config_path, constraints)

    def _assert_specimen_variables(self, specimen, config_path: str,
                                   constraints: List[Constraint] = []):
        self._assert_filter_card_variables(specimen, 'name', 'patient.interactions.specimen')
        self._assert_filter_card_attributes(specimen._attributes, config_path, constraints)

    def _assert_payer_plan_period_variables(self, payer_plan_period, config_path: str,
                                            constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            payer_plan_period, 'name', 'patient.interactions.ppperiod')
        self._assert_filter_card_attributes(
            payer_plan_period._attributes, config_path, constraints)

    def _assert_observation_period_variables(self, observation_period, config_path: str,
                                             constraints: List[Constraint] = []):
        self._assert_filter_card_variables(
            observation_period, 'name', 'patient.interactions.obsperiod')
        self._assert_filter_card_attributes(
            observation_period._attributes, config_path, constraints)

    def _assert_observation_variables(self, observation, config_path: str,
                                      constraints: List[Constraint] = []):
        self._assert_filter_card_variables(observation, 'name', 'patient.interactions.observation')
        self._assert_filter_card_attributes(observation._attributes, config_path, constraints)

    def _assert_death_variables(self, death, config_path: str,
                                constraints: List[Constraint] = []):
        self._assert_filter_card_variables(death, 'name', 'patient.interactions.death')
        self._assert_filter_card_attributes(death._attributes, config_path, constraints)

    def _assert_vaccination_variables(self, death, config_path: str,
                                      constraints: List[Constraint] = []):
        self._assert_filter_card_variables(death, 'name', 'patient.interactions.vaccination')
        self._assert_filter_card_attributes(death._attributes, config_path, constraints)

    def _assert_covid_exposure_variables(self, death, config_path: str,
                                         constraints: List[Constraint] = []):
        self._assert_filter_card_variables(death, 'name', 'patient.interactions.covidExposure')
        self._assert_filter_card_attributes(death._attributes, config_path, constraints)

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

    def _generate_omop_patient_interactions(self):
        Interactions.generate_interaction_type_class(self._get_mock_omop_frontend_config())

    def _generate_vaccine_effectiveness_interactions(self):
        Interactions.generate_interaction_type_class(
            self._get_mock_vaccine_effectiveness_frontend_config())

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
