import requests
from prefect.logging import get_run_logger
from _shared_flow_utils.api.BaseAPI import BaseAPI


class FilesManagerAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("filesManager")
        self.logger = get_run_logger()
        self.headers = self.get_options()

    def get_file(self, user_data_id: str) -> bytes:
        url = f"{self.url}/{user_data_id}"

        self.logger.info(f"Getting file from {url}")
        response = requests.get(url, headers=self.headers,
                                verify=self.get_verify_value())
        response.raise_for_status()

        return response.content

    def save_file(self, username: str, file_path: str, dataKey: str = "scan-report"):
        url = f"{self.url}/"
        headers = self.headers
        # Remove Content-Type header - requests will set it automatically with the correct boundary
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
            result = requests.post(url,
                                   headers=headers,
                                   verify=self.get_verify_value(),
                                   data=data,
                                   files=files)

        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"Failed to save file, {result.content}")
        else:
            return result.json()
