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
    

    def download_file_to_path(self, node_id: str, filename: str, filepath: str = "/app/downloads") -> str:
        response_data = self.get_file(node_id, filename)
        encoded_data = response_data.get("data", "")
        if not encoded_data:
            raise ValueError("No data found in response")

        try:
            file_bytes = b64decode(encoded_data)
        except Exception as e:
            raise ValueError(f"Failed to decode file data: {str(e)}")

        file_path = str(Path(filepath) / filename)
        ext = Path(filename).suffix.lower()

        
        if ext in {".csv", ".txt", ".json", ".md", ".log"}:
            # Handle text files
            try:
                file_content = file_bytes.decode("utf-8")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(file_content)
            except Exception as e:
                raise ValueError(f"Failed to decode text file '{filename}': {str(e)}")
        else:
            with open(file_path, "wb") as f:
                f.write(file_bytes)

        return file_path

    def get_file(self, node_id: str, filename: str) -> dict:
        request_url = f"{self.url}?nodeId={node_id}&fileName={filename}"

        response = requests.get(
            request_url, 
            headers=self.get_options(),
            verify=self.get_verify_value()
        )

        response.raise_for_status()
        
        return response.json()
