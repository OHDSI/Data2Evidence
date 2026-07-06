import os
import logging
import json
import pandas as pd
from datetime import datetime, timezone
from typing import List, Dict
from pyqe.types.types import ConceptSet, ConceptSetConcept
from pyqe.api.base import _AuthApi
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator

logger = logging.getLogger(__name__)
setup_simple_console_log()


def _parse_ref(ref: str):
    """Parse a compound concept-set reference into (source, external_id)."""
    if not isinstance(ref, str) or ":" not in ref:
        raise ValueError(f"Invalid concept set reference: {ref}. Expected 'legacy:N' or 'webapi:N'.")
    source, id_str = ref.split(":", 1)
    if source not in ("legacy", "webapi"):
        raise ValueError(f"Invalid concept set source: {source}. Expected 'legacy' or 'webapi'.")
    try:
        external_id = int(id_str)
    except ValueError as exc:
        raise ValueError(f"Invalid concept set id in reference: {ref}") from exc
    return source, external_id


def _normalize_concept_set(item: dict) -> dict:
    """Map a d2e-webapi concept-set response item to the legacy-style shape."""
    external_id = item.get("externalId")
    source = item.get("source")
    if external_id is None or source is None:
        raise ValueError(f"Invalid d2e-webapi concept set item: {item}")

    ref = f"{source}:{external_id}"
    created_by = item.get("createdBy") or {}
    modified_by = item.get("modifiedBy") or {}

    created_date = item.get("createdDate")
    modified_date = item.get("modifiedDate")

    return {
        "id": external_id,
        "source": source,
        "ref": ref,
        "name": item.get("name"),
        "shared": item.get("shared", False),
        "concepts": item.get("concepts", []),
        "userName": created_by.get("name"),
        "createdBy": created_by.get("name"),
        "modifiedBy": modified_by.get("name"),
        "createdDate": _to_iso_string(created_date),
        "modifiedDate": _to_iso_string(modified_date),
    }


def _to_iso_string(value):
    """Convert epoch milliseconds or string to ISO 8601 string."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()
    return str(value)


def _map_expression_item(item: dict) -> dict:
    """Map a d2e-webapi expression item to the legacy ConceptSetConcept shape."""
    concept = item.get("concept", {})
    return {
        "id": concept.get("CONCEPT_ID"),
        "useMapped": item.get("includeMapped", False),
        "useDescendants": item.get("includeDescendants", False),
        "isExcluded": item.get("isExcluded", False),
    }


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

    def get_all_concept_sets(self) -> List[ConceptSet]:
        """Query all concept sets

        Args:
            None
        """
        headers = {"datasetid": self.study_id}

        response = self._get(f"/d2e-webapi/conceptset", headers=headers)
        json_response: List[dict] = json.loads(response.text)
        normalized = [_normalize_concept_set(item) for item in json_response]

        # Cache concept_set in class variable
        self.concept_sets = pd.json_normalize(normalized)

        return normalized

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
                f'\n({ index + 1 }) { concept_set["ref"] } - { concept_set["name"] }'
            )

        print(concept_sets_for_display)

    def get_concept_set_from_id(self, concept_set_id: int) -> ConceptSet | Dict:
        """
        Get concept set from concept set id (legacy namespace only).

        Args:
            concept_set_id: ID of a legacy concept set
        """
        return self.get_concept_set_from_ref(f"legacy:{concept_set_id}")

    def get_concept_set_from_ref(self, ref: str) -> ConceptSet | Dict:
        """
        Get concept set from a compound reference.

        Args:
            ref: 'legacy:N' or 'webapi:N'
        """
        if len(self.concept_sets) == 0:
            return {}

        source, external_id = _parse_ref(ref)
        concept_set_concepts = self.concept_sets[
            (self.concept_sets["source"] == source) &
            (self.concept_sets["id"] == external_id)
        ]

        if len(concept_set_concepts) == 0:
            return {}

        return json.loads(concept_set_concepts.iloc[0].to_json())

    def get_concept_set_ids_from_name(self, concept_set_name: int) -> list[int]:
        """
        Get legacy concept set ids from name.
        Return value is an array of int as multiple concept sets can have the same name

        Args:
            concept_set_name: Name of concept set
        """
        if len(self.concept_sets) == 0:
            return []

        concept_set_ids = list(
            self.concept_sets[
                (self.concept_sets["source"] == "legacy") &
                (self.concept_sets["name"] == concept_set_name)
            ]["id"]
        )

        return concept_set_ids

    def get_concepts_in_concept_set(
        self, concept_set_id: int
    ) -> list[ConceptSetConcept]:
        """
        Get concept set concepts from a legacy concept set id.

        Args:
            concept_set_id: ID of a legacy concept set
        """
        return self.get_concepts_in_concept_set_by_ref(f"legacy:{concept_set_id}")

    def get_concepts_in_concept_set_by_ref(
        self, ref: str
    ) -> list[ConceptSetConcept]:
        """
        Get concept set concepts from a compound reference.

        Args:
            ref: 'legacy:N' or 'webapi:N'
        """
        _parse_ref(ref)
        headers = {"datasetid": self.study_id}

        response = self._get(f"/d2e-webapi/conceptset/{ref}/expression", headers=headers)
        expression: dict = json.loads(response.text)
        items = expression.get("items", []) if expression else []
        return [_map_expression_item(item) for item in items]
