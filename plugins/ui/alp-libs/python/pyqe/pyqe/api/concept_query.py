import logging
import json
from typing import List, Dict, Optional
from pyqe.api.base import _AuthApi
from pyqe.types.enum_types import Domain
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class ConceptQuery(_AuthApi):
    """Query client for OMOP concept functions"""

    def __init__(self):
        super().__init__()

    def get_standard_concept_ids(self, concept_code: str, vocabulary_id: str = None) -> str:
        """Get standard concept id based on provided non-standard concept code & vocabulary ID

        Args:
            concept_code: String value of non-standard concept code

            vocabulary_id: String value of vocabulary id of provided non-standard concept code
        """
        params = {
            'conceptCode': concept_code,
            'vocabularyId': vocabulary_id
        }

        response = self._get(f'/analytics-svc/api/services/standard-concept-ids', params=params)
        json_response = json.loads(response.text)
        concept_id_list = json_response['concept_id']

        return concept_id_list

    def get_descendant_concept_ids(self, concept_id: str) -> List[str]:
        """Get list of standard descendant concept ids based on provided concept id

        Args:
            concept_id: String value of concept id
        """
        params = {
            'conceptId': concept_id
        }
        response = self._get(f'/analytics-svc/api/services/descendant-concepts', params=params)
        json_response = json.loads(response.text)
        concepts = json_response['descendants']
        if len(concepts) > 0:
            return [concept['conceptId'] for concept in concepts]
        else:
            raise ValueError(
                f'No descendant standard concept id found for concept id: {concept_id}')


@decorator.attach_class_decorator(decorator.log_function, __name__)
class ConceptSet:
    """Defined set of unique concept ids for a domain which can be included in :py:class:`FilterCard <pyqe.ql.filter_card.FilterCard>`

        Args:
            name: String value defining the concept set name

            domain: Domain value

            concept_ids: optional list of concept ids

            concepts: optional list of :py:class:`Concept <pyqe.api.concept_query.Concept>`
    """

    def __init__(self, name: str, domain: Domain, concept_ids: List[str] = None,
                 concepts: List['Concept'] = None):
        concept_ids = self._initialise_list(concept_ids)
        concepts = self._initialise_list(concepts)
        self.name: str = name
        self.domain: Domain = domain
        self.concept_ids: List[str] = concept_ids
        self.excluded_concept_ids: List[str] = []
        for concept in concepts:
            self.add_concept(concept)
        # TODO: Add verification of concept id

    def add_concept_id(self, concept_id: str):
        """Add OMOP concept id in the ConceptSet

        Args:
            concept_id: String value of concept id

        Raises:
            ValueError: An error occurred if provided concept_id is already excluded
        """
        if concept_id in self.excluded_concept_ids:
            raise ValueError(f'Concept id {concept_id} is excluded from ConceptSet')
        else:
            self.concept_ids.append(concept_id)

    def add_concept(self, concept: 'Concept'):
        """Add OMOP concept and its descendant concept codes in the ConceptSet

        Args:
            concept: OMOP Concept
        """
        self.concept_ids.append(concept.concept_id)
        if concept.include_descendants:
            descendant_ids = ConceptQuery().get_descendant_concept_ids(concept.concept_id)
            for descendant_id in descendant_ids:
                if descendant_id in self.excluded_concept_ids:
                    descendant_ids.remove(descendant_id)
                    logger.info(
                        f'Excluded descendant concept id {descendant_id} found and not added in ConceptSet')
            self.concept_ids = self._merge_lists(self.concept_ids, descendant_ids)

    def exclude_concept_id(self, excluded_concept_id: str):
        """Exclude OMOP concept id in the ConceptSet

        Args:
            concept_id: String value of concept id to be excluded
        """
        self.excluded_concept_ids.append(excluded_concept_id)
        self._remove_excluded_concept_id(excluded_concept_id)

    def exclude_concept_ids(self, concept_ids: List[str]):
        """Exclude list of OMOP concept ids in the ConceptSet

        Args:
            concept_ids: list of concept ids to be excluded
        """
        self.excluded_concept_ids = self._merge_lists(self.excluded_concept_ids, concept_ids)
        for excluded_concept_id in concept_ids:
            self._remove_excluded_concept_id(excluded_concept_id)

    def _remove_excluded_concept_id(self, excluded_concept_id):
        if excluded_concept_id in self.concept_ids:
            self.concept_ids.remove(excluded_concept_id)
            logger.info(
                f'Concept id {excluded_concept_id} found and excluded from ConceptSet')

    def _is_concept_id_excluded(self, concept_id: str) -> bool:
        return concept_id in self.excluded_concept_ids

    def _merge_lists(self, first_list: List[str], second_list: List[str]) -> bool:
        new_values = set(second_list) - set(first_list)
        return first_list + list(new_values)

    def _initialise_list(self, _list: Optional[List]) -> List:
        if _list is None:
            _list = []
        return _list


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Concept:
    """OMOP concept and its descendant concept ids

        Args:
            concept_id: concept id of Concept

            include_descendants: boolean value to include descendants or not
    """

    def __init__(self, concept_id: str, include_descendants: bool = True):
        self.concept_id = concept_id
        self.include_descendants = include_descendants
