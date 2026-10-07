from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from data_management_plugin import flow as plugin_flow
from data_management_plugin.types import DataModelType, FlowActionType

DISPATCH = {
    FlowActionType.CREATE_DATA_MODEL: "create_datamodel_flow",
    FlowActionType.UPDATE_DATA_MODEL: "update_datamodel_flow",
    FlowActionType.CHANGELOG_SYNC: "update_datamodel_flow",
    FlowActionType.GET_VERSION_INFO: "get_version_info_flow",
    FlowActionType.CREATE_CDMSCHEMA: "create_cdm_schema",
}


def _options(**overrides):
    values = dict(
        flow_action_type=FlowActionType.CREATE_DATA_MODEL, database_code="db1", cache_id="c1",
        data_model="omop5-4", schema_name="s1", vocab_schema="v1", update_count=2, datasets=[{"id": 1}],
        flow_name="data_management_plugin",
    )
    values.update(overrides)
    options = MagicMock(**values)
    options.json.return_value = "{}"
    return options


@pytest.mark.parametrize("action,handler", DISPATCH.items())
def test_the_flow_dispatches_each_action_to_its_handler(action, handler):
    options = DataModelType(flow_action_type=action, database_code="db1")

    handlers = {name: MagicMock() for name in set(DISPATCH.values())}
    with patch.object(plugin_flow, "get_run_logger") as get_logger, patch.multiple(plugin_flow, **handlers):
        plugin_flow.data_management_plugin.fn(options)

    handlers[handler].assert_called_once_with(options, get_logger.return_value)
    for name, mock in handlers.items():
        assert mock.called is (name == handler)


def test_the_flow_rejects_an_unsupported_action():
    options = SimpleNamespace(flow_action_type="rollback_count")

    with patch.object(plugin_flow, "get_run_logger") as get_logger:
        with pytest.raises(ValueError, match="'rollback_count' not supported"):
            plugin_flow.data_management_plugin.fn(options)

    assert "create_datamodel" in get_logger.return_value.error.call_args.args[0]


def test_create_datamodel_flow_forwards_the_options():
    logger = MagicMock()

    with patch.object(plugin_flow, "get_db_dialect", return_value="hana") as dialect, \
         patch.object(plugin_flow, "create_datamodel") as create:
        plugin_flow.create_datamodel_flow(_options(), logger)

    dialect.assert_called_once()
    create.assert_called_once_with(
        database_code="db1", data_model="omop5-4", schema_name="s1", vocab_schema="v1", count=2, dialect="hana")


def test_update_datamodel_flow_forwards_the_action_and_options():
    with patch.object(plugin_flow, "get_db_dialect", return_value="postgres"), \
         patch.object(plugin_flow, "update_datamodel") as update:
        plugin_flow.update_datamodel_flow(
            _options(flow_action_type=FlowActionType.CHANGELOG_SYNC), MagicMock())

    update.assert_called_once_with(
        flow_action_type=FlowActionType.CHANGELOG_SYNC, database_code="db1", data_model="omop5-4",
        schema_name="s1", vocab_schema="v1", dialect="postgres")


def test_get_version_info_flow_forwards_the_datasets_and_cache_id():
    with patch.object(plugin_flow, "get_version_info_tasks") as tasks:
        plugin_flow.get_version_info_flow(_options(), MagicMock())

    tasks.assert_called_once_with(dataset_list=[{"id": 1}], cache_id="c1")


def test_create_cdm_schema_forwards_the_options():
    with patch.object(plugin_flow, "get_db_dialect", return_value="postgres"), \
         patch.object(plugin_flow, "create_cdm_schema_tasks") as create:
        plugin_flow.create_cdm_schema(_options(), MagicMock())

    create.assert_called_once_with(
        database_code="db1", data_model="omop5-4", schema_name="s1", vocab_schema="v1", dialect="postgres")


@pytest.mark.parametrize("handler,target", [
    (plugin_flow.create_datamodel_flow, "create_datamodel"),
    (plugin_flow.update_datamodel_flow, "update_datamodel"),
    (plugin_flow.get_version_info_flow, "get_version_info_tasks"),
    (plugin_flow.create_cdm_schema, "create_cdm_schema_tasks"),
])
def test_handlers_log_and_reraise_failures(handler, target):
    logger = MagicMock()
    error = RuntimeError("boom")

    with patch.object(plugin_flow, "get_db_dialect", return_value="postgres"), \
         patch.object(plugin_flow, target, side_effect=error):
        with pytest.raises(RuntimeError, match="boom"):
            handler(_options(), logger)

    logger.error.assert_called_once_with(error)
