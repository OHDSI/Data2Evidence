import requests
from prefect.logging import get_run_logger
from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI


class FilesManagerAPI:
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
        headers = self.get_options()

        self.logger.info(f"Getting file from {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        return response.content
