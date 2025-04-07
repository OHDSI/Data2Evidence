import requests
from prefect.logging import get_run_logger
from _shared_flow_utils.api.BaseAPI import BaseAPI
from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI


class FilesManagerAPI(BaseAPI):
    def __init__(self):
        self.url = self.get_service_route("filesManager")
        self.logger = get_run_logger()
        self.auth = OpenIdAPI()

    def _get_headers(self):
        token = self.auth.getClientCredentialToken()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def get_file(self, user_data_id: str) -> bytes:
        url = f"{self.url}/{user_data_id}"
        headers = self._get_headers()

        self.logger.info(f"Getting file from {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        return response.content

    # gets a filesave respone
    def save_file(self, username: str, dataKey="scan-report", file_path: str = "./ScanReport.xlsx"):
        url = f"{self.url}/"
        headers = self._get_headers()
        # Remove Content-Type header as requests will set it automatically with the correct boundary
        headers.pop('Content-Type', None)

        with open(file_path, 'rb') as file:

            files = {
                'file': (
                    file_path,
                    file,
                    'application/octet-stream'
                )
            }

            data = {
                'username': username,
                'dataKey': dataKey
            }
            result = requests.post(url, headers=headers,
                                   data=data, files=files)

        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"Failed to save file, {result.content}")
        else:
            return result.json()
