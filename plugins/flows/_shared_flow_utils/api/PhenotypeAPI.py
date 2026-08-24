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
        self.webapi_url = self.get_service_route("webapi")
        self.tag_url = self.webapi_url + 'tag'
        self.headers = self.get_options()

    PHENOTYPE_LIBRARY_TAG_GROUP = "Phenotype Library"

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
        
    def _get_tags(self, dataset_id: str) -> list:
        """Every tag WebAPI knows about."""
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        response = requests.get(self.tag_url, headers=headers, verify=self.get_verify_value())
        if response.status_code != 200:
            raise Exception(f"Failed to list tags: {response.status_code} - {response.text}")
        return response.json()

    def _create_tag(self, dataset_id: str, name: str, group_ids: list = None) -> dict:
        """Create a tag, optionally as a member of the given groups.

        WebAPI forces every tag created here to TagType.CUSTOM and refuses one
        whose target group does not have allowCustom set, so the parent group has
        to be created with allowCustom=True or its children cannot be added.
        """
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        # A tag with no parent is the group itself: it needs allowCustom so the
        # status tags can be attached to it, and showGroup so Atlas renders it as
        # a heading. The status tags underneath want neither -- nothing should be
        # nested below them.
        is_group = not group_ids
        payload = {
            "name": name,
            "groups": [{"id": group_id} for group_id in (group_ids or [])],
            "allowCustom": is_group,
            "showGroup": is_group,
            "multiSelection": False,
            "permissionProtected": False,
            "mandatory": False,
        }
        response = requests.post(
            self.tag_url, headers=headers, json=payload, verify=self.get_verify_value()
        )
        if response.status_code not in [200, 201]:
            raise Exception(
                f"Failed to create tag '{name}': {response.status_code} - {response.text}"
            )
        return response.json()

    def ensure_status_tags(self, dataset_id: str, statuses) -> dict:
        """Ensure the tag tree exists and return {status: tagId}.

        Shape is 'Phenotype Library' as the parent group with one child per
        Phenotype Library status. Tag names are unique case-insensitively
        (tags_name_idx), so an existing tag is reused rather than recreated.
        """
        logger = get_run_logger()
        by_name = {tag["name"].lower(): tag for tag in self._get_tags(dataset_id)}

        group = by_name.get(self.PHENOTYPE_LIBRARY_TAG_GROUP.lower())
        if group is None:
            group = self._create_tag(dataset_id, self.PHENOTYPE_LIBRARY_TAG_GROUP)
            logger.info(f"Created tag group '{self.PHENOTYPE_LIBRARY_TAG_GROUP}' (id {group['id']})")

        status_tags = {}
        for status in sorted(set(statuses)):
            tag = by_name.get(status.lower())
            if tag is None:
                tag = self._create_tag(dataset_id, status, group_ids=[group["id"]])
                logger.info(f"Created status tag '{status}' (id {tag['id']}) under {self.PHENOTYPE_LIBRARY_TAG_GROUP}")
            status_tags[status] = tag["id"]

        return status_tags

    def assign_tag_to_cohorts(self, dataset_id: str, tag_id: int, cohort_ids: list) -> None:
        """Attach one tag to many cohort definitions in a single call.

        Deliberately not the per-cohort POST /cohortdefinition/{id}/tag: that is
        annotated @CacheEvict(allEntries=true), so tagging the library one cohort
        at a time would flush WebAPI's whole cohort list cache a thousand times.
        """
        if not cohort_ids:
            return
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        payload = {"tags": [tag_id], "assets": {"cohorts": list(cohort_ids)}}
        response = requests.post(
            f"{self.tag_url}/multiAssign",
            headers=headers,
            json=payload,
            verify=self.get_verify_value()
        )
        if response.status_code not in [200, 201, 204]:
            raise Exception(
                f"Failed to assign tag {tag_id} to {len(cohort_ids)} cohorts: "
                f"{response.status_code} - {response.text}"
            )

    def create_single_cohort_definition(self, cohort_def: dict, dataset_id: str, user_name: str,
                                        name_index: dict):
        logger = get_run_logger()
        current_time = int(time.time() * 1000)
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        
        # Parse the JSON expression
        expression = json.loads(cohort_def['json'])
        name = f"{cohort_def['cohortId']}_{cohort_def['cohortName']}"
        payload = {
            "id": 0,
            "name": name,
            "description": f"Phenotype Library cohort: {cohort_def['cohortName']}",
            "expressionType": "SIMPLE_EXPRESSION",
            "expression": expression,
            "createdBy": user_name,
            "createdDate": current_time,
            "modifiedBy": user_name,
            "modifiedDate": current_time,
            "tags": [],
        }
        # datasetId travels in the header, not the body.

        existing_id = name_index.get(name)
        verb = "Updating" if existing_id else "Creating"
        logger.info(f"{verb} cohort: {cohort_def['cohortName']} (ID: {cohort_def['cohortId']})")

        if existing_id:
            response = requests.put(
                f"{self.cohort_definition_url}/{existing_id}",
                headers=headers,
                json=payload,
                verify=self.get_verify_value()
            )

        else:
            response = requests.post(
                self.cohort_definition_url,
                headers=headers,
                json=payload,
                verify=self.get_verify_value()
            )
        
        if response.status_code in [200, 201]:
            result = response.json()
            name_index[name] = result["id"]
            logger.info(
                f"{'Updated' if existing_id else 'Created'} WebAPI cohort definition "
                f"{result["id"]} for phenotype cohort {cohort_def['cohortId']}"
            )
            return result
        else:
            error_msg = (
                f"Failed to {'update' if existing_id else 'create'} cohort "
                f"{cohort_def['cohortId']}: {response.status_code} - {response.text}"
            )
            logger.error(error_msg)
            raise Exception(error_msg)
