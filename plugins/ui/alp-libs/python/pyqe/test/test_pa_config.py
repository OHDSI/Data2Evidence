import pytest
from pyqe.api.base import _Api, _AuthApi
from pyqe.api.pa_config import PAConfig
from test.mock_object import MockResponse


PA_PATH = '/analytics-svc/pa/services/analytics.xsjs'
FRONTEND_CONFIG_PATH = '/analytics-svc/pa/services/analytics.xsjs'

mock_config_list = [{
    'meta': {
        'configId': 'config-a',
        'configVersion': '1',
        'default': False
    }
}, {
    'meta': {
        'configId': 'config-b',
        'configVersion': '2',
        'default': True
    }
}]

mock_frontend_config = [{
    'config': {
        'patient': {
            'attributes': {
                'County': {
                    'name': 'County'
                }
            },
            'interactions': {
                'death': {
                    'name': 'Death',
                    'attributes': {
                        'deathdate': {
                            'name': 'Death Date'
                        }
                    }
                }
            }
        }
    }
}]


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setattr(_Api, '_get', _get_mock_response)


def test_init_pa_config(setup):
    # When
    pa_config = PAConfig()

    # Then
    assert isinstance(pa_config, _AuthApi)
    assert pa_config._default_pa_config == None

def test_get_frontend_config(setup):
    # When
    frontend_config = PAConfig()._get_frontend_config('some_config_id', 'A', 'some_dataset_id')

    # Then
    assert frontend_config == mock_frontend_config


def _get_mock_response(auth_api, path, params):

    if path == FRONTEND_CONFIG_PATH and params == { 'action': 'getFrontendConfig', 'configId': 'some_config_id', 'configVersion': 'A', 'datasetId': 'some_dataset_id', 'lang': 'eng' }:
        return MockResponse(200, mock_frontend_config)

    return MockResponse(404, None)