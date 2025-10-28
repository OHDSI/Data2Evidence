import base64
import requests

from prefect.variables import Variable
from prefect.blocks.system import Secret

from _shared_flow_utils.api.BaseAPI import BaseAPI

class SupabaseStorageAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("jobplugins")

    def decode_csv_data(self, response_data: dict) -> str:
        encoded_data = response_data.get("data", "")
        if not encoded_data:
            raise ValueError("No data found in response")
        
        try:
            decoded_bytes = base64.b64decode(encoded_data)
            csv_content = decoded_bytes.decode('utf-8')
            return csv_content
        except Exception as e:
            raise ValueError(f"Failed to decode CSV data: {str(e)}")


    def get_csv_content(self, node_id: str, filename: str) -> str:
        request_url = f"{self.url}jobplugins/dataflow/file/csv?nodeId={node_id}&fileName={filename}"

        response = requests.get(
            request_url, 
            headers=self.get_options(),
            verify=self.get_verify_value()
        )

        # raise error if status code is >400
        response.raise_for_status()

        return self.decode_csv_data(response)