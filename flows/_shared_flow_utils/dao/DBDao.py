from __future__ import annotations

from _shared_flow_utils.dao.ibisdao import IbisDao
from _shared_flow_utils.dao.sqlalchemydao import SqlAlchemyDao
from _shared_flow_utils.dao.trexdao import TrexDao
from _shared_flow_utils.types import SupportedDatabaseDialects

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from _shared_flow_utils.dao.daobase import DaoBase


# Factory to return the correct dao implementation        
def DBDao(dialect=None, **kwargs) -> DaoBase:
    testinstance = SqlAlchemyDao(**kwargs)
    selected_dialect = dialect if dialect is not None else testinstance.dialect
    match selected_dialect:
        case SupportedDatabaseDialects.POSTGRES:
            return IbisDao(**vars(testinstance))
        case SupportedDatabaseDialects.HANA | SupportedDatabaseDialects.DUCKDB | SupportedDatabaseDialects.BIGQUERY:
            return SqlAlchemyDao(**vars(testinstance))
        case SupportedDatabaseDialects.TREX_DUCKDB:
            return TrexDao(**vars(testinstance))
        case _:
            supported_dialects = [dialect.value for dialect in SupportedDatabaseDialects]
            if testinstance.dialect not in supported_dialects:
                raise ValueError(f"Database dialect '{testinstance.dialect}' not supported, only '{supported_dialects}'.")