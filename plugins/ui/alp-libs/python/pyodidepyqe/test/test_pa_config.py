import pytest
from pyqe.api.base import _Api, _AuthApi
from pyqe.api.pa_config import PAConfig
from test.mock_object import MockResponse


PA_PATH = 'pa/services/analytics.xsjs'
FRONTEND_CONFIG_PATH = 'pa/config/enduser'

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

mock_frontend_config = {
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
}


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_AUTH_TYPE', '0')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setattr(_Api, '_get', _get_mock_response)


def test_init_pa_config(setup):
    # When
    pa_config = PAConfig()

    # Then
    assert isinstance(pa_config, _AuthApi)
    assert pa_config._default_pa_config == None


def test_get_config_list(setup):
    # When
    config_list = PAConfig()._get_config_list()

    # Then
    assert config_list == mock_config_list


def test_get_frontend_config(setup):
    # When
    frontend_config = PAConfig()._get_frontend_config('some_config_id', 'A')

    # Then
    assert frontend_config == mock_frontend_config


def _get_mock_response(auth_api, path, params):
    if path == PA_PATH and params == { 'action': 'getMyConfigList' }:
        return MockResponse(200, mock_config_list)

    if path == FRONTEND_CONFIG_PATH and params == { 'action': 'getFrontendConfig', 'configId': 'some_config_id', 'configVersion': 'A', 'lang': 'eng' }:
        return MockResponse(200, mock_frontend_config)

    return MockResponse(404, None)