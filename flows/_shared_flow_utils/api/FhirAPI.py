import requests

from _shared_flow_utils.api.BaseAPI import BaseAPI


class FhirAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("fhirSvc")
        self.headers = self.get_options()

    def post(self, studyToken: str, resourceType: str, resource):
        url = f"{self.url}{resourceType}/{studyToken}"
        result = requests.post(
            url,
            headers=self.headers,
            verify=self.get_verify_value(),
            json=resource
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] FhirAPI - Failed to post FHIR resource")
        else:
            return True
