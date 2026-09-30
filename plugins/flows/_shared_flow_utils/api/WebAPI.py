import json
import requests

from _shared_flow_utils.api.BaseAPI import BaseAPI

class WebAPI(BaseAPI):
    def __init__(self, flow_run_id = None):
        super().__init__()
        self.url = self.get_service_route("d2e-webapi")
        # OHDSI WebAPI itself: the d2e-webapi wrapper only exposes the endpoints it
        # models, so the cache endpoints below are called on WebAPI directly.
        self.webapi_url = self.get_service_route("webapi")
        self.headers = self.get_options(flow_run_id)

    def clear_cdmresults_cache(self, path: str) -> None:
        """
        Drop WebAPI's cached CDM results reports, via a path built by the caller
        (see data_characterization_plugin.utils.cdmresults_clear_cache_path).
        """
        url = f"{self.webapi_url}{path}"
        result = requests.post(
            url,
            headers=self.headers,
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"WebAPI failed to clear the cdm results cache ({url}): "
                f"{result.status_code} {result.content}"
            )

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
