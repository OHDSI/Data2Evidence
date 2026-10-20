import logging
import sys
import types
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine, text

# flow.py imports DBDao (database drivers) and ibis at module level; neither is used by
# analyze_table, so stub them to keep this test free of database dependencies.
sys.modules.setdefault("ibis", MagicMock())
_dbdao_module = types.ModuleType("_shared_flow_utils.dao.DBDao")
_dbdao_module.DBDao = MagicMock()
sys.modules.setdefault("_shared_flow_utils.dao.DBDao", _dbdao_module)

from _shared_flow_utils.types import SupportedDatabaseDialects  # noqa: E402
from data_load_plugin.flow import analyze_table  # noqa: E402


class FakeDao:
    def __init__(self, dialect, engine):
        self.dialect = dialect
        self.engine = engine


@pytest.fixture
def engine():
    eng = create_engine("sqlite://")
    with eng.connect() as conn:
        conn.execute(text("CREATE TABLE concept_ancestor (ancestor_concept_id INTEGER)"))
        conn.execute(text("INSERT INTO concept_ancestor VALUES (1), (2)"))
        conn.commit()
    return eng


def test_postgres_load_analyzes_the_table(engine, caplog):
    caplog.set_level(logging.INFO)
    analyze_table(FakeDao(SupportedDatabaseDialects.POSTGRES, engine), "main", "concept_ancestor",
                  logging.getLogger("test"))
    assert "Analyzed table 'main.concept_ancestor'" in caplog.text


def test_other_dialects_are_left_alone():
    engine = MagicMock()
    analyze_table(FakeDao(SupportedDatabaseDialects.HANA, engine), "cdm", "concept", logging.getLogger("test"))
    engine.connect.assert_not_called()


def test_a_failed_analyze_does_not_fail_the_load(engine, caplog):
    analyze_table(FakeDao(SupportedDatabaseDialects.POSTGRES, engine), "main", "missing_table",
                  logging.getLogger("test"))
    assert "ANALYZE of 'main.missing_table' failed" in caplog.text
