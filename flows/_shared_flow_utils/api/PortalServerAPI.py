import requests
import os

from _shared_flow_utils.api.BaseAPI import BaseAPI


class PortalServerAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("portalServer")
        self.datasets_url = self.url + 'dataset/list/systemadmin'
        self.dataset_attributes_url = self.url + 'dataset/attribute'
        self.headers = self.get_options()

    def get_datasets_from_portal(self):
        result = requests.get(
            self.datasets_url,
            headers=self.headers,
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] PortalServerAPI Failed to retrieve datasets from portal")
        else:
            datasets_list = result.json()
            return datasets_list

    def update_dataset_attributes_table(self, study_id: str, attribute_id: str, attribute_value: str | None):
        result = requests.put(
            self.dataset_attributes_url,
            headers=self.headers,
            verify=self.get_verify_value(),
            json={"studyId": str(
                study_id), "attributeId": attribute_id, "value": attribute_value}
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] PortalServerAPI - Failed to update dataset attribute '{attribute_id}' for study '{study_id}'")
        else:
            return True

    def upload_dataset_file(self, datasetId: str, file_path: str, content_type: str = 'application/zip') -> dict:
        """
        Upload a file to a dataset.

        Args:
            datasetId: The dataset ID to upload to
            file_path: Path to the file to upload
            content_type: Content type of the file (defaults to 'application/zip')
        Returns:
            dict: Response from the server
        """
        request_url = f"{self.url}dataset/resource?datasetId={datasetId}"
        headers = self.headers.copy()
        headers.pop("Content-Type", None)

        # Validate file exists
        if not os.path.isfile(file_path):
            raise ValueError(f"File not found: {file_path}")

        filename = os.path.basename(file_path)

        try:
            # Keep file open during the entire request
            with open(file_path, "rb") as file:
                files = {"file": (filename, file, content_type)}

                response = requests.post(
                    request_url,
                    headers=headers,
                    files=files,
                    verify=self.get_verify_value(),
                )

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed for file {file_path}: {e}")
        except Exception as e:
            raise Exception(f"Failed to upload file {file_path}: {e}")
