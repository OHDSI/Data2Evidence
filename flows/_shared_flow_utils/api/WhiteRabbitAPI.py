import requests
from uuid import UUID
from prefect.logging import get_run_logger
from _shared_flow_utils.api.BaseAPI import BaseAPI
from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI


class WhiteRabbitAPI(BaseAPI):
    def __init__(self):
        self.url = self.get_service_route("whiteRabbit")
        self.logger = get_run_logger()
        self.headers = self.get_options()

    def save_conversion(self, flow_run_id: UUID, file_name: str, file_id: int):
        url = f"{self.url}scan-report/conversion"

        result = requests.post(url,
                               headers=self.headers,
                               json={'flow_run_id': flow_run_id,
                                     'file_name': file_name,
                                     'file_id': file_id}
                               )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"Failed to save conversion, {result.content}")
        else:
            return result.json()
