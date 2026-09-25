from unittest.mock import patch

import pytest

from data_management_plugin import dataset
from data_management_plugin.types import FlowActionType


@pytest.mark.parametrize("action,record_only", [
    (FlowActionType.UPDATE_DATA_MODEL, False),
    (FlowActionType.CHANGELOG_SYNC, True),
])
def test_update_datamodel_only_records_changesets_for_changelog_sync(action, record_only):
    with patch.object(dataset, "DBDao"), \
         patch.object(dataset, "run_sql_migration_task") as task_mock, \
         patch.object(dataset, "get_run_logger"):
        dataset.update_datamodel(
            flow_action_type=action, database_code="db1", data_model="medical-imaging",
            schema_name="s1", vocab_schema="s1", dialect="postgres",
        )

    kwargs = task_mock.with_options.return_value.call_args.kwargs
    assert kwargs["record_only"] is record_only
    assert (kwargs["data_model"], kwargs["schema_name"], kwargs["dialect"]) == ("medical-imaging", "s1", "postgres")
