import requests

from shared_utils.api.BaseAPI import BaseAPI

class DicomServerAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("dicomServer")

    def get_uploaded_file_name(self, instance_id: str) -> str:
        url = f"{self.url}instances/{instance_id}"
        response = requests.get(
            url,
            verify=self.get_verify_value()
        )
        if ((response.status_code >= 400) and (response.status_code < 600)):
            raise Exception(
                f"DicomServerAPI failed to return instance information, {response.content}")
        else:
            file_name = response.json()['FileUuid']
            return str(file_name) + ".dcm"
