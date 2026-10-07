from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from data_management_plugin import const


def test_hana_to_postgres_lowercases_and_replaces_dots():
    assert const.hana_to_postgres("GDM.QUESTIONNAIRE_RESPONSE") == "gdm_questionnaire_response"


def test_get_db_dialect_reads_the_dialect_from_the_database_for_internal_plugins():
    options = SimpleNamespace(flow_name="data_management_plugin", database_code="db1", dialect="ignored")

    with patch.object(const, "DBDao") as dbdao:
        dbdao.return_value.dialect = "hana"
        assert const.get_db_dialect(options) == "hana"

    dbdao.assert_called_once_with(database_code="db1")


def test_get_db_dialect_uses_the_option_for_other_flows():
    options = SimpleNamespace(flow_name="some_external_flow", database_code="db1", dialect="postgres")

    with patch.object(const, "DBDao") as dbdao:
        assert const.get_db_dialect(options) == "postgres"

    dbdao.assert_not_called()


@pytest.mark.parametrize("tables,expected", [
    (["person", "visit_occurrence"], True),
    (["PERSON", "VISIT_OCCURRENCE"], False),
    (["something_else"], None),
])
def test_check_table_case_detects_the_case_of_the_person_table(tables, expected):
    dao = MagicMock()
    dao.get_table_names.return_value = tables

    assert const.check_table_case(dao, "s1") is expected
    dao.get_table_names.assert_called_once_with("s1")


@pytest.mark.parametrize("is_lower,expected", [(True, "cdm_source"), (False, "CDM_SOURCE")])
def test_convert_case(is_lower, expected):
    assert const.convert_case("Cdm_Source", is_lower) == expected


def test_every_omop_data_model_has_a_cdm_version():
    assert set(const.OMOP_DATA_MODELS) == set(const.DATAMODEL_CDM_VERSION)
