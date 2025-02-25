import os
import logging
import time
from pyqe.api.base import _AuthApi
from pyqe.azure.password_grant import _PasswordCredential


def test_authenticate_with_azure_ad_b2c(monkeypatch):
    # Given
    def mock_get_token(*args, **kwargs):
        monkeypatch.setattr(_AuthApi, 'is_authenticated', lambda x: True)
        return {
            'id_token': '123',
            'access_token': '456',
            'refresh_token': '789'
        }

    monkeypatch.setenv('PYQE_URL', 'http://pyqe.url')
    monkeypatch.setenv('PYQE_USERNAME', 'username')
    monkeypatch.setenv('PYQE_TLS_CLIENT_CA_CERT_PATH', 'empty')
    monkeypatch.setenv('PYQE_AUTH_TYPE', '1')
    monkeypatch.setattr(_PasswordCredential, 'get_token', mock_get_token)

    # When
    auth_api = _AuthApi()

    # Then
    assert os.environ['PYQE_AUTH_TYPE'] == '1'
    assert os.environ['OIDC_ID_TOKEN'] == '123'
    assert os.environ['OIDC_ACCESS_TOKEN'] == '456'
    assert os.environ['OIDC_REFRESH_TOKEN'] == '789'
    assert auth_api.has_id_token is True
    assert auth_api._session.headers['Authorization'] == 'Bearer 456'