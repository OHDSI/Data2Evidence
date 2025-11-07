import pytest
from pyqe.api.concept_set_query import ConceptSetQuery
from test.mock_object import MockResponse

DATASET_ID = "datasetId"


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv("PYQE_URL", "http://pyqe.url")
    monkeypatch.setenv("PYQE_TLS_CLIENT_CA_CERT_PATH", "empty")
    monkeypatch.setattr(ConceptSetQuery, "_get", get_mock_response)


def test_get_all_concept_sets(setup):
    # When
    concept_set_query = ConceptSetQuery(DATASET_ID)
    concept_sets = concept_set_query.get_all_concept_sets()
    concept_set1 = concept_sets[0]
    concept_set2 = concept_sets[1]

    # Then
    assert concept_set1["id"] == 1
    assert concept_set1["name"] == "dummy_concept_set"
    assert concept_set1["shared"] == False
    assert concept_set1["concepts"] == [
        {"id": 37018912, "useMapped": False, "useDescendants": False},
        {"id": 45591027, "useMapped": False, "useDescendants": False},
        {"id": 45877606, "useMapped": False, "useDescendants": False},
    ]
    assert concept_set1["userName"] == "dummy"
    assert concept_set1["createdBy"] == "dummy"
    assert concept_set1["modifiedBy"] == "dummy"
    assert concept_set1["createdDate"] == "2025-01-06T08:15:51.855Z"
    assert concept_set1["modifiedDate"] == "2025-01-06T08:15:51.855Z"

    assert concept_set2["id"] == 2
    assert concept_set2["name"] == "dummy_concept_set2"
    assert concept_set2["shared"] == True
    assert concept_set2["concepts"] == [
        {"id": 1, "useMapped": True, "useDescendants": False},
        {"id": 2, "useMapped": False, "useDescendants": False},
        {"id": 3, "useMapped": False, "useDescendants": True},
    ]
    assert concept_set2["userName"] == "dummy2"
    assert concept_set2["createdBy"] == "dummy2"
    assert concept_set2["modifiedBy"] == "dummy2"
    assert concept_set2["createdDate"] == "2025-01-06T08:15:51.855Z"
    assert concept_set2["modifiedDate"] == "2025-01-06T08:15:51.855Z"


def test_get_concept_set_from_id(setup):
    # When
    concept_set_query = ConceptSetQuery(DATASET_ID)
    concept_set_query.get_all_concept_sets()
    concept_set = concept_set_query.get_concept_set_from_id(1)

    # Then
    assert concept_set["id"] == 1
    assert concept_set["name"] == "dummy_concept_set"
    assert concept_set["shared"] == False
    assert concept_set["concepts"] == [
        {"id": 37018912, "useMapped": False, "useDescendants": False},
        {"id": 45591027, "useMapped": False, "useDescendants": False},
        {"id": 45877606, "useMapped": False, "useDescendants": False},
    ]
    assert concept_set["userName"] == "dummy"
    assert concept_set["createdBy"] == "dummy"
    assert concept_set["modifiedBy"] == "dummy"
    assert concept_set["createdDate"] == "2025-01-06T08:15:51.855Z"
    assert concept_set["modifiedDate"] == "2025-01-06T08:15:51.855Z"


def test_get_concept_set_from_id_returns_empty_if_no_concept_set_with_id(
    setup,
):
    # When
    concept_set_query = ConceptSetQuery(DATASET_ID)
    concept_set_query.get_all_concept_sets()
    concept_set = concept_set_query.get_concept_set_from_id(-1)

    # Then
    assert concept_set == {}


def test_get_concept_set_ids_from_name(setup):
    # When
    concept_set_query = ConceptSetQuery(DATASET_ID)
    concept_set_query.get_all_concept_sets()
    concept_set_ids = concept_set_query.get_concept_set_ids_from_name(
        "dummy_concept_set2"
    )

    # Then
    assert concept_set_ids == [2]


def test_get_concept_set_ids_from_name_returns_empty_if_no_concept_set_with_name(
    setup,
):
    # When
    concept_set_query = ConceptSetQuery(DATASET_ID)
    concept_set_query.get_all_concept_sets()
    concept_set_ids = concept_set_query.get_concept_set_ids_from_name(
        "non_existent_concept_set_name"
    )

    # Then
    assert concept_set_ids == []


def test_get_concepts_in_concept_set(setup):
    # When
    concept_set_query = ConceptSetQuery(DATASET_ID)
    concept_set_query.get_all_concept_sets()
    concept_set_concepts = concept_set_query.get_concepts_in_concept_set(1)

    # Then
    assert concept_set_concepts == [
        {"id": 37018912, "useMapped": False, "useDescendants": False},
        {"id": 45591027, "useMapped": False, "useDescendants": False},
        {"id": 45877606, "useMapped": False, "useDescendants": False},
    ]


def test_get_concepts_in_concept_set_returns_empty_if_no_concept_set_with_id(setup):
    # When
    concept_set_query = ConceptSetQuery(DATASET_ID)
    concept_set_query.get_all_concept_sets()
    concept_set_concepts = concept_set_query.get_concepts_in_concept_set(-1)

    # Then
    assert concept_set_concepts == []


def get_mock_response(auth_api, path, params):
    if path == "/terminology/concept-set" and params == {
        "datasetId": DATASET_ID,
    }:
        concept_set_payload = [
            {
                "id": 1,
                "name": "dummy_concept_set",
                "shared": False,
                "concepts": [
                    {"id": 37018912, "useMapped": False, "useDescendants": False},
                    {"id": 45591027, "useMapped": False, "useDescendants": False},
                    {"id": 45877606, "useMapped": False, "useDescendants": False},
                ],
                "userName": "dummy",
                "createdBy": "dummy",
                "modifiedBy": "dummy",
                "createdDate": "2025-01-06T08:15:51.855Z",
                "modifiedDate": "2025-01-06T08:15:51.855Z",
            },
            {
                "id": 2,
                "name": "dummy_concept_set2",
                "shared": True,
                "concepts": [
                    {"id": 1, "useMapped": True, "useDescendants": False},
                    {"id": 2, "useMapped": False, "useDescendants": False},
                    {"id": 3, "useMapped": False, "useDescendants": True},
                ],
                "userName": "dummy2",
                "createdBy": "dummy2",
                "modifiedBy": "dummy2",
                "createdDate": "2025-01-06T08:15:51.855Z",
                "modifiedDate": "2025-01-06T08:15:51.855Z",
            },
        ]
        return MockResponse(200, concept_set_payload)

    return MockResponse(404, None)
