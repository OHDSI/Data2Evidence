import pytest
from pyqe.api.base import _Api, _AuthApi
from pyqe.api.datasource import DataSource
from test.mock_object import MockResponse


DATASOURCE_TABLENAMES_PATH = 'api/services/customDBs/testSchemaName'
DATASOURCE_TABLEDATA_PATH = 'api/services/customDBs/testSchemaName/testTableName'

mock_table_names = ["PERSON", "PROVIDER"]
mock_table_data = [{'personID': 1, 'name': 'Tom'}, {'personID': 2, 'name': 'Ford'}]


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_AUTH_TYPE', '0')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setattr(_Api, '_get', _get_mock_table_names)


def test_init_study(setup):
    # When
    datasource = DataSource()

    # Then
    assert isinstance(datasource, _AuthApi)


def test_get_table_names(setup):

    # When
    table_names = DataSource().get_table_names("testSchemaName")

    assert table_names == mock_table_names


def test_get_table_data(setup):

    # When
    table_data = DataSource().get_table_data("testSchemaName", "testTableName")

    # Then
    assert table_data == mock_table_data


def _get_mock_table_names(auth_api, path, params):
    print(path)
    if path == DATASOURCE_TABLENAMES_PATH:
        return MockResponse(200, mock_table_names)

    if path == DATASOURCE_TABLEDATA_PATH:
        return MockResponse(200, mock_table_data)

    return MockResponse(404, None)
