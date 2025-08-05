from __future__ import annotations

from _shared_flow_utils.dao.ibisdao import IbisDao
from _shared_flow_utils.dao.sqlalchemydao import SqlAlchemyDao
from _shared_flow_utils.dao.trexdao import TrexDao
from _shared_flow_utils.types import SupportedDatabaseDialects

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from _shared_flow_utils.dao.daobase import DaoBase


# Factory to return the correct dao implementation        
def DBDao(dialect=None, **kwargs) -> 'DaoBase':
    # Do not inject 'dialect' into kwargs, only use for selection
    testinstance = SqlAlchemyDao(**kwargs)
    selected_dialect = dialect if dialect is not None else testinstance.dialect
    print(f"Selected dialect: {selected_dialect}")
    match selected_dialect:
        case SupportedDatabaseDialects.POSTGRES:
            return IbisDao(**vars(testinstance))
        case SupportedDatabaseDialects.HANA | SupportedDatabaseDialects.DUCKDB | SupportedDatabaseDialects.BIGQUERY:
            return SqlAlchemyDao(**vars(testinstance))
        case SupportedDatabaseDialects.TREX_DUCKDB:
            return TrexDao(**vars(testinstance))
        case _:
            supported_dialects = [d.value for d in SupportedDatabaseDialects] + ['trex_duckdb']
            if selected_dialect not in supported_dialects:
                raise ValueError(f"Database dialect '{selected_dialect}' not supported, only '{supported_dialects}'.")