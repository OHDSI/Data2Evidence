import pytest
import json
from os.path import dirname, join
from pyqe.api.base import _AuthApi
from pyqe.ql.config import Config
from pyqe.types.enum_types import ConfigPath
from test.mock_object import MockResponse

PYQE_ROOT = dirname(dirname(__file__))
RESOURCE_PATH = 'test/resource/mri_config.json'
CONFIG_PATH = join(PYQE_ROOT, RESOURCE_PATH)


def test_init_config_with_local_file():
    # When
    config = Config(CONFIG_PATH, ConfigPath.LOCAL_FILE)

    # Then
    assert config._patient == {
        'configPath': 'patient',
        'name': 'MRI_PA_SERVICES_FILTERCARD_TITLE_BASIC_DATA',
        'attributes': {
            'County': 'attributes.County',
            'State': 'attributes.State',
            'Ethnicity': 'attributes.Ethnicity',
            'Gender': 'attributes.Gender',
            'Race': 'attributes.Race',
            'Patient ID': 'attributes.pid',
            'Patient Count': 'attributes.pcount',
            'Month of Birth': 'attributes.monthOfBirth',
            'Year of Birth': 'attributes.yearOfBirth',
            'Date of Birth': 'attributes.dateOfBirth',
            'Date of Death': 'attributes.dateOfDeath'
        }
    }

    assert config._interactions == {
        'Visit': {
            'configPath': 'patient.interactions.visit',
            'name': 'Visit',
            'attributes': {
                'Patient Id': 'attributes.pid',
                'Visit name': 'attributes.visitname',
                'Visit occurrence Id': 'attributes.visitid',
                'Visit type': 'attributes.visittype',
                'Start Date': 'attributes.startdate',
                'End Date': 'attributes.enddate'
            }
        }
    }


def test_find_interaction():
    # Given
    config = Config(CONFIG_PATH, ConfigPath.LOCAL_FILE)

    # When
    interaction = config.find_interaction('Visit')

    # Then
    assert interaction == {
        'configPath': 'patient.interactions.visit',
        'name': 'Visit',
        'attributes': {
            'Patient Id': 'attributes.pid',
            'Visit name': 'attributes.visitname',
            'Visit occurrence Id': 'attributes.visitid',
            'Visit type': 'attributes.visittype',
            'Start Date': 'attributes.startdate',
            'End Date': 'attributes.enddate'
        }
    }


def test_raise_key_error_when_interaction_with_provided_name_is_not_found():
    # Given
    config = Config(CONFIG_PATH, ConfigPath.LOCAL_FILE)

    # When & Then
    with pytest.raises(KeyError) as e:
        config.find_interaction('Invalid')


def test_init_config_with_url(monkeypatch):
    # Given
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setattr(_AuthApi, '_get', _get_mock_response)

    # When
    config = Config('http://config-path.json', ConfigPath.URL)

    # Then
    assert config._patient == {
        'configPath': 'patient',
        'name': 'Patient',
        'attributes': {
            'Name': 'attributes.name'
        }
    }

    assert config._interactions == {
        'Appointment': {
            'configPath': 'patient.interactions.appointment',
            'name': 'Appointment',
            'attributes': {
                'Appointment Date': 'attributes.appointmentdate'
            }
        }
    }


def test_raise_value_error_when_init_config_with_invalid_url(monkeypatch):
    # Given
    monkeypatch.setattr(_AuthApi, '_get', _get_mock_response)

    # When & Then
    with pytest.raises(ValueError):
        Config('http://invalid.url', ConfigPath.URL)


def _get_mock_response(auth_api, path):
    payload = {
        "filtercards": [
            {
                "source": "patient",
                "attributes": [
                    {
                        "source": "patient.attributes.name",
                        "modelName": "Name"
                    }
                ],
                "modelName": "Patient"
            },
            {
                "source": "patient.interactions.appointment",
                "attributes": [
                    {
                        "source": "patient.interactions.appointment.attributes.appointmentdate",
                        "modelName": "Appointment Date"
                    }
                ],
                "modelName": "Appointment"
            }
        ]
    }
    if path == 'http://config-path.json':
        return MockResponse(200, payload)

    return MockResponse(404, None)