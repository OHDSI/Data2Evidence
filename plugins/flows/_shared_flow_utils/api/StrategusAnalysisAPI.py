import json
import requests

from _shared_flow_utils.api.BaseAPI import BaseAPI


class StrategusAnalysisAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("strategus-analysis")
        self.strategus_analysis_url = self.url + 'strategus/analysis'
        self.headers = self.get_options()

    def update_study_analysis(self, token_study_code: str, database_code: str, notebook_name: str, analysis_spec):
        result = requests.put(
            self.strategus_analysis_url,
            headers=self.headers,
            verify=self.get_verify_value(),
            json=({
                "tokenStudyCode": token_study_code,
                "analysisSpec": json.loads(analysis_spec),
                "databaseCode": database_code,
                "notebookName": notebook_name,
            })
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] StrategusAnalysisAPI - Failed to update strategus analysis specification for study '{token_study_code}'")
        else:
            return True
