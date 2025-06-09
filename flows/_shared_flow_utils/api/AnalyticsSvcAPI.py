import json
import requests

from _shared_flow_utils.api.BaseAPI import BaseAPI

class AnalyticsSvcAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = f"{self.get_service_route("analytics")}/analytics-svc/"
        self.headers = self.get_options()

    def create_cohort_definition(self, datasetId: str,
                                 description: str,
                                 syntax: str,
                                 name: str) -> int:
        url = f"{self.url}api/services/cohort-definition"
        data = {
            "studyId": datasetId,
            "name": name,
            "description": description,
            "syntax": syntax
        }
        result = requests.post(
            url,
            headers=self.headers,
            json=data,
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"AnalyticsSvcAPI Failed to create create_cohort_definition schema, {result.content}")
        else:
            cohortDefinitionId = json.loads(result.content)['data']
            return cohortDefinitionId
        

    def get_db_owner_schema(self, datasetId: str) -> int:
        url = f"{self.url}pa/services/sessionVars?datasetId={datasetId}"
        result = requests.get(
            url,
            headers=self.headers,
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"AnalyticsSvcAPI Failed to get get_db_owner_schema, {result.content}")
        else:
            dbOwnerSchemaName = json.loads(result.content)['data'][0]['DB_USER_NAME']
            print(f"Inside analyticssvcapi {dbOwnerSchemaName}")
            return dbOwnerSchemaName
