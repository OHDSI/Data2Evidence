import requests
from pathlib import Path
from typing import Union
from base64 import b64decode

from _shared_flow_utils.api.BaseAPI import BaseAPI

class StrategusResultsStorageAPI(BaseAPI):
    """API client for Strategus Results storage operations."""
    
    def __init__(self):
        super().__init__()
        self.url = f"{self.get_service_route('jobplugins')}jobplugins/strategus-results"
        self.bucket = "strategus-results"

    def upload_file(self, study_id: str, file_path: Union[str, Path]) -> dict:
        """
        Upload a Strategus results zip file.
        
        Args:
            study_id: Study identifier
            file_path: Path to the zip file to upload
            
        Returns:
            dict: Upload response with bucket, path, fileName, etc.
        """
        file_path_obj = Path(file_path)
        filename = file_path_obj.name

        # Validate file is a .zip
        if not filename.endswith('.zip'):
            raise ValueError("Only .zip files are allowed for Strategus results")

        request_url = f"{self.url}/upload?studyId={study_id}"

        headers = self.get_options()
        headers.pop("Content-Type", None)
        
        with open(file_path, "rb") as file:
            files = {
                "file": (filename, file, "application/zip")
            }
            
            response = requests.post(
                request_url,
                headers=headers,
                files=files,
                verify=self.get_verify_value()
            )

        response.raise_for_status()
        return response.json()

    def list_files(self, study_id: str) -> list[dict]:
        """
        List all files uploaded for a specific study.
        
        Args:
            study_id: Study identifier
            
        Returns:
            list: List of file metadata
        """
        request_url = f"{self.url}/list?studyId={study_id}"

        response = requests.get(
            request_url,
            headers=self.get_options(),
            verify=self.get_verify_value()
        )

        response.raise_for_status()
        return response.json()

    def download_file_to_path(self, study_id: str, filename: str, filepath: str = "/app/downloads", flow_run_id: str = None) -> str:
        """
        Download a file from Strategus results storage.
        
        Args:
            study_id: Study identifier
            filename: Name of the file to download
            filepath: Directory to save the file
            flow_run_id: Optional flow run ID for auth token
            
        Returns:
            str: Path to the downloaded file
        """
        response_data = self.get_file(study_id, filename, flow_run_id)
        encoded_data = response_data.get("data", "")
        if not encoded_data:
            raise ValueError("No data found in response")

        try:
            file_bytes = b64decode(encoded_data)
        except Exception as e:
            raise ValueError(f"Failed to decode file data: {str(e)}")

        # Ensure download directory exists
        Path(filepath).mkdir(parents=True, exist_ok=True)
        
        file_path = str(Path(filepath) / filename)
        
        # Write zip files as binary
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return file_path

    def get_file(self, study_id: str, filename: str, flow_run_id: str = None) -> dict:
        """
        Get file data from Strategus results storage.
        
        Args:
            study_id: Study identifier
            filename: Name of the file to retrieve
            flow_run_id: Optional flow run ID for auth token
            
        Returns:
            dict: File data (base64 encoded)
        """
        request_url = f"{self.url}/download?studyId={study_id}&fileName={filename}"
        print(f"Making request to: {request_url}")
        
        headers = self.get_options(flow_run_id)
        
        print("Sending GET request...")
        response = requests.get(
            request_url,
            headers=headers,
            verify=self.get_verify_value(),
            timeout=30  # Add timeout to prevent hanging forever
        )
        
        print(f"Response status: {response.status_code}")
        response.raise_for_status()
        return response.json()

    def delete_file(self, study_id: str, filename: str) -> dict:
        """
        Delete a file from Strategus results storage.
        
        Args:
            study_id: Study identifier
            filename: Name of the file to delete
            
        Returns:
            dict: Deletion response
        """
        request_url = f"{self.url}/delete?studyId={study_id}&fileName={filename}"

        response = requests.delete(
            request_url,
            headers=self.get_options(),
            verify=self.get_verify_value()
        )

        response.raise_for_status()
        return response.json()
