import requests
import time
import json
from prefect.logging import get_run_logger

from _shared_flow_utils.api.BaseAPI import BaseAPI
class PhenotypeAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("d2e-webapi")  
        self.cohort_definition_url = self.url + 'cohortdefinition'
        self.headers = self.get_options()
        
    def create_single_cohort_definition(self, cohort_def, dataset_id, user_name):
        logger = get_run_logger()
        current_time = int(time.time() * 1000)
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        
        # Parse the JSON expression
        expression = json.loads(cohort_def['json'])
        payload = {
            "id": cohort_def['cohortId'],
            "name": f"{cohort_def['cohortId']}_{cohort_def['cohortName']}",
            "description": f"Phenotype Library cohort: {cohort_def['cohortName']}",
            "expressionType": "SIMPLE_EXPRESSION",
            "expression": expression,
            "createdBy": user_name,
            "createdDate": current_time,
            "modifiedBy": user_name,
            "modifiedDate": current_time,
            "datasetId": dataset_id,
            "tags": ["phenotype_library"],
        }
        
        logger.info(f"Creating cohort: {cohort_def['cohortName']} (ID: {cohort_def['cohortId']})")
        response = requests.post(
            self.cohort_definition_url, 
            headers=headers, 
            json=payload, 
            verify=self.get_verify_value()
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            logger.info(f"Successfully created cohort {cohort_def['cohortId']}")
            return result
        else:
            error_msg = f"Failed to create cohort {cohort_def['cohortId']}: {response.status_code} - {response.text}"
            logger.error(error_msg)
            raise Exception(error_msg)
