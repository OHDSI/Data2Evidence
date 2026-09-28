from unittest.mock import MagicMock

from _shared_flow_utils.dao.sqlalchemydao import SqlAlchemyDao
from _shared_flow_utils.types import SupportedDatabaseDialects


def test_lock_table_for_id_allocation_is_noop_for_bigquery():
    # BigQuery has no table-lock statement and no session-scoped locking primitive
    # to substitute one with - delete_and_insert_rows(id_column=...) accepts a
    # documented concurrency race there (see the method's own docstring) instead
    # of raising NotImplementedError like an unhandled dialect would.
    fake_dao = MagicMock(spec=SqlAlchemyDao)
    fake_dao.dialect = SupportedDatabaseDialects.BIGQUERY
    connection = MagicMock()

    SqlAlchemyDao._lock_table_for_id_allocation(fake_dao, connection, MagicMock())

    connection.execute.assert_not_called()
