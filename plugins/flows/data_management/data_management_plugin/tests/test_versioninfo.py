from unittest.mock import MagicMock, patch

from data_management_plugin import versioninfo

LATEST = "db/migrations/postgres/changesets/medical-imaging/V1.0.0.0.1__create_eav_table.sql"


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
