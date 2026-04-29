import requests
from prefect.logging import get_run_logger
from _shared_flow_utils.api.BaseAPI import BaseAPI
from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI

class FhirAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("fhirGateway")
        self.logger = get_run_logger()

    def get_options(self):
        bearer_token = f"Bearer {OpenIdAPI().get_client_credential_token()}"
        return {
            "Content-Type": "application/json",
            "Authorization": bearer_token
        }
    
    def post(self, study_token: str, resource_type: str, resource):
        url = f"{self.url}project/{study_token}/{resource_type}"
        result = requests.post(
            url,
            headers=self.get_options(),
            verify=self.get_verify_value(),
            json=resource
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] FhirAPI - Failed to post FHIR resource")
        else:
            return True

    def get(self, resource_type: str, query: str):
        url = f"{self.url}superadmin/{resource_type}{query}"
        result = requests.get(
            url,
            headers=self.get_options(),
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] FhirAPI - Failed to get FHIR resource")
        else:
            return result.json()