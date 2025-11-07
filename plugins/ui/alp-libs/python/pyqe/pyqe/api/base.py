import os
import logging
import requests
from urllib.parse import urljoin
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from dotenv import load_dotenv
from typing import Optional
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
import jwt

logger = logging.getLogger(__name__)
setup_simple_console_log()
@decorator.attach_class_decorator(decorator.log_function, __name__)
class _Api():
    def __init__(self):
        """Api class

        Provide common functions used for accessing QE endpoints
        """

        self._load_environment_variables()
        self._session = requests

    def _get(self, path: str, params=None, **kwargs) -> requests.Response:
        """Request HTTP GET method"""
        
        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'GET {url}')

        if os.getenv('PYQE_URL') in url:
            response = self._session.get(
                url, params=params, timeout=self._timeout, verify=self._pyqe_tls_ca_cert_path, **kwargs)
        else:
            response = self._session.get(url, params=params, timeout=self._timeout, **kwargs)

        response.raise_for_status()
        return response

    def _get_stream(self, path: str, params=None, **kwargs) -> requests.Response:

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'GET {url}')

        if os.getenv('PYQE_URL') in url:
            return self._session.get(
                url, params=params, timeout=self._timeout, verify=self._pyqe_tls_ca_cert_path, stream=True, **kwargs)
        else:
            return self._session.get(
                url, params=params, timeout=self._timeout, stream=True, **kwargs)

    def _post(self, path: str, json=None, data=None, **kwargs) -> requests.Response:
        """Request HTTP POST method"""

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'POST {url}')
        response = self._session.post(url, json=json, data=data,
                                      timeout=self._timeout, **kwargs)
        response.raise_for_status()
        return response

    def _put(self, path: str, json=None, data=None) -> requests.Response:
        """Request HTTP PUT method"""

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'PUT {url}')
        response = self._session.put(url, json=json, data=data, timeout=self._timeout)
        response.raise_for_status()
        return response

    def _delete(self, path: str, **kwargs) -> requests.Response:
        """Request HTTP DELETE method"""

        url = urljoin(str(self._base_url), str(path))
        logger.debug(f'DELETE {url}')
        response = self._session.delete(url, timeout=self._timeout, **kwargs)
        response.raise_for_status()
        return response

    def _load_environment_variables(self) -> None:
        """Load relevant environment variables"""
        load_dotenv()

        self._base_url = os.getenv('PYQE_URL')
        self.api_url = self._base_url
        self._pyqe_tls_ca_cert_path = os.getenv('PYQE_TLS_CLIENT_CA_CERT_PATH')

        if self._base_url is None:
            raise ValueError('Please set PYQE_URL in .env')

        if self._pyqe_tls_ca_cert_path is None:
            raise ValueError('Please set PYQE_TLS_CLIENT_CA_CERT_PATH in .env')

        if os.getenv('CURL_CA_BUNDLE') == '':
            requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

        self._connect_timeout: Optional[str] = os.getenv('PYQE_CONNECT_TIMEOUT')
        self._read_timeout: Optional[str] = os.getenv('PYQE_READ_TIMEOUT')

        if all(val is None for val in [self._connect_timeout, self._read_timeout]):
            self._timeout = None
        else:
            self._timeout = (float(self._connect_timeout), float(self._read_timeout))

@decorator.attach_class_decorator(decorator.log_function, __name__)
class _AuthApi(_Api):
    def __init__(self):
        """Provide common functions used for accessing protected WebAPI endpoints"""

        super().__init__()

        self._session: requests.Session = requests.Session()
        self._username: Optional[str] = None
        self._auth_audience: Optional[str] = os.getenv('PYQE_JWT_AUDIENCE')
        self._auth_algorithms: list = []
        _auth_algorithms: Optional[str] = os.getenv('PYQE_JWT_ALGORITHMS')
        if _auth_algorithms:
            self._auth_algorithms = _auth_algorithms.split()
            
        if self.id_token:
            # add id token to request header
            self._session.headers.update(self._create_authorization_header())

    def _load_environment_variables(self) -> None:
        super()._load_environment_variables()
        self._default_username: Optional[str] = None

    @property
    def id_token(self) -> Optional[str]:
        return os.getenv('ID_TOKEN')

    def get_id(self) -> str:
        return self._decode_id_token(self.id_token.split(" ")[1])['sub']
    
    def _decode_id_token(self, token):        
        decode_kwargs = {
            'options': {'verify_signature': False, 'verify_exp': True}
        }

        if self._auth_audience is not None:
            decode_kwargs['audience'] = self._auth_audience

        if self._auth_algorithms is not None:
            decode_kwargs['algorithms'] = self._auth_algorithms

        return jwt.decode(token, **decode_kwargs)
    
    @property
    def has_id_token(self):
        return True if self.id_token else False
  
    def _create_authorization_header(self):
        return {'Authorization': f'{self.id_token}'}
    
    def _get(self, path: str, params=None, **kwargs) -> requests.Response:
        try:
            response = super()._get(path, params=params, **kwargs)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response

    def _get_stream(self, path: str, params=None, **kwargs) -> requests.Response:
        try:
            return super()._get_stream(path, params=params, **kwargs)
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response

    def _post(self, path: str, json=None, data=None, **kwargs) -> requests.Response:
        try:
            response = super()._post(path, json, data, **kwargs)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response

    def _put(self, path: str, json=None, data=None) -> requests.Response:
        try:
            response = super()._put(path, json=json, data=data)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response

    def _delete(self, path: str, **kwargs) -> requests.Response:
        try:
            response = super()._delete(path, **kwargs)
            return response
        except requests.HTTPError as e:
            self._validate_response(e.response)
            return e.response

    def _validate_response(self, response: requests.Response) -> None:
        url = response.request.url
        method = response.request.method

        if response.status_code == 401:
            logger.error(f'Anonymous access is not allowed ({method} {url})')
            return
        elif response.status_code == 403:
            raise PermissionError(f'Access is not permitted ({method} {url})')

        response.raise_for_status()
