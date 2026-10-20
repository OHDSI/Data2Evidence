import uuid

import pytest
from pydantic import ValidationError

from data_management_plugin.types import (
    CreateDataModelType, CreateSchemaType, DataModelType, FLOW_NAME, FlowActionType,
    GetVersionInfoType, PortalDatasetType, UpdateDataModelType,
)


def test_flow_action_types_are_the_supported_actions():
    assert {a.value for a in FlowActionType} == {
        "create_datamodel", "update_datamodel", "get_version_info", "create_cdm_schema", "changelog_sync"}


def test_data_model_type_defaults_the_vocab_schema_to_the_schema_name():
    options = DataModelType(flow_action_type="create_datamodel", database_code="db1", schema_name="s1")

    assert options.vocab_schema == "s1"


def test_data_model_type_keeps_an_explicit_vocab_schema():
    options = DataModelType(flow_action_type="create_datamodel", database_code="db1",
                            schema_name="s1", vocab_schema="vocab")

    assert options.vocab_schema == "vocab"


def test_data_model_type_without_schema_or_vocab_leaves_both_unset():
    options = DataModelType(flow_action_type="get_version_info", database_code="db1")

    assert options.schema_name is None and options.vocab_schema is None


def test_data_model_type_exposes_the_flow_name():
    options = DataModelType(flow_action_type="get_version_info", database_code="db1")

    assert options.flow_name == FLOW_NAME == "data_management_plugin"


def test_data_model_type_rejects_removed_and_unknown_actions():
    for action in ("rollback_count", "rollback_tag", "nonsense"):
        with pytest.raises(ValidationError):
            DataModelType(flow_action_type=action, database_code="db1")


def test_data_model_type_requires_a_database_code():
    with pytest.raises(ValidationError):
        DataModelType(flow_action_type="create_datamodel")


def test_data_model_type_accepts_the_optional_fields():
    options = DataModelType(flow_action_type="get_version_info", database_code="db1",
                            cache_id="c1", data_model="omop5-4", update_count=3, datasets=[{"id": 1}])

    assert (options.cache_id, options.data_model, options.update_count, options.datasets) == (
        "c1", "omop5-4", 3, [{"id": 1}])


@pytest.mark.parametrize("model,extra", [
    (CreateDataModelType, {"vocab_schema": "v", "update_count": None}),
    (UpdateDataModelType, {"vocab_schema": "v"}),
    (CreateSchemaType, {"vocab_schema": "v"}),
    (GetVersionInfoType, {"datasets": []}),
])
def test_flow_option_models_build_from_their_fields(model, extra):
    options = model(database_code="db1", data_model="omop5-4", dialect="postgres",
                    flow_name="data_management_plugin", **extra)

    assert options.data_model == "omop5-4"


def test_flow_option_models_require_a_data_model():
    with pytest.raises(ValidationError):
        UpdateDataModelType(database_code="db1", dialect="postgres", flow_name="f", vocab_schema="v")


PORTAL_DATASET = {
    "id": str(uuid.uuid4()), "databaseName": "db", "databaseCode": "db1", "schemaName": "s1",
    "visibilityStatus": None, "vocabSchemaName": "s1", "dialect": "postgres", "type": None,
    "dataModel": "omop5-4", "paConfigId": None, "dashboards": None, "tags": None,
    "attributes": None, "tenant": None, "tokenStudyCode": None, "studyDetail": None,
}


def test_portal_dataset_type_accepts_a_full_dataset():
    dataset = PortalDatasetType(**PORTAL_DATASET)

    assert dataset.schemaName == "s1" and dataset.dataModel == "omop5-4"


def test_portal_dataset_type_rejects_a_dataset_without_a_schema():
    invalid = {k: v for k, v in PORTAL_DATASET.items() if k != "schemaName"}

    with pytest.raises(ValidationError):
        PortalDatasetType(**invalid)
