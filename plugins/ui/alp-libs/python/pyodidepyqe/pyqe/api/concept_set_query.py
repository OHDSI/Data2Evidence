import os
import logging
import json
import pandas as pd
from typing import List, Dict
from pyqe.types.types import ConceptSet, ConceptSetConcept
from pyqe.api.base import _AuthApi
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class ConceptSetQuery(_AuthApi):
    """Query client for OMOP concept set functions"""

    def __init__(self, study_id: str):
        super().__init__()
        self.concept_sets = pd.DataFrame()
        if not study_id:
            if os.environ["PYQE_STUDY_ENTITY_VALUE"]:
                self.study_id = os.environ["PYQE_STUDY_ENTITY_VALUE"]
            else:
                raise ValueError("Please specify a study id\n")
        else:
            self.study_id = study_id

    async def get_all_concept_sets(self) -> List[ConceptSet]:
        """Query all concept sets

        Args:
            None
        """
        params = {
            "datasetId": self.study_id,
        }

        response = await self._get(f"/terminology/concept-set", params=params)
        json_response: List[ConceptSet] = await response.json()

        # Cache concept_set in class variable
        self.concept_sets = pd.json_normalize(json_response)

        return json_response

    def show_concept_set_list(self):
        """Prints id and name for all concept sets

        Args:
            None
        """
        if len(self.concept_sets) == 0:
            print("No concept sets found!")
            return

        concept_sets_for_display = "Concept Set ID - Concept Set Name"
        for index, concept_set in self.concept_sets.iterrows():
            concept_sets_for_display += (
                f'\n({ index + 1 }) { concept_set["id"] } - { concept_set["name"] }'
            )

        print(concept_sets_for_display)

    def get_concept_set_from_id(self, concept_set_id: int) -> ConceptSet | Dict:
        """
        Get concept set from concept set id

        Args:
            concept_set_id: ID of concept set
        """
        if len(self.concept_sets) == 0:
            return {}

        concept_set_concepts = self.concept_sets[
            self.concept_sets["id"] == concept_set_id
        ]

        if len(concept_set_concepts) == 0:
            return {}

        return json.loads(concept_set_concepts.iloc[0].to_json())

    def get_concept_set_ids_from_name(self, concept_set_name: int) -> list[int]:
        """
        Get concept set ids from name
        Return value is an array of int as multiple concept sets can have the same name

        Args:
            concept_set_name: Name of concept set
        """
        if len(self.concept_sets) == 0:
            return []

        concept_set_ids = list(
            self.concept_sets[self.concept_sets["name"] == concept_set_name]["id"]
        )

        return concept_set_ids

    def get_concepts_in_concept_set(
        self, concept_set_id: int
    ) -> list[ConceptSetConcept]:
        """
        Get concept set concepts from concept set id

        Args:
            concept_set_id: ID of concept set
        """
        if len(self.concept_sets) == 0:
            return []

        concept_set_concepts = self.concept_sets[
            self.concept_sets["id"] == concept_set_id
        ]

        if len(concept_set_concepts) == 0:
            return []

        return concept_set_concepts.iloc[0]["concepts"]
