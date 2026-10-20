from contextlib import ExitStack
from datetime import datetime
from functools import partial
from unittest.mock import MagicMock, patch

import pytest

from data_management_plugin import dataset
from data_management_plugin.types import FlowActionType

TASKS = [
    "create_schema_task",
    "run_sql_migration_task",
    "enable_and_create_audit_policies_task",
    "create_and_assign_roles_task",
    "insert_cdm_version",
    "update_cdm_version",
]


@pytest.fixture
def mocked():
    """Prefect tasks, the DAO and the logger replaced by mocks; each task's configured callable is
    `mocks[name].with_options.return_value` and records into `mocks["order"]`."""
    with ExitStack() as stack:
        mocks = {name: stack.enter_context(patch.object(dataset, name)) for name in TASKS}
        mocks["dbdao_class"] = stack.enter_context(patch.object(dataset, "DBDao"))
        mocks["dao"] = mocks["dbdao_class"].return_value
        mocks["logger"] = stack.enter_context(patch.object(dataset, "get_run_logger")).return_value
        mocks["order"] = order = []
        for name in TASKS:
            mocks[name].with_options.return_value.side_effect = (
                lambda *a, _name=name, **k: order.append(_name))
        yield mocks


def _create(data_model="medical-imaging", **overrides):
    args = dict(dialect="postgres", database_code="db1", data_model=data_model,
                schema_name="s1", vocab_schema="v1", count=0)
    args.update(overrides)
    return dataset.create_schema_tasks(**args)


def _update(action=FlowActionType.UPDATE_DATA_MODEL, data_model="medical-imaging"):
    return dataset.update_datamodel(
        flow_action_type=action, database_code="db1", data_model=data_model,
        schema_name="s1", vocab_schema="v1", dialect="postgres")


def _hook(mocks, task_name, kind):
    (hook,) = mocks[task_name].with_options.call_args.kwargs[kind]
    assert isinstance(hook, partial)
    return hook


# --- create_datamodel ---

def test_create_datamodel_delegates_to_create_schema_tasks():
    with patch.object(dataset, "create_schema_tasks") as create_schema_tasks:
        dataset.create_datamodel("db1", "omop5-4", "s1", "v1", "postgres", count=2)

    create_schema_tasks.assert_called_once_with(
        dialect="postgres", database_code="db1", data_model="omop5-4",
        schema_name="s1", vocab_schema="v1", count=2)


# --- create_schema_tasks ---

def test_create_schema_tasks_runs_the_steps_in_order_for_a_non_omop_model(mocked):
    assert _create("medical-imaging") is True

    assert mocked["order"] == [
        "create_schema_task", "run_sql_migration_task",
        "enable_and_create_audit_policies_task", "create_and_assign_roles_task",
    ]
    mocked["dbdao_class"].assert_called_once_with(database_code="db1")
    mocked["create_schema_task"].with_options.return_value.assert_called_once_with(mocked["dao"], "s1")
    mocked["run_sql_migration_task"].with_options.return_value.assert_called_once_with(
        dbdao=mocked["dao"], schema_name="s1", data_model="medical-imaging",
        dialect="postgres", vocab_schema="v1", count=0)
    mocked["enable_and_create_audit_policies_task"].with_options.return_value.assert_called_once_with(mocked["dao"], "s1")
    mocked["create_and_assign_roles_task"].with_options.return_value.assert_called_once_with(mocked["dao"], "s1")


@pytest.mark.parametrize("data_model,cdm_version", [
    ("omop5-4", "5.4"), ("waveform", "5.4"), ("omop", "5.3"), ("custom-omop-ms", "5.3"),
])
def test_create_schema_tasks_records_the_cdm_version_for_omop_models(mocked, data_model, cdm_version):
    _create(data_model)

    assert mocked["order"][-1] == "insert_cdm_version"
    mocked["insert_cdm_version"].with_options.return_value.assert_called_once_with(
        mocked["dao"], "s1", cdm_version)


def test_create_schema_tasks_does_not_record_a_cdm_version_for_other_models(mocked):
    _create("medical-imaging")

    mocked["insert_cdm_version"].with_options.assert_not_called()


def test_create_schema_tasks_drops_the_schema_when_a_later_step_fails(mocked):
    _create("omop5-4")

    for task_name in ("run_sql_migration_task", "enable_and_create_audit_policies_task",
                      "create_and_assign_roles_task"):
        hook = _hook(mocked, task_name, "on_failure")
        assert hook.func is dataset.drop_schema_hook
        assert hook.keywords == {"dbdao": mocked["dao"], "schema": "s1"}


def test_create_schema_tasks_wires_the_schema_and_version_hooks(mocked):
    _create("omop5-4")

    for kind in ("on_completion", "on_failure"):
        schema_hook = _hook(mocked, "create_schema_task", kind)
        assert schema_hook.func is dataset.create_dataset_schema_hook
        assert schema_hook.keywords == {"schema_dao": mocked["dao"]}

        version_hook = _hook(mocked, "insert_cdm_version", kind)
        assert version_hook.func is dataset.update_cdm_version_hook
        assert version_hook.keywords == {"db": "db1", "schema": "s1"}


def test_create_schema_tasks_stops_and_reraises_when_the_migration_fails(mocked):
    mocked["run_sql_migration_task"].with_options.return_value.side_effect = RuntimeError("changeset failed")

    with pytest.raises(RuntimeError, match="changeset failed"):
        _create("omop5-4")

    assert "create_and_assign_roles_task" not in mocked["order"]
    assert "insert_cdm_version" not in mocked["order"]


def test_create_schema_tasks_passes_the_update_count_through(mocked):
    _create(count=4)

    assert mocked["run_sql_migration_task"].with_options.return_value.call_args.kwargs["count"] == 4


# --- update_datamodel ---

def test_update_datamodel_hooks_report_completion_and_failure(mocked):
    _update()

    for kind in ("on_completion", "on_failure"):
        hook = _hook(mocked, "run_sql_migration_task", kind)
        assert hook.func is dataset.update_schema_hook
        assert hook.keywords == {"db": "db1", "schema": "s1"}
    mocked["logger"].info.assert_called_with("Dataset schema successfully updated!")


def test_update_datamodel_skips_the_cdm_version_for_non_omop_models(mocked):
    _update(data_model="medical-imaging")

    mocked["dao"].get_table_row_count.assert_not_called()
    mocked["insert_cdm_version"].assert_not_called()
    mocked["update_cdm_version"].with_options.assert_not_called()


def test_update_datamodel_inserts_the_cdm_version_when_cdm_source_is_empty(mocked):
    mocked["dao"].get_table_row_count.return_value = 0

    _update(data_model="omop5-4")

    mocked["dao"].get_table_row_count.assert_called_once_with("s1", "cdm_source")
    mocked["insert_cdm_version"].assert_called_once_with(mocked["dao"], "s1", "5.4")
    mocked["update_cdm_version"].with_options.assert_not_called()


def test_update_datamodel_updates_the_cdm_version_when_cdm_source_has_rows(mocked):
    mocked["dao"].get_table_row_count.return_value = 1

    _update(data_model="waveform")

    mocked["insert_cdm_version"].assert_not_called()
    mocked["update_cdm_version"].with_options.return_value.assert_called_once_with(mocked["dao"], "s1", "5.4")
    for kind in ("on_completion", "on_failure"):
        hook = _hook(mocked, "update_cdm_version", kind)
        assert hook.func is dataset.update_cdm_version_hook
        assert hook.keywords == {"db": "db1", "schema": "s1"}


def test_update_datamodel_logs_and_reraises_when_the_migration_fails(mocked):
    mocked["run_sql_migration_task"].with_options.return_value.side_effect = RuntimeError("changeset failed")

    with pytest.raises(RuntimeError, match="changeset failed"):
        _update(data_model="omop5-4")

    mocked["logger"].error.assert_called_once()
    assert "changeset failed" in mocked["logger"].error.call_args.args[0]
    mocked["dao"].get_table_row_count.assert_not_called()


@pytest.mark.parametrize("action,record_only", [
    (FlowActionType.UPDATE_DATA_MODEL, False),
    (FlowActionType.CHANGELOG_SYNC, True),
])
def test_update_datamodel_only_records_changesets_for_changelog_sync(mocked, action, record_only):
    _update(action)

    kwargs = mocked["run_sql_migration_task"].with_options.return_value.call_args.kwargs
    assert kwargs["record_only"] is record_only
    assert (kwargs["data_model"], kwargs["schema_name"], kwargs["dialect"], kwargs["vocab_schema"]) == (
        "medical-imaging", "s1", "postgres", "v1")


# --- task bodies (called through .fn, without the Prefect engine) ---

@pytest.mark.parametrize("lower_case,table,expected_keys", [
    (True, "cdm_source", ["cdm_source_name", "cdm_source_abbreviation", "cdm_holder",
                          "source_release_date", "cdm_release_date", "cdm_version"]),
    (False, "CDM_SOURCE", ["CDM_SOURCE_NAME", "CDM_SOURCE_ABBREVIATION", "CDM_HOLDER",
                           "SOURCE_RELEASE_DATE", "CDM_RELEASE_DATE", "CDM_VERSION"]),
])
def test_insert_cdm_version_uses_the_case_of_the_existing_tables(lower_case, table, expected_keys):
    dao = MagicMock()
    schema = "a_very_long_schema_name_over_25_chars"

    with patch.object(dataset, "get_run_logger"), patch.object(dataset, "check_table_case", return_value=lower_case):
        dataset.insert_cdm_version.fn(dao, schema, "5.4")

    dao.insert_values_into_table.assert_called_once()
    called_schema, called_table, values = dao.insert_values_into_table.call_args.args
    assert (called_schema, called_table) == (schema, table)
    assert list(values) == expected_keys
    assert values[expected_keys[0]] == schema
    assert values[expected_keys[1]] == schema[:25]
    assert values[expected_keys[2]] == "D4L"
    assert values[expected_keys[5]] == "5.4"
    assert isinstance(values[expected_keys[3]], datetime) and isinstance(values[expected_keys[4]], datetime)


def test_update_cdm_version_updates_the_dao():
    dao = MagicMock()

    with patch.object(dataset, "get_run_logger"):
        dataset.update_cdm_version.fn(dao, "s1", "5.4")

    dao.update_cdm_version.assert_called_once_with("s1", "5.4")


def test_run_sql_migration_task_applies_the_data_model_schema():
    with patch.object(dataset, "apply_data_model_schema") as apply:
        dataset.run_sql_migration_task.fn(dbdao="dao", schema_name="s1", record_only=True)

    apply.assert_called_once_with(dbdao="dao", schema_name="s1", record_only=True)


# --- create_cdm_schema_tasks ---

@pytest.fixture
def cdm():
    with patch.object(dataset, "DBDao") as dbdao_class, \
         patch.object(dataset, "create_datamodel") as create_datamodel, \
         patch.object(dataset, "get_run_logger") as logger:
        yield dbdao_class.return_value, create_datamodel, logger.return_value


def _create_cdm(schema="s1", vocab="v1"):
    return dataset.create_cdm_schema_tasks(
        database_code="db1", data_model="omop5-4", schema_name=schema, vocab_schema=vocab, dialect="postgres")


def test_create_cdm_schema_tasks_creates_both_missing_schemas(cdm):
    dao, create_datamodel, _ = cdm
    dao.check_schema_exists.return_value = False

    _create_cdm()

    assert [c.kwargs["schema_name"] for c in create_datamodel.call_args_list] == ["v1", "s1"]
    assert all(c.kwargs["vocab_schema"] == "v1" for c in create_datamodel.call_args_list)
    assert all(c.kwargs["database_code"] == "db1" and c.kwargs["dialect"] == "postgres"
               for c in create_datamodel.call_args_list)


def test_create_cdm_schema_tasks_creates_only_the_missing_schema(cdm):
    dao, create_datamodel, _ = cdm
    dao.check_schema_exists.side_effect = lambda schema: schema == "v1"

    _create_cdm()

    assert [c.kwargs["schema_name"] for c in create_datamodel.call_args_list] == ["s1"]


def test_create_cdm_schema_tasks_does_nothing_when_both_schemas_exist(cdm):
    dao, create_datamodel, _ = cdm
    dao.check_schema_exists.return_value = True

    assert _create_cdm() is None

    create_datamodel.assert_not_called()


def test_create_cdm_schema_tasks_creates_a_shared_schema_once(cdm):
    dao, create_datamodel, _ = cdm
    dao.check_schema_exists.return_value = False

    _create_cdm(schema="shared", vocab="shared")

    assert create_datamodel.call_count == 1


def test_create_cdm_schema_tasks_stops_when_the_vocab_schema_fails(cdm):
    dao, create_datamodel, logger = cdm
    dao.check_schema_exists.return_value = False
    create_datamodel.side_effect = RuntimeError("vocab failed")

    assert _create_cdm() is False

    assert create_datamodel.call_count == 1
    assert "v1" in logger.error.call_args.args[0] and "vocab failed" in logger.error.call_args.args[0]


def test_create_cdm_schema_tasks_reports_a_cdm_schema_failure(cdm):
    dao, create_datamodel, logger = cdm
    dao.check_schema_exists.side_effect = lambda schema: schema == "v1"
    create_datamodel.side_effect = RuntimeError("cdm failed")

    assert _create_cdm() is False

    assert "s1" in logger.error.call_args.args[0] and "cdm failed" in logger.error.call_args.args[0]
