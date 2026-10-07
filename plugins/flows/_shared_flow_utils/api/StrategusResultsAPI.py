import json
import requests

from _shared_flow_utils.api.BaseAPI import BaseAPI


class StrategusResultsAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("strategus-analysis") + "strategus/results"

    def upload_result(self, zip_path: str, name: str, metadata: dict, flow_run_id=None):
        headers = self.get_options(flow_run_id)
        # multipart/form-data — do not set Content-Type manually (requests sets boundary)
        headers.pop("Content-Type", None)

        with open(zip_path, "rb") as f:
            filename = zip_path.split("/")[-1]
            result = requests.post(
                self.url,
                headers=headers,
                verify=self.get_verify_value(),
                files={"file": (filename, f, "application/zip")},
                data={
                    "name": name,
                    "metadata": json.dumps(metadata),
                },
            )

        if result.status_code >= 400:
            raise Exception(
                f"[{result.status_code}] StrategusResultsAPI - Failed to upload result '{name}': {result.text}"
            )
        return result.json()
