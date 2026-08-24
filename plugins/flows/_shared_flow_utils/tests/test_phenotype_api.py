import json
import unittest
from unittest.mock import Mock, patch

from _shared_flow_utils.api.PhenotypeAPI import PhenotypeAPI
from _shared_flow_utils.api.PhenotypeTagAPI import PhenotypeTagAPI

SOURCE_GROUP = {"id": 9, "name": "Imported Cohort Metadata", "allowCustom": True}
STATUS_GROUP = {"id": 8, "name": "Cohort Review Status", "allowCustom": True}
PROVENANCE = {"id": 10, "name": "Phenotype Library"}
ACCEPTED = {"id": 11, "name": "Accepted"}
WITHDRAWN = {"id": 12, "name": "Withdrawn"}


class PhenotypeTagAPITest(unittest.TestCase):
    def setUp(self):
        self.api = PhenotypeTagAPI.__new__(PhenotypeTagAPI)
        self.api.headers = {"Authorization": "Bearer test"}
        self.api.tag_url = "https://webapi/tag"
        self.api.get_verify_value = Mock(return_value=False)
        self.api.get_service_route = Mock(return_value="https://webapi/")

    @patch("_shared_flow_utils.api.PhenotypeTagAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.post")
    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.get")
    def test_reuses_existing_and_creates_missing_under_group(
        self, get, post, get_run_logger
    ):
        get.return_value = Mock(
            status_code=200,
            json=Mock(return_value=[SOURCE_GROUP, STATUS_GROUP, PROVENANCE]),
        )
        post.return_value = Mock(status_code=201, json=Mock(return_value=ACCEPTED))

        provenance, status_tags = self.api.resolve_import_tags(
            "dataset-1", {"Accepted"}
        )

        self.assertEqual(PROVENANCE, provenance)
        self.assertEqual(ACCEPTED, status_tags["Accepted"])
        # Only the missing status tag is created; the provenance tag is reused.
        post.assert_called_once()
        payload = post.call_args.kwargs["json"]
        self.assertEqual("Accepted", payload["name"])
        # Status tags belong to the single-selection status group, which is what
        # makes WebAPI retire the previous status on re-import. The nested empty
        # "groups" is required too: the DTO->entity converter recurses into each
        # group reference and NPEs if that field is absent.
        self.assertEqual(
            [{"id": STATUS_GROUP["id"], "groups": []}], payload["groups"]
        )

    @patch("_shared_flow_utils.api.PhenotypeTagAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.get")
    def test_missing_group_raises_actionable_error(self, get, get_run_logger):
        get.return_value = Mock(status_code=200, json=Mock(return_value=[]))

        with self.assertRaises(Exception) as ctx:
            self.api.resolve_import_tags("dataset-1", {"Accepted"})

        message = str(ctx.exception)
        self.assertIn("Imported Cohort Metadata", message)
        self.assertIn("220_imported_cohort_metadata_tag_group.sql", message)

    @patch("_shared_flow_utils.api.PhenotypeTagAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.get")
    def test_group_without_allow_custom_raises(self, get, get_run_logger):
        group = dict(SOURCE_GROUP, allowCustom=False)
        get.return_value = Mock(
            status_code=200, json=Mock(return_value=[group, STATUS_GROUP])
        )

        with self.assertRaises(Exception) as ctx:
            self.api.resolve_import_tags("dataset-1", {"Accepted"})

        self.assertIn("allowCustom", str(ctx.exception))

    @patch("_shared_flow_utils.api.PhenotypeTagAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.post")
    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.get")
    def test_provenance_tag_goes_under_the_source_group(
        self, get, post, get_run_logger
    ):
        get.return_value = Mock(
            status_code=200,
            json=Mock(return_value=[SOURCE_GROUP, STATUS_GROUP, ACCEPTED]),
        )
        post.return_value = Mock(status_code=201, json=Mock(return_value=PROVENANCE))

        self.api.resolve_import_tags("dataset-1", {"Accepted"})

        post.assert_called_once()
        payload = post.call_args.kwargs["json"]
        self.assertEqual("Phenotype Library", payload["name"])
        # Source group, not the status group -- it must survive a status change.
        self.assertEqual(
            [{"id": SOURCE_GROUP["id"], "groups": []}], payload["groups"]
        )

    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.post")
    def test_assign_tag_posts_bare_integer(self, post):
        post.return_value = Mock(status_code=200, text="")

        self.api.assign_tag_to_cohort("dataset-1", 456, 11)

        self.assertEqual(
            "https://webapi/cohortdefinition/456/tag", post.call_args.args[0]
        )
        # The handler signature is `@RequestBody final int tagId` -- a bare int,
        # not an object.
        self.assertEqual(11, post.call_args.kwargs["json"])


class PhenotypeAPITest(unittest.TestCase):
    def setUp(self):
        self.api = PhenotypeAPI.__new__(PhenotypeAPI)
        self.api.headers = {"Authorization": "Bearer test"}
        self.api.cohort_definition_url = "https://d2e-webapi/cohortdefinition"
        self.api.get_verify_value = Mock(return_value=False)
        self.cohort = {
            "cohortId": 123,
            "cohortName": "Type 2 diabetes",
            "json": json.dumps({"PrimaryCriteria": {}}),
            "status": "Accepted",
        }

    @patch("_shared_flow_utils.api.PhenotypeAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.post")
    def test_create_uses_zero_id_and_sends_no_tags(self, post, get_run_logger):
        post.return_value = Mock(status_code=201, json=Mock(return_value={"id": 456}))

        self.api.create_single_cohort_definition(self.cohort, "dataset-1", "user", {})

        payload = post.call_args.kwargs["json"]
        self.assertEqual(0, payload["id"])
        # WebAPI ignores tags here and the plugin schema only accepts strings, so
        # the key must be present but empty; tags are applied via PhenotypeTagAPI.
        self.assertEqual([], payload["tags"])

    @patch("_shared_flow_utils.api.PhenotypeAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.put")
    def test_update_uses_existing_id_and_sends_no_tags(self, put, get_run_logger):
        put.return_value = Mock(status_code=200, json=Mock(return_value={"id": 456}))

        self.api.create_single_cohort_definition(
            self.cohort, "dataset-1", "user", {"123_Type 2 diabetes": 456}
        )

        self.assertEqual(
            "https://d2e-webapi/cohortdefinition/456", put.call_args.args[0]
        )
        payload = put.call_args.kwargs["json"]
        self.assertEqual(456, payload["id"])
        self.assertEqual([], payload["tags"])

    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.get")
    def test_name_index_maps_name_to_id(self, get):
        get.return_value = Mock(
            status_code=200,
            json=Mock(return_value=[{"id": 456, "name": "123_Type 2 diabetes"}]),
        )

        self.assertEqual(
            {"123_Type 2 diabetes": 456}, self.api.get_cohort_name_index("dataset-1")
        )


if __name__ == "__main__":
    unittest.main()
