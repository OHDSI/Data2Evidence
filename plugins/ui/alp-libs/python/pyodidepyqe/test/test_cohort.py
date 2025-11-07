import pytest
import json
from pyqe.api.cohort import Cohort
from pyqe.api.base import _Api, _AuthApi
from test.mock_object import MockResponse


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_AUTH_TYPE', '0')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setenv('B2C_ID', '1234567890')
    monkeypatch.setattr(_Api, '_delete', _delete_cohort)
    monkeypatch.setattr(_Api, '_get', _get_all_cohorts)
    monkeypatch.setattr(_Api, '_post', _create_cohort)


def test_init_cohort(setup, monkeypatch):
    # when
    cohort = Cohort(STUDY_ID)

    assert isinstance(cohort, _AuthApi)
    assert cohort.study_id == STUDY_ID


def test_get_all_cohorts(setup):
    # when
    cohort = Cohort(STUDY_ID)

    # Then
    response = cohort.get_all_cohorts()

    assert response == ALL_COHORTS


def test_delete_cohort(setup):
    # when
    cohort = Cohort(STUDY_ID)
    cohortId = 1

    response = cohort.delete_cohort(cohortId)

    assert response == json.dumps("Deleted 1 row from cohort 1")


def test_create_cohort(setup):

    # when
    cohort = Cohort(STUDY_ID)

    cohort_definition = {
        "mriquery": "cohortRequest",
        "name": "my test cohort",
        "description": "hello",
    }

    response = cohort.create_cohort(cohort_definition)

    assert response == json.dumps("cohort created")


GET_ALL_COHORTS_PATH = "api/services/cohort"

DELETE_COHORT_PATH = "api/services/cohort?cohortId=1&datasetId=datasetId"

CREATE_COHORT_PATH = "api/services/cohort"

STUDY_ID = "datasetId"

PARAMS = {
    "datasetId": STUDY_ID,
    "offset": 0,
    "limit": 0
}

ALL_COHORTS = {'data': [{'id': 1,
                         'patientIds': [1, 2, 3, 4, 5],
                         'name': '67 years old',
                         'description': 'cohort of people which are 50 years old',
                         'creationTimestamp': '2022-09-12'},
                        {'id': 2,
                         'patientIds': [6, 7, 8, 9, 10],
                         'name': '67 years old',
                         'description': 'cohort of people which are 67 years old',
                         'creationTimestamp': '2022-09-12'}],
               'cohortDefinitionCount': 2}

COHORT_DEFINITION = {'mriquery': 'eJxTSs7PyC8qCUotLE0tLlECAC2ABb0=',
                     'name': 'my test cohort',
                     'description': 'hello',
                     'datasetId': 'datasetId'}


def _get_all_cohorts(auth_api, path, params):

    assert params == PARAMS
    if path == GET_ALL_COHORTS_PATH:
        return MockResponse(200, ALL_COHORTS)

    return MockResponse(404, None)


def _delete_cohort(auth_api, path):

    if path == DELETE_COHORT_PATH:
        return MockResponse(200, 'Deleted 1 row from cohort 1')

    return MockResponse(404, None)


def _create_cohort(auth_api, path, json, data):

    if path == CREATE_COHORT_PATH:

        assert json == COHORT_DEFINITION
        return MockResponse(200, 'cohort created')

    return MockResponse(404, None)
