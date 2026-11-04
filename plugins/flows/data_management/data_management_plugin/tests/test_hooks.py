from unittest.mock import MagicMock, patch

import pytest
from prefect.server.schemas.states import StateType

from data_management_plugin import hooks

HOOKS = [
    (hooks.create_dataset_schema_hook, {"schema_dao": MagicMock()}),
    (hooks.update_cdm_version_hook, {"db": "db1", "schema": "s1"}),
    (hooks.update_schema_hook, {"db": "db1", "schema": "s1"}),
]


@pytest.mark.parametrize("hook,kwargs", HOOKS)
@pytest.mark.parametrize("state_type,logs", [
    (StateType.COMPLETED, True),
    (StateType.FAILED, True),
    (StateType.RUNNING, False),
])
def test_hooks_log_only_for_completed_and_failed_tasks(hook, kwargs, state_type, logs):
    task, task_run = MagicMock(), MagicMock()

    with patch.object(hooks, "task_run_logger") as logger_factory:
        hook(task, task_run, MagicMock(type=state_type), **kwargs)

    logger_factory.assert_called_once_with(task_run, task)
    assert logger_factory.return_value.info.called is logs
