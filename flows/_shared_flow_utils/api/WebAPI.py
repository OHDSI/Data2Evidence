import json
import requests

from _shared_flow_utils.api.BaseAPI import BaseAPI

class WebAPI(BaseAPI):
    def __init__(self, flow_run_id = None):
        super().__init__()
        self.url = f"{self.get_service_route("d2e-webapi")}"
        self.headers = self.get_options(flow_run_id)

    def get_cohort_definition(self, cohortDefinitionId: int, datasetId: str) -> dict:
        url = f"{self.url}cohortdefinition/{cohortDefinitionId}"
        self.headers["datasetId"] = datasetId
        result = requests.get(
            url,
            headers=self.headers,
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"WebAPI Failed to get get_cohort_definition, {result.content}"
            )
        else:
            c = json.loads(result.content)
            return c
