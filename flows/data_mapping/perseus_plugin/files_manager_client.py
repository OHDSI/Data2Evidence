import requests
from prefect.logging import get_run_logger
from pydantic import BaseModel
from shared_utils.api.OpenIdAPI import OpenIdAPI

class FileSaveResponse(BaseModel):
    id: str
    username: str
    dataKey: str
    fileName: str

class FilesManagerClient:
    def __init__(self, perseus_host: str):
        self.base_url = f"http://{perseus_host}:33001/files-manager/api"
        self.logger = get_run_logger()
        self.auth = OpenIdAPI()

    def _get_headers(self):
        token = self.auth.getClientCredentialToken()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def get_file(self, user_data_id: str) -> bytes:
        url = f"{self.base_url}/{user_data_id}"
        headers = self._get_headers()
        
        self.logger.info(f"Getting file from {url}")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        return response.content
