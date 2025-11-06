import requests
from pathlib import Path
from typing import Union
from base64 import b64decode

from _shared_flow_utils.api.BaseAPI import BaseAPI

class SupabaseStorageAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = f"{self.get_service_route("jobplugins")}jobplugins/dataflow/node/file"


    def list_files(self, node_id: str) -> list[dict]:
        request_url = f"{self.url}/list?nodeId={node_id}"

        response = requests.get(
            request_url,
            headers=self.get_options(),
            verify=self.get_verify_value()
        )

        response.raise_for_status()

        return response.json()


    def delete_file(self, node_id: str, filename: str) -> dict:
        request_url = f"{self.url}?nodeId={node_id}&fileName={filename}"

        response = requests.delete(
            request_url,
            headers=self.get_options(),
            verify=self.get_verify_value()
        )

        response.raise_for_status()

        return response.json()
        


    def upload_file(self, node_id: str, file_path: Union[str, Path], content_type: str) -> dict:
        file_path_obj = Path(file_path)
        filename = file_path_obj.name

        request_url = f"{self.url}?nodeId={node_id}"

        headers = self.get_options()
        headers.pop("Content-Type", None)
        
        with open(file_path, "rb") as file:
            files = {
                "file": (filename, file, content_type)
            }
            
            response = requests.post(
                request_url,
                headers=headers,
                files=files,
                verify=self.get_verify_value()
            )

        response.raise_for_status()

        return response.json()


    def decode_csv_data(self, response_data: dict) -> str:
        encoded_data = response_data.get("data", "")
        if not encoded_data:
            raise ValueError("No data found in response")
        
        try:
            decoded_bytes = b64decode(encoded_data)
            csv_content = decoded_bytes.decode('utf-8')
            return csv_content
        except Exception as e:
            raise ValueError(f"Failed to decode CSV data: {str(e)}")


    def get_file(self, node_id: str, filename: str) -> dict:
        request_url = f"{self.url}?nodeId={node_id}&fileName={filename}"

        response = requests.get(
            request_url, 
            headers=self.get_options(),
            verify=self.get_verify_value()
        )

        response.raise_for_status()
        
        return response.json()