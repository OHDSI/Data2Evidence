import pytest
from pyqe.api.base import _Api, _AuthApi
from pyqe.api.study import Study
from test.mock_object import MockResponse


STUDY_LIST_PATH = 'api/services/userStudies'

mock_study_list = [
    { 
        'studyId': '9f0c44f1-8de9-4d4c-80c0-abcde134799b', 
        'name': 'first.study.name' 
    }, 
    {   'studyId': '7eb1fc8d-5091-4b88-be49-bb1ba014cc99', 
        'name': 'second.study.name'
    }
]


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_AUTH_TYPE', '0')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setattr(_Api, '_get', _get_mock_response)


def test_init_study(setup):
    # When
    study = Study()

    # Then
    assert isinstance(study, _AuthApi)


def test_get_user_study_list(setup):
    # When
    study_list = Study().get_user_study_list()

    # Then
    assert study_list == mock_study_list


def _get_mock_response(auth_api, path, params):
    if path == STUDY_LIST_PATH:
        return MockResponse(200, mock_study_list)

    return MockResponse(404, None)