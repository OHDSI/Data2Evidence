import json
import uuid
from datetime import datetime
from unittest.mock import MagicMock, call, patch

import pytest

from _shared_flow_utils.update_dataset_metadata import OMOP_NON_PERSON_ENTITIES
from data_management_plugin import versioninfo

LATEST = "db/migrations/postgres/changesets/medical-imaging/V1.0.0.0.1__create_eav_table.sql"
NAMES = [
    "DBDao", "PortalServerAPI", "update_entity_value", "update_entity_count", "update_total_entity_count",
    "update_metadata_last_fetched_date", "get_entity_count_distribution", "check_table_case",
    "get_updated_date", "get_current_version", "get_latest_available_version",
]


def _dataset(data_model="medical-imaging", **overrides):
    values = {
        "id": str(uuid.uuid4()), "databaseName": "db", "databaseCode": "db1", "schemaName": "s1",
        "visibilityStatus": None, "vocabSchemaName": "s1", "dialect": "postgres", "type": None,
        "dataModel": data_model, "paConfigId": None, "dashboards": None, "tags": None,
        "attributes": None, "tenant": None, "tokenStudyCode": None, "studyDetail": None,
    }
    values.update(overrides)
    return values


# --- get_latest_available_version / get_current_version / get_updated_date ---

@patch("data_management_plugin.versioninfo.get_latest_available_changeset", return_value=LATEST)
def test_get_latest_available_version_returns_extracted_version(changeset_mock):
    dao = MagicMock(dialect="postgres")

    assert versioninfo.get_latest_available_version(dao, "s1", "medical-imaging") == "medical-imaging_V1.0.0.0.1"
    changeset_mock.assert_called_once_with(
        dbdao=dao, schema_name="s1", data_model="medical-imaging", dialect="postgres")


@patch("data_management_plugin.versioninfo.get_run_logger")
def test_get_latest_available_version_returns_error_message_for_unmanaged_data_model(logger_mock):
    # e.g. an `omop` dataset created via omop_cdm_plugin: reported to the portal, not raised
    dao = MagicMock(dialect="postgres")

    result = versioninfo.get_latest_available_version(dao, "s1", "custom-omop-ms")

    assert result == "Error retrieving latest available version"
    logger_mock.return_value.error.assert_called_once()


@patch("data_management_plugin.versioninfo.get_run_logger")
def test_get_latest_available_version_returns_error_message_for_unsupported_dialect(logger_mock):
    dao = MagicMock(dialect="duckdb")

    assert versioninfo.get_latest_available_version(dao, "s1", "omop5-4") == "Error retrieving latest available version"


def test_get_current_version_extracts_the_version_of_the_last_executed_changeset():
    dao = MagicMock()
    dao.get_last_executed_changeset.return_value = LATEST

    assert versioninfo.get_current_version(dao, "s1") == "medical-imaging_V1.0.0.0.1"
    dao.get_last_executed_changeset.assert_called_once_with("s1")


@patch("data_management_plugin.versioninfo.get_run_logger")
def test_get_current_version_returns_an_error_message_when_there_is_no_changelog(logger_mock):
    dao = MagicMock()
    dao.get_last_executed_changeset.side_effect = RuntimeError("no databasechangelog table")

    assert versioninfo.get_current_version(dao, "s1") == "Error retrieving current version"
    logger_mock.return_value.error.assert_called_once()


def test_get_updated_date_returns_only_the_date_part():
    dao = MagicMock()
    dao.get_datamodel_updated_date.return_value = datetime(2026, 9, 25, 14, 3, 7)

    assert versioninfo.get_updated_date(dao, "s1") == "2026-09-25"


@patch("data_management_plugin.versioninfo.get_run_logger")
def test_get_updated_date_returns_an_error_message_on_failure(logger_mock):
    dao = MagicMock()
    dao.get_datamodel_updated_date.side_effect = RuntimeError("boom")

    assert versioninfo.get_updated_date(dao, "s1") == "Error retrieving updated date"


# --- get_entity_count_distribution ---

@patch("data_management_plugin.versioninfo.get_run_logger")
def test_get_entity_count_distribution_counts_each_entity_table(logger_mock):
    dao = MagicMock()
    dao.get_distinct_count.return_value = 7

    result = versioninfo.get_entity_count_distribution(dao, "s1", True)

    assert dao.get_distinct_count.call_args_list == [
        call("s1", table, column) for table, column in OMOP_NON_PERSON_ENTITIES.items()]
    assert set(result.values()) == {"7"}
    assert all(key.endswith(" Count") for key in result)


@patch("data_management_plugin.versioninfo.get_run_logger")
def test_get_entity_count_distribution_uses_uppercase_names_for_uppercase_schemas(logger_mock):
    dao = MagicMock()
    dao.get_distinct_count.return_value = 1

    versioninfo.get_entity_count_distribution(dao, "s1", False)

    assert dao.get_distinct_count.call_args_list == [
        call("s1", table.upper(), column.upper()) for table, column in OMOP_NON_PERSON_ENTITIES.items()]


@patch("data_management_plugin.versioninfo.get_run_logger")
def test_get_entity_count_distribution_leaves_out_an_entity_it_could_not_count(logger_mock):
    dao = MagicMock()
    failing_table = next(iter(OMOP_NON_PERSON_ENTITIES))
    dao.get_distinct_count.side_effect = (
        lambda schema, table, column: (_ for _ in ()).throw(RuntimeError("no table")) if table == failing_table else 3)

    result = versioninfo.get_entity_count_distribution(dao, "s1", True)

    assert failing_table.replace("_", " ").title() + " Count" not in result
    assert len(result) == len(OMOP_NON_PERSON_ENTITIES) - 1
    logger_mock.return_value.error.assert_called_once()


# --- extract_db_schema / get_version_info_tasks ---

@patch("data_management_plugin.versioninfo.get_run_logger")
def test_extract_db_schema_separates_valid_and_invalid_datasets(logger_mock):
    valid, invalid = _dataset(), {"id": "no-schema-here"}

    result = versioninfo.extract_db_schema.fn([valid, invalid])

    assert result == {"datasets_with_schema": [valid], "datasets_without_schema": [invalid]}
    logger_mock.return_value.error.assert_called_once()


@pytest.mark.parametrize("datasets", [None, []])
def test_get_version_info_tasks_does_nothing_without_datasets(datasets):
    with patch.object(versioninfo, "get_run_logger") as logger, \
         patch.object(versioninfo, "get_and_update_attributes") as update:
        versioninfo.get_version_info_tasks(datasets)

    update.assert_not_called()
    logger.return_value.info.assert_called_once_with("No datasets fetched from portal")


def test_get_version_info_tasks_updates_every_valid_dataset():
    first, second = _dataset(schemaName="a"), _dataset(schemaName="b")

    with patch.object(versioninfo, "get_run_logger"), \
         patch.object(versioninfo, "extract_db_schema",
                      return_value={"datasets_with_schema": [first, second], "datasets_without_schema": [{"id": 3}]}), \
         patch.object(versioninfo, "get_and_update_attributes") as update:
        versioninfo.get_version_info_tasks([first, second, {"id": 3}], cache_id="c1")

    assert update.call_args_list == [call(first, "c1"), call(second, "c1")]


# --- get_and_update_attributes ---

@pytest.fixture
def env():
    mocks = {name: MagicMock() for name in NAMES}
    with patch.multiple(versioninfo, **mocks), patch.object(versioninfo, "get_run_logger") as logger:
        mocks["logger"] = logger.return_value
        mocks["dao"] = mocks["DBDao"].return_value
        mocks["portal"] = mocks["PortalServerAPI"].return_value
        mocks["dao"].check_schema_exists.return_value = True
        mocks["get_updated_date"].return_value = "2026-09-25"
        mocks["get_current_version"].return_value = "medical-imaging_V1.0.0.0.1"
        mocks["get_latest_available_version"].return_value = "medical-imaging_V1.0.0.0.1"
        mocks["check_table_case"].return_value = True
        mocks["get_entity_count_distribution"].return_value = {"Person Count": "3"}
        yield mocks


def _portal_attributes(env):
    return {c.args[1]: c.args[2] for c in env["portal"].update_dataset_attributes_table.call_args_list}


def test_a_database_that_cannot_be_reached_is_logged_and_reraised(env):
    env["DBDao"].side_effect = ConnectionError("no route")

    with pytest.raises(ConnectionError):
        versioninfo.get_and_update_attributes.fn(_dataset(), "c1")

    env["logger"].error.assert_called_once_with("Failed to connect to database")
    env["PortalServerAPI"].assert_not_called()


def test_a_missing_schema_is_reported_to_the_portal_and_nothing_else_is_updated(env):
    env["dao"].check_schema_exists.return_value = False
    dataset = _dataset()

    versioninfo.get_and_update_attributes.fn(dataset, "c1")

    message = f"Schema 's1' does not exist in db db1 for dataset id '{dataset['id']}'"
    assert _portal_attributes(env) == {"schema_version": message, "latest_schema_version": message}
    env["update_entity_value"].assert_not_called()
    env["get_current_version"].assert_not_called()


def test_a_non_omop_dataset_reports_dates_and_versions_only(env):
    dataset = _dataset("medical-imaging")

    versioninfo.get_and_update_attributes.fn(dataset, "c1")

    env["DBDao"].assert_called_once_with(database_code="db1", cache_id="c1")
    assert _portal_attributes(env) == {
        "updated_date": "2026-09-25",
        "schema_version": "medical-imaging_V1.0.0.0.1",
        "latest_schema_version": "medical-imaging_V1.0.0.0.1",
    }
    env["update_entity_value"].assert_called_once()
    assert env["update_entity_value"].call_args.kwargs["column_name"] == "cdm_release_date"
    env["update_metadata_last_fetched_date"].assert_called_once()
    env["update_entity_count"].assert_not_called()
    env["update_total_entity_count"].assert_not_called()
    env["get_latest_available_version"].assert_called_once_with(env["dao"], "s1", "medical-imaging")


@pytest.mark.parametrize("data_model", ["omop5-4", "omop5-4 v2", "waveform"])
def test_an_omop_dataset_also_reports_counts_and_the_cdm_version(env, data_model):
    versioninfo.get_and_update_attributes.fn(_dataset(data_model), None)

    count_kwargs = env["update_entity_count"].call_args.kwargs
    assert (count_kwargs["table_name"], count_kwargs["column_name"], count_kwargs["entity_name"]) == (
        "person", "person_id", "patient_count")
    assert _portal_attributes(env)["entity_count_distribution"] == json.dumps({"Person Count": "3"})
    assert env["update_total_entity_count"].call_args.kwargs["entity_count_distribution"] == {"Person Count": "3"}
    version_kwargs = env["update_entity_value"].call_args_list[-1].kwargs
    assert (version_kwargs["table_name"], version_kwargs["column_name"], version_kwargs["entity_name"]) == (
        "cdm_source", "cdm_version", "version")


def test_an_omop_dataset_with_uppercase_tables_uses_uppercase_names(env):
    env["check_table_case"].return_value = False

    versioninfo.get_and_update_attributes.fn(_dataset("omop5-4"), None)

    count_kwargs = env["update_entity_count"].call_args.kwargs
    assert (count_kwargs["table_name"], count_kwargs["column_name"]) == ("PERSON", "PERSON_ID")
    assert env["update_entity_value"].call_args_list[-1].kwargs["table_name"] == "CDM_SOURCE"
    env["get_entity_count_distribution"].assert_called_once_with(env["dao"], "s1", False)


@pytest.mark.parametrize("attribute", [
    "updated_date", "schema_version", "entity_count_distribution", "latest_schema_version"])
def test_a_failed_portal_update_is_logged_and_the_rest_still_runs(env, attribute):
    def update(dataset_id, name, value):
        if name == attribute:
            raise RuntimeError("portal down")

    env["portal"].update_dataset_attributes_table.side_effect = update

    versioninfo.get_and_update_attributes.fn(_dataset("omop5-4"), None)

    errors = [c.args[0] for c in env["logger"].error.call_args_list]
    assert any(f"attribute '{'current_schema_version' if attribute == 'schema_version' else attribute}'" in e
               for e in errors)
    env["update_total_entity_count"].assert_called_once()
    env["update_metadata_last_fetched_date"].assert_called_once()
