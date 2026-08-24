import requests
import time
import json
from prefect.logging import get_run_logger

from _shared_flow_utils.api.BaseAPI import BaseAPI
class PhenotypeAPI(BaseAPI):
    # The library import is ~1100 sequential writes, and the edge worker serving
    # them drops a connection every few hundred requests under that load
    # ("connection closed before message completed" / "error writing a body to
    # connection"). Without retries a single drop costs the whole run.
    WRITE_ATTEMPTS = 3
    RETRY_BACKOFF_SECONDS = 2

    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("d2e-webapi")  
        self.cohort_definition_url = self.url + 'cohortdefinition'
        self.headers = self.get_options()

    def get_cohort_name_index(self, dataset_id: str) -> dict:
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id

        response = requests.get(
            self.cohort_definition_url,
            headers=headers,
            verify=self.get_verify_value()
        )

        if response.status_code != 200:
            raise Exception(
                f"Failed to list cohort definitions: "
                f"{response.status_code} - {response.text}"
            )

        return {
            cohort["name"]: cohort["id"]
            for cohort in response.json()
            if cohort.get("name") is not None
        }
        
    def create_single_cohort_definition(self, cohort_def: dict, dataset_id: str, user_name: str,
                                        name_index: dict):
        logger = get_run_logger()
        current_time = int(time.time() * 1000)
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        
        # Parse the JSON expression
        expression = json.loads(cohort_def['json'])
        name = f"{cohort_def['cohortId']}_{cohort_def['cohortName']}"
        existing_id = name_index.get(name)
        payload = {
            "name": name,
            "description": f"Phenotype Library cohort: {cohort_def['cohortName']}",
            "expressionType": "SIMPLE_EXPRESSION",
            "expression": expression,
            "createdBy": user_name,
            "createdDate": current_time,
            "modifiedBy": user_name,
            "modifiedDate": current_time,
            # Inert. WebAPI ignores this field on create and update, and the
            # d2e-webapi plugin's schema only accepts strings here anyway
            # ("body/tags/0 Expected string, received object"). Tags are applied
            # separately via PhenotypeTagAPI.assign_tags_to_cohorts.
            "tags": [],
        }
        # datasetId travels in the header, not the body.

        verb = "Updating" if existing_id else "Creating"
        logger.info(f"{verb} cohort: {cohort_def['cohortName']} (ID: {cohort_def['cohortId']})")

        for attempt in range(1, self.WRITE_ATTEMPTS + 1):
            # Re-read each attempt: a previous attempt may have created the row
            # even though its reply was lost, in which case this becomes a PUT.
            existing_id = name_index.get(name)
            try:
                if existing_id:
                    payload["id"] = existing_id
                    response = requests.put(
                        f"{self.cohort_definition_url}/{existing_id}",
                        headers=headers,
                        json=payload,
                        verify=self.get_verify_value()
                    )
                else:
                    payload["id"] = 0
                    response = requests.post(
                        self.cohort_definition_url,
                        headers=headers,
                        json=payload,
                        verify=self.get_verify_value()
                    )
            except requests.exceptions.RequestException as request_error:
                reason = f"{type(request_error).__name__}: {request_error}"
                self._handle_write_failure(
                    logger, cohort_def, name, dataset_id, name_index, reason, attempt
                )
                continue

            if response.status_code in [200, 201]:
                result = response.json()
                name_index[name] = result["id"]
                logger.info(
                    f"{'Updated' if existing_id else 'Created'} WebAPI cohort definition "
                    f"{result["id"]} for phenotype cohort {cohort_def['cohortId']}"
                )
                return result

            if response.status_code < 500:
                # 4xx is the server rejecting the payload; retrying cannot help.
                error_msg = (
                    f"Failed to {'update' if existing_id else 'create'} cohort "
                    f"{cohort_def['cohortId']}: {response.status_code} - {response.text}"
                )
                logger.error(error_msg)
                raise Exception(error_msg)

            self._handle_write_failure(
                logger, cohort_def, name, dataset_id, name_index,
                f"{response.status_code} - {response.text}", attempt
            )

    def _handle_write_failure(self, logger, cohort_def, name, dataset_id,
                              name_index, reason, attempt):
        """Decide whether a failed write is worth another attempt.

        A dropped connection does not mean a dropped write -- a cohort that came
        back "500 connection closed before message completed" had already been
        committed. Since cohort names are globally unique (uq_cd_name), blindly
        re-POSTing would turn that success into a duplicate-name error, so re-read
        the name first and let the next attempt use PUT if the row is now there.
        """
        if attempt >= self.WRITE_ATTEMPTS:
            error_msg = (
                f"Failed to save cohort {cohort_def['cohortId']} after "
                f"{self.WRITE_ATTEMPTS} attempts: {reason}"
            )
            logger.error(error_msg)
            raise Exception(error_msg)

        logger.warning(
            f"Attempt {attempt}/{self.WRITE_ATTEMPTS} for cohort "
            f"{cohort_def['cohortId']} failed ({reason}); retrying"
        )
        time.sleep(self.RETRY_BACKOFF_SECONDS * attempt)

        try:
            refreshed = self.get_cohort_name_index(dataset_id)
        except Exception as lookup_error:
            logger.warning(f"Could not refresh the cohort name index: {lookup_error}")
            return
        if name in refreshed:
            name_index[name] = refreshed[name]
