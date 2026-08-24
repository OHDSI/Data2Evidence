import json
import unittest

import requests
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
    def test_multi_assign_sends_tags_and_cohorts_in_one_call(self, post):
        post.return_value = Mock(status_code=200, text="")

        self.api.assign_tags_to_cohorts("dataset-1", [11], [456, 457, 458])

        self.assertEqual("https://webapi/tag/multiAssign", post.call_args.args[0])
        self.assertEqual(
            {"tags": [11], "assets": {"cohorts": [456, 457, 458]}},
            post.call_args.kwargs["json"],
        )

    @patch("_shared_flow_utils.api.PhenotypeTagAPI.requests.post")
    def test_multi_assign_skips_empty_input(self, post):
        self.api.assign_tags_to_cohorts("dataset-1", [11], [])
        self.api.assign_tags_to_cohorts("dataset-1", [], [456])
        post.assert_not_called()


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


    @patch("_shared_flow_utils.api.PhenotypeAPI.time.sleep", Mock())
    @patch("_shared_flow_utils.api.PhenotypeAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.get")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.post")
    def test_retries_a_dropped_connection(self, post, get, get_run_logger):
        # First attempt dies mid-flight; the name index shows nothing was written,
        # so the second attempt is another POST and succeeds.
        post.side_effect = [
            requests.exceptions.ConnectionError("connection closed"),
            Mock(status_code=201, json=Mock(return_value={"id": 456})),
        ]
        get.return_value = Mock(status_code=200, json=Mock(return_value=[]))

        result = self.api.create_single_cohort_definition(
            self.cohort, "dataset-1", "user", {}
        )

        self.assertEqual(456, result["id"])
        self.assertEqual(2, post.call_count)

    @patch("_shared_flow_utils.api.PhenotypeAPI.time.sleep", Mock())
    @patch("_shared_flow_utils.api.PhenotypeAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.put")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.get")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.post")
    def test_lost_reply_that_actually_wrote_becomes_an_update(
        self, post, get, put, get_run_logger
    ):
        # The POST reply is lost but the row landed: the refreshed index finds it,
        # so the retry must PUT rather than POST again into uq_cd_name.
        post.return_value = Mock(status_code=500, text="connection closed")
        get.return_value = Mock(
            status_code=200,
            json=Mock(return_value=[{"id": 456, "name": "123_Type 2 diabetes"}]),
        )
        put.return_value = Mock(status_code=200, json=Mock(return_value={"id": 456}))

        result = self.api.create_single_cohort_definition(
            self.cohort, "dataset-1", "user", {}
        )

        self.assertEqual(456, result["id"])
        self.assertEqual(1, post.call_count)
        self.assertEqual(1, put.call_count)

    @patch("_shared_flow_utils.api.PhenotypeAPI.time.sleep", Mock())
    @patch("_shared_flow_utils.api.PhenotypeAPI.get_run_logger")
    @patch("_shared_flow_utils.api.PhenotypeAPI.requests.post")
    def test_4xx_is_not_retried(self, post, get_run_logger):
        post.return_value = Mock(status_code=400, text="bad payload")

        with self.assertRaises(Exception):
            self.api.create_single_cohort_definition(
                self.cohort, "dataset-1", "user", {}
            )

        self.assertEqual(1, post.call_count)


if __name__ == "__main__":
    unittest.main()
