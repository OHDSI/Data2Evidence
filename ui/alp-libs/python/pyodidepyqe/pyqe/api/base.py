import os
import json
import logging
import requests
import jwt
import getpass
from urllib.parse import urljoin
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from dotenv import load_dotenv
from six.moves import input
from typing import Optional, Any, List
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator, settings
from pyqe.azure.password_grant import _PasswordCredential
from pyqe.azure.refresh_token import _RefreshToken
from pyodide.http import pyfetch, FetchResponse

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class _StarboardApi():
    def __init__(self):
        """Api class

        Provide common functions used for accessing QE endpoints
        """

        self._load_environment_variables()

    async def _get(self, path: str, params=None, **kwargs) -> FetchResponse:
        """Request HTTP GET method"""
        if params:
            query_string = '?'
            for k, v in params.items():
                if query_string != '?':
                    query_string += '&'
                query_string += k + '=' + v
            path += query_string
            print(path)

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'GET {url}')
        headers = {"Authorization": f'Bearer {os.getenv("TOKEN")}'}
        response = await pyfetch(url=url, method="GET", headers=headers, **kwargs)
        return response

    async def _post(self, path: str, data=None, **kwargs) -> FetchResponse:
        """Request HTTP POST method"""

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'POST {url}')
        headers = {
            "Authorization": f'Bearer {os.getenv("TOKEN")}', "Content-Type": "application/json"}

        response = await pyfetch(url=url, method="POST", body=json.dumps(data), headers=headers, **kwargs)
        return response

    async def _put(self, path: str, json=None, data=None) -> FetchResponse:
        """Request HTTP PUT method"""

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'PUT {url}')
        headers = {"Authorization": f'Bearer {os.getenv("TOKEN")}'}
        response = await pyfetch(
            url=url, method="PUT", body=json, headers=headers)
        return response

    async def _delete(self, path: str, **kwargs) -> FetchResponse:
        """Request HTTP DELETE method"""

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'DELETE {url}')
        headers = {"Authorization": f'Bearer {os.getenv("TOKEN")}'}
        response = await pyfetch(url=url, method="DELETE", headers=headers, **kwargs)
        return response

    def _load_environment_variables(self) -> None:
        """Load relevant environment variables"""
        load_dotenv()

        self._base_url = os.getenv('PYQE_URL')
        self._pyqe_tls_ca_cert_path = os.getenv('PYQE_TLS_CLIENT_CA_CERT_PATH')

        if self._base_url is None:
            raise ValueError('Please set PYQE_URL in .env')

        if self._pyqe_tls_ca_cert_path is None:
            raise ValueError('Please set PYQE_TLS_CLIENT_CA_CERT_PATH in .env')

        self._connect_timeout: Optional[str] = os.getenv('PYQE_CONNECT_TIMEOUT')
        self._read_timeout: Optional[str] = os.getenv('PYQE_READ_TIMEOUT')

        if all(val is None for val in [self._connect_timeout, self._read_timeout]):
            self._timeout = None
        else:
            self._timeout = (float(self._connect_timeout), float(self._read_timeout))


@decorator.attach_class_decorator(decorator.log_function, __name__)
class _AuthApi(_StarboardApi):
    def __init__(self):
        """Provide common functions used for accessing protected WebAPI endpoints"""

        super().__init__()
        self._load_environment_variables()
        self._username: Optional[str] = None

        self._auth_types = {
            '0': 'None'
        }

    def _load_environment_variables(self) -> None:
        super()._load_environment_variables()
        self._default_username: Optional[str] = None
        self._default_username = os.getenv('PYQE_USERNAME')
        self._default_password: Optional[str] = os.getenv('PYQE_PASSWORD')
        self._default_auth_type: Optional[str] = os.getenv('PYQE_AUTH_TYPE')
        self._auth_audience: Optional[str] = os.getenv('PYQE_JWT_AUDIENCE')
        self._auth_algorithms: list = []
        _auth_algorithms: Optional[str] = os.getenv('PYQE_JWT_ALGORITHMS')
        if _auth_algorithms:
            self._auth_algorithms = _auth_algorithms.split()

        if os.getenv('PYQE_TOKEN_TYPE'):
            self._pyqe_token_type = os.getenv('PYQE_TOKEN_TYPE')
        else:
            self._pyqe_token_type = 'ACCESS'

    @property
    def id_token(self) -> Optional[str]:
        return os.getenv('OIDC_ID_TOKEN')

    @property
    def access_token(self) -> Optional[str]:
        return os.getenv('OIDC_ACCESS_TOKEN')

    @property
    def refresh_token(self) -> Optional[str]:
        return os.getenv('OIDC_REFRESH_TOKEN')

    @property
    def is_auth_disabled(self) -> bool:
        return os.getenv('PYQE_AUTH_TYPE') == '0'

    @property
    def auth_type(self):
        return os.getenv('PYQE_AUTH_TYPE')

    @property
    def has_id_token(self):
        return True if self.id_token else False

    def get_id(self):
        return self._decode_id_token(os.getenv('TOKEN'))['sub']

    def _decode_id_token(self, token):
        decode_kwargs = {
            'options': {'verify_signature': False, 'verify_exp': True}
        }

        if self._auth_audience is not None:
            decode_kwargs['audience'] = self._auth_audience

        if self._auth_algorithms is not None:
            decode_kwargs['algorithms'] = self._auth_algorithms

        return jwt.decode(token, **decode_kwargs)

    def _create_authorization_header(self):
        if self._pyqe_token_type == 'ACCESS':
            return {'Authorization': f'Bearer {self.access_token}'}
        else:
            return {'Authorization': f'Bearer {self.id_token}'}

    async def _get(self, path: str, params=None, **kwargs):
        try:
            response = await super()._get(path, params=params, **kwargs)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response
        except Exception as e:
            print(e)

    def _post(self, path: str, json=None, **kwargs):
        try:
            response = super()._post(path, json, **kwargs)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response
        except Exception as e:
            print(e)

    def _put(self, path: str, json=None, data=None):
        try:
            response = super()._put(path, json=json, data=data)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response
        except Exception as e:
            print(e)

    def _delete(self, path: str, **kwargs):
        try:
            response = super()._delete(path, **kwargs)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response
        except Exception as e:
            print(e)

    def _validate_response(self, response: requests.Response) -> None:
        url = response.request.url
        method = response.request.method

        if response.status_code == 401:
            logger.error(f'Anonymous access is not allowed ({method} {url})')
            self._reauthentication()
            return
        elif response.status_code == 403:
            raise PermissionError(f'Access is not permitted ({method} {url})')

        response.raise_for_status()
