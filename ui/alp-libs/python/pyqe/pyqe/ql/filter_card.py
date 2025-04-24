import logging
from pyqe.ql.advanced_time_filter import AdvanceTimeFilter
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
from pyqe.api.concept_query import ConceptSet
from pyqe.types.enum_types import QueryType, FilterInfo, LogicalOperator, Domain, CardType
from pyqe.ql.attribute import *
from typing import List, Dict

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class _ExclusiveFilter():
    def __init__(self, cards: List['FilterCard'] = []):
        self._cards: list = cards

    def _req_obj(self) -> dict:
        card_content = []
        for card in self._cards:
            card_content.append(card._req_obj())

        _req_obj: dict = {
            'content': card_content,
            'type': QueryType.BOOLEAN_CONTAINER.value,
            'op': LogicalOperator.OR.value
        }
        return _req_obj


@decorator.attach_class_decorator(decorator.log_function, __name__)
class FilterCard():
    def __init__(self, name: str, config_path: str, card_type: CardType = CardType.INCLUDED):
        self._type: str = QueryType.FILTER_CARD.value
        self._inactive: bool = False
        self._name: str = name
        self._config_path: str = config_path
        self._attributes: List[Attribute] = []
        self._concept_sets: Dict[Domain, (List[str], List[str])] = {}
        self.card_type: CardType = card_type
        self._advance_time_filter: List[AdvanceTimeFilter] = []

    def add_attribute(self, attribute: Attribute):
        """Add attribute in filter"""
        self._attributes.append(attribute)

    def add_concept_set(self, concept_set: ConceptSet):
        """Add concept set in filter"""
        if concept_set.domain is None:
            raise ValueError('Domain is missing in concept set')
        self._concept_sets[concept_set.domain] = (concept_set.concept_ids,
                                                  concept_set.excluded_concept_ids)

    def add_patient_id(self, constraints: List[Constraint] = []):
        self.add_attribute(PatientId(constraints))
        return self

    def _create_attribute_content(self) -> list:
        attribute_content = []
        for attribute in self._attributes:
            if attribute._has_added_filter_config_path_and_instance_id is False:
                attribute._config_path = '.'.join([self._config_path, attribute._config_path])
                attribute._instance_id = '.'.join([self._instance_id, attribute._instance_id])
                attribute._has_added_filter_config_path_and_instance_id = True

            attribute_content.append(attribute._req_obj())

        for domain in self._concept_sets.keys():
            print(domain)
            attribute_content.append(self._create_concept_id_attribute(domain)._req_obj())

        return attribute_content

    def _create_concept_id_attribute(self, domain):
        constraints = []
        values = self._concept_sets[domain][0]
        excluded_values = self._concept_sets[domain][1]
        if len(values) > 0:
            for constraint_value in values:
                constraints.append(self._create_concept_id_constraint(
                    constraint_value, excluded_values))
        elif len(excluded_values) > 0:
            constraints.append(self._create_excluded_constraint(excluded_values))

        attribute = Attribute(
            f'attributes.{domain.value}conceptid', constraints)
        attribute._config_path = '.'.join(
            [self._config_path, attribute._config_path])
        attribute._instance_id = '.'.join(
            [self._instance_id, attribute._instance_id])
        return attribute

    def _create_concept_id_constraint(self, constraint_value, excluded_values: List[str]):
        concept_id_constraint = self._create_excluded_constraint(
            excluded_values).add(Expression(ComparisonOperator.EQUAL, constraint_value))
        return concept_id_constraint

    def _create_excluded_constraint(self, excluded_values: List[str]):
        excluded_constraint = Constraint()
        for excluded_constraint_value in excluded_values:
            excluded_constraint.add(Expression(
                ComparisonOperator.NOT_EQUAL, excluded_constraint_value))
        return excluded_constraint

    def _create_advance_time_filter(self) -> dict:
        timeFilter = None
        for index, advTimeFilter in enumerate(self._advance_time_filter):
            if index == 0:
                timeFilter = advTimeFilter.getReqObj()
            else:
                timeFilter['filters'].append(advTimeFilter.getFilter())
                timeFilter['request'][0]['and'].append(advTimeFilter.getRequest()[0]['and'][0])

        return timeFilter

    def _req_obj(self) -> dict:
        _req_obj: dict = {
            'type': self._type,
            'inactive': self._inactive,
            'name': self._name,
            'configPath': self._config_path,
            'instanceNumber': self._instance_number,
            'instanceID': self._instance_id,
            'attributes': {
                'content': self._create_attribute_content(),
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.AND.value
            },
            'advanceTimeFilter': self._create_advance_time_filter()
        }

        if self.card_type == CardType.INCLUDED:
            return _req_obj
        elif self.card_type == CardType.EXCLUDED:
            return {
                'content': [_req_obj],
                'type': QueryType.BOOLEAN_CONTAINER.value,
                'op': LogicalOperator.NOT.value
            }
        else:
            raise ValueError(f'Invalid filter card type: {self.card_type}')
