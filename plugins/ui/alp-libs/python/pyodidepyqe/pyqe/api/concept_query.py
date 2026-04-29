import logging
import json
from typing import List, Optional
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

    def get_standard_code(self, concept_code: str, vocabulary_id: str) -> str:
        """Get standard concept code based on provided non-standard concept code & vocabulary ID

        Args:
            concept_code: String value of non-standard concept code

            vocabulary_id: String value of vocabulary id of provided non-standard concept code
        """
        params = {
            'conceptCode': concept_code,
            'vocabularyId': vocabulary_id
        }
        response = self._get(f'/analytics-svc/api/services/standard-concept', params=params)
        concept = json.loads(response.text)
        return concept['conceptCode']

    def get_descendant_codes(self, concept_code: str) -> List[str]:
        """Get list of descendant concept codes based on provided concept code

        Args:
            concept_code: String value of concept code
        """
        params = {
            'conceptCode': concept_code
        }
        response = self._get(f'/analytics-svc/api/services/descendant-concepts', params=params)
        json_response = json.loads(response.text)
        concepts = json_response['descendants']
        if len(concepts) > 0:
            return [concept['conceptCode'] for concept in concepts]
        else:
            raise ValueError('No descendant concept code found')

    async def get_standard_concept_ids(self, concept_code: str, vocabulary_id: str = '') -> str:
        """Get standard concept id based on provided non-standard concept code & vocabulary ID

        Args:
            concept_code: String value of non-standard concept code

            vocabulary_id: String value of vocabulary id of provided non-standard concept code
        """
        params = {
            'conceptCode': concept_code,
            'vocabularyId': vocabulary_id
        }

        response = await self._get('/analytics-svc/api/services/standard-concept-ids', params)
        res = await response.json()
        concept_id_list = res['concept_id']
        return concept_id_list

@decorator.attach_class_decorator(decorator.log_function, __name__)
class ConceptSet:
    """Defined set of unique concept codes for a domain which can be included in :py:class:`FilterCard <pyqe.ql.filter_card.FilterCard>`

        Args:
            name: String value defining the concept set name

            domain: Domain value

            concept_codes: optional list of concept codes

            concepts: optional list of :py:class:`Concept <pyqe.api.concept_query.Concept>`
    """

    def __init__(self, name: str, domain: Domain, concept_codes: List[str] = None,
                 concepts: List['Concept'] = None):
        concept_codes = self._initialise_list(concept_codes)
        concepts = self._initialise_list(concepts)
        self.name: str = name
        self.domain: Domain = domain
        self.concept_codes: List[str] = concept_codes
        self.excluded_concept_codes: List[str] = []
        for concept in concepts:
            self.add_concept(concept)
        # TODO: Add verification of concept code

    def add_concept_code(self, concept_code: str):
        """Add OMOP concept code in the ConceptSet

        Args:
            concept_code: String value of concept code

        Raises:
            ValueError: An error occurred if provided concept_code is already excluded
        """
        if concept_code in self.excluded_concept_codes:
            raise ValueError(f'Concept code {concept_code} is excluded from ConceptSet')
        else:
            self.concept_codes.append(concept_code)

    def add_concept(self, concept: 'Concept'):
        """Add OMOP concept and its descendant concept codes in the ConceptSet

        Args:
            concept: OMOP Concept
        """
        self.concept_codes.append(concept.concept_code)
        if concept.include_descendants is True:
            descendant_codes = ConceptQuery().get_descendant_codes(concept.concept_code)
            for descendant_code in descendant_codes:
                if descendant_code in self.excluded_concept_codes:
                    descendant_codes.remove(descendant_code)
                    logger.info(
                        f'Excluded descendant concept code {descendant_code} found and not added in ConceptSet')
            self.concept_codes = self._merge_lists(self.concept_codes, descendant_codes)

    def exclude_concept_code(self, excluded_concept_code: str):
        """Exclude OMOP concept code in the ConceptSet

        Args:
            concept_code: String value of concept code to be excluded
        """
        self.excluded_concept_codes.append(excluded_concept_code)
        self._remove_excluded_concept_code(excluded_concept_code)

    def exclude_concept_codes(self, concept_codes: List[str]):
        """Exclude list of OMOP concept codes in the ConceptSet

        Args:
            concept_codes: list of concept codes to be excluded
        """
        self.excluded_concept_codes = self._merge_lists(self.excluded_concept_codes, concept_codes)
        for excluded_concept_code in concept_codes:
            self._remove_excluded_concept_code(excluded_concept_code)

    def exclude_concept_ids(self, concept_ids: List[str]):
        """Exclude list of OMOP concept ids in the ConceptSet

        Args:
            concept_codes: list of concept ids to be excluded
        """
        self.excluded_concept_codes = self._merge_lists(self.excluded_concept_codes, concept_ids)
        for excluded_concept_id in concept_ids:
            self._remove_excluded_concept_code(excluded_concept_id)

    def _remove_excluded_concept_code(self, excluded_concept_code):
        if excluded_concept_code in self.concept_codes:
            self.concept_codes.remove(excluded_concept_code)
            logger.info(
                f'Concept code {excluded_concept_code} found and excluded from ConceptSet')

    def _is_concept_code_excluded(self, concept_code: str) -> bool:
        return concept_code in self.excluded_concept_codes

    def _merge_lists(self, first_list: List[str], second_list: List[str]) -> bool:
        new_values = set(second_list) - set(first_list)
        return first_list + list(new_values)

    def _initialise_list(self, _list: Optional[List]) -> List:
        if _list is None:
            _list = []
        return _list


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Concept:
    """OMOP concept and its descendant concept codes

        Args:
            concept_code: concept code of Concept

            include_descendants: boolean value to include descendants or not
    """

    def __init__(self, concept_code: str, include_descendants: bool = True):
        self.concept_code = concept_code
        self.include_descendants = include_descendants
