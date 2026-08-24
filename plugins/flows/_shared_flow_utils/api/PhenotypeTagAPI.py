import requests
from prefect.logging import get_run_logger

from _shared_flow_utils.api.BaseAPI import BaseAPI


class PhenotypeTagAPI(BaseAPI):
    """Resolve WebAPI tags used by Phenotype Library cohort imports.

    Cohorts imported from the library carry two tags: a provenance tag naming the
    library, and a tag for the cohort's review status. Both live under a technical
    group that exists only to satisfy WebAPI's rule that every tag belongs to a
    group -- the group itself is never applied to a cohort.
    """

    # Both groups are seeded by
    # services/atlas-db-init/220_imported_cohort_metadata_tag_group.sql.
    # The split is deliberate: the source tag coexists with others, while the
    # status tags are mutually exclusive, and multi_selection is a property of
    # the group rather than of the tag.
    SOURCE_GROUP = "Imported Cohort Metadata"
    STATUS_GROUP = "Cohort Review Status"
    PHENOTYPE_LIBRARY_TAG = "Phenotype Library"

    def __init__(self):
        super().__init__()
        # The d2e-webapi plugin exposes no /tag routes, so tag work goes straight
        # to WebAPI through the d2e-compat shim, which performs the same token
        # exchange the plugin's own calls trigger.
        self.tag_url = self.get_service_route("webapi") + "tag"
        self.headers = self.get_options()

    def _get_tags(self, dataset_id: str) -> list:
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        response = requests.get(
            self.tag_url, headers=headers, verify=self.get_verify_value()
        )
        if response.status_code != 200:
            raise Exception(
                f"Failed to list tags: {response.status_code} - {response.text}"
            )
        return response.json()

    def _create_tag(self, dataset_id: str, name: str, group_id: int) -> dict:
        """Create a tag inside the technical group.

        groups must be non-empty: WebAPI returns 400 for an empty list and 500 if
        the field is missing, which is why the group is seeded in SQL rather than
        created here. allowCustom/showGroup are group-level concerns -- nothing
        nests below these tags.
        """
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        payload = {
            "name": name,
            # The nested "groups": [] is required, not noise. TagDTOToTagConverter
            # converts each group reference recursively through itself, and that
            # second pass dereferences source.getGroups() -- a group reference
            # without the field NPEs into a 500 ConversionFailedException.
            "groups": [{"id": group_id, "groups": []}],
            "allowCustom": False,
            "showGroup": False,
            "multiSelection": False,
            "permissionProtected": False,
            "mandatory": False,
        }
        response = requests.post(
            self.tag_url,
            headers=headers,
            json=payload,
            verify=self.get_verify_value(),
        )
        if response.status_code not in [200, 201]:
            raise Exception(
                f"Failed to create tag '{name}': "
                f"{response.status_code} - {response.text}"
            )
        return response.json()

    def _require_group(self, by_name: dict, group_name: str) -> dict:
        """Look up a seeded tag group, failing with something actionable."""
        group = by_name.get(group_name.lower())
        if group is None:
            # Not created here: WebAPI refuses to create a tag with no parent
            # group, so a root group cannot come from the API at all.
            raise Exception(
                f"Tag group '{group_name}' does not exist in WebAPI. It cannot be "
                f"created through the API; apply "
                f"services/atlas-db-init/220_imported_cohort_metadata_tag_group.sql "
                f"(restarting the webapi-init container does this) and retry."
            )
        if not group.get("allowCustom", False):
            raise Exception(
                f"Tag group '{group_name}' (id {group['id']}) has allowCustom "
                f"disabled, so tags cannot be attached to it."
            )
        return group

    def resolve_import_tags(self, dataset_id: str, statuses) -> tuple[dict, dict]:
        """Return the provenance tag and a {status: tag} map, creating what is missing.

        Tag names are unique case-insensitively (tags_name_idx on lower(name)), so
        an existing tag is reused rather than recreated.
        """
        logger = get_run_logger()
        by_name = {tag["name"].lower(): tag for tag in self._get_tags(dataset_id)}

        source_group = self._require_group(by_name, self.SOURCE_GROUP)
        status_group = self._require_group(by_name, self.STATUS_GROUP)

        wanted = [(self.PHENOTYPE_LIBRARY_TAG, source_group)]
        wanted += [(status, status_group) for status in sorted(set(statuses))]

        for name, group in wanted:
            if name.lower() not in by_name:
                by_name[name.lower()] = self._create_tag(dataset_id, name, group["id"])
                logger.info(f"Created cohort tag '{name}' under '{group['name']}'")

        status_tags = {
            status: by_name[status.lower()] for status in sorted(set(statuses))
        }
        return by_name[self.PHENOTYPE_LIBRARY_TAG.lower()], status_tags

    def assign_tag_to_cohort(
        self, dataset_id: str, cohort_definition_id: int, tag_id: int
    ) -> None:
        """Attach one tag to one cohort definition.

        WebAPI ignores the tags field on cohort create/update, so tags have to be
        applied through this dedicated route. The body is a bare JSON integer --
        the handler signature is `@RequestBody final int tagId`, not an object.

        Re-assigning a tag the cohort already carries is a no-op, which keeps flow
        re-runs safe. Assigning a status also retires whichever status the cohort
        carried before: AbstractDaoService.assignTag clears the other tags in a
        single-selection group, and the status group is declared that way.
        """
        headers = self.headers.copy()
        headers["datasetId"] = dataset_id
        url = (
            f"{self.get_service_route('webapi')}cohortdefinition/"
            f"{cohort_definition_id}/tag"
        )
        response = requests.post(
            url,
            headers=headers,
            json=tag_id,
            verify=self.get_verify_value(),
        )
        if response.status_code not in [200, 201, 204]:
            raise Exception(
                f"Failed to assign tag {tag_id} to cohort definition "
                f"{cohort_definition_id}: {response.status_code} - {response.text}"
            )
