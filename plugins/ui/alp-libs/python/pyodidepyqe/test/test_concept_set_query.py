import asyncio
import pytest
from pyqe.api.concept_set_query import ConceptSetQuery
from test.mock_object import MockResponse

DATASET_ID = "datasetId"

LEGACY_SET_1 = {
    "id": "legacy:1",
    "externalId": 1,
    "source": "legacy",
    "name": "dummy_concept_set",
    "shared": False,
    "createdBy": {"name": "dummy", "id": 1, "login": "dummy"},
    "modifiedBy": {"name": "dummy", "id": 1, "login": "dummy"},
    "createdDate": 1736152551855,
    "modifiedDate": 1736152551855,
    "tags": [],
    "hasWriteAccess": True,
    "hasReadAccess": True,
}

LEGACY_SET_2 = {
    "id": "legacy:2",
    "externalId": 2,
    "source": "legacy",
    "name": "dummy_concept_set2",
    "shared": True,
    "createdBy": {"name": "dummy2", "id": 2, "login": "dummy2"},
    "modifiedBy": {"name": "dummy2", "id": 2, "login": "dummy2"},
    "createdDate": 1736152551855,
    "modifiedDate": 1736152551855,
    "tags": [],
    "hasWriteAccess": True,
    "hasReadAccess": True,
}

WEBAPI_SET_1 = {
    "id": "webapi:1",
    "externalId": 1,
    "source": "webapi",
    "name": "dummy_webapi_concept_set",
    "shared": False,
    "createdBy": {"name": "webapi_user", "id": 3, "login": "webapi_user"},
    "modifiedBy": {"name": "webapi_user", "id": 3, "login": "webapi_user"},
    "createdDate": 1736152551855,
    "modifiedDate": 1736152551855,
    "tags": [],
    "hasWriteAccess": True,
    "hasReadAccess": True,
}


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv("PYQE_URL", "http://pyqe.url")
    monkeypatch.setenv("PYQE_TLS_CLIENT_CA_CERT_PATH", "empty")
    monkeypatch.setattr(ConceptSetQuery, "_get", get_mock_response)


def test_get_all_concept_sets(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        concept_sets = await concept_set_query.get_all_concept_sets()
        concept_set1 = concept_sets[0]
        concept_set2 = concept_sets[1]
        concept_set3 = concept_sets[2]

        assert concept_set1["id"] == 1
        assert concept_set1["source"] == "legacy"
        assert concept_set1["ref"] == "legacy:1"
        assert concept_set1["name"] == "dummy_concept_set"
        assert concept_set1["shared"] == False
        assert concept_set1["concepts"] == []
        assert concept_set1["userName"] == "dummy"
        assert concept_set1["createdBy"] == "dummy"
        assert concept_set1["modifiedBy"] == "dummy"
        assert concept_set1["createdDate"] == "2025-01-06T08:35:51.855000+00:00"
        assert concept_set1["modifiedDate"] == "2025-01-06T08:35:51.855000+00:00"

        assert concept_set2["id"] == 2
        assert concept_set2["source"] == "legacy"
        assert concept_set2["ref"] == "legacy:2"
        assert concept_set2["name"] == "dummy_concept_set2"
        assert concept_set2["shared"] == True

        assert concept_set3["id"] == 1
        assert concept_set3["source"] == "webapi"
        assert concept_set3["ref"] == "webapi:1"
        assert concept_set3["name"] == "dummy_webapi_concept_set"

    asyncio.run(_test())


def test_get_concept_set_from_id(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()
        concept_set = concept_set_query.get_concept_set_from_id(1)

        assert concept_set["id"] == 1
        assert concept_set["source"] == "legacy"
        assert concept_set["ref"] == "legacy:1"
        assert concept_set["name"] == "dummy_concept_set"

    asyncio.run(_test())


def test_get_concept_set_from_id_returns_empty_if_no_concept_set_with_id(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()
        concept_set = concept_set_query.get_concept_set_from_id(-1)

        assert concept_set == {}

    asyncio.run(_test())


def test_get_concept_set_from_ref_disambiguates_sources(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()

        legacy_set = concept_set_query.get_concept_set_from_ref("legacy:1")
        webapi_set = concept_set_query.get_concept_set_from_ref("webapi:1")

        assert legacy_set["source"] == "legacy"
        assert legacy_set["name"] == "dummy_concept_set"
        assert webapi_set["source"] == "webapi"
        assert webapi_set["name"] == "dummy_webapi_concept_set"

    asyncio.run(_test())


def test_get_concept_set_ids_from_name(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()
        concept_set_ids = concept_set_query.get_concept_set_ids_from_name(
            "dummy_concept_set2"
        )

        assert concept_set_ids == [2]

    asyncio.run(_test())


def test_get_concept_set_ids_from_name_returns_empty_if_no_concept_set_with_name(
    setup,
):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()
        concept_set_ids = concept_set_query.get_concept_set_ids_from_name(
            "non_existent_concept_set_name"
        )

        assert concept_set_ids == []

    asyncio.run(_test())


def test_get_concepts_in_concept_set(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()
        concept_set_concepts = await concept_set_query.get_concepts_in_concept_set(1)

        assert concept_set_concepts == [
            {"id": 37018912, "useMapped": False, "useDescendants": False, "isExcluded": False},
            {"id": 45591027, "useMapped": False, "useDescendants": False, "isExcluded": False},
            {"id": 45877606, "useMapped": False, "useDescendants": False, "isExcluded": False},
        ]

    asyncio.run(_test())


def test_get_concepts_in_concept_set_returns_empty_if_no_concept_set_with_id(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()
        concept_set_concepts = await concept_set_query.get_concepts_in_concept_set(-1)

        assert concept_set_concepts == []

    asyncio.run(_test())


def test_get_concepts_in_concept_set_by_ref_for_webapi(setup):
    async def _test():
        concept_set_query = ConceptSetQuery(DATASET_ID)
        await concept_set_query.get_all_concept_sets()
        concept_set_concepts = await concept_set_query.get_concepts_in_concept_set_by_ref("webapi:1")

        assert concept_set_concepts == [
            {"id": 999, "useMapped": True, "useDescendants": True, "isExcluded": False},
        ]

    asyncio.run(_test())


async def get_mock_response(auth_api, path, params=None, headers=None):
    if path == "/d2e-webapi/conceptset":
        return MockResponse(200, [LEGACY_SET_1, LEGACY_SET_2, WEBAPI_SET_1])

    if path == "/d2e-webapi/conceptset/legacy:1/expression":
        return MockResponse(200, {
            "items": [
                {
                    "concept": {
                        "CONCEPT_ID": 37018912,
                        "CONCEPT_NAME": "concept1",
                    },
                    "includeMapped": False,
                    "includeDescendants": False,
                    "isExcluded": False,
                },
                {
                    "concept": {
                        "CONCEPT_ID": 45591027,
                        "CONCEPT_NAME": "concept2",
                    },
                    "includeMapped": False,
                    "includeDescendants": False,
                    "isExcluded": False,
                },
                {
                    "concept": {
                        "CONCEPT_ID": 45877606,
                        "CONCEPT_NAME": "concept3",
                    },
                    "includeMapped": False,
                    "includeDescendants": False,
                    "isExcluded": False,
                },
            ]
        })

    if path == "/d2e-webapi/conceptset/legacy:2/expression":
        return MockResponse(200, {"items": []})

    if path == "/d2e-webapi/conceptset/webapi:1/expression":
        return MockResponse(200, {
            "items": [
                {
                    "concept": {"CONCEPT_ID": 999, "CONCEPT_NAME": "webapi_concept"},
                    "includeMapped": True,
                    "includeDescendants": True,
                    "isExcluded": False,
                }
            ]
        })

    return MockResponse(404, None)
