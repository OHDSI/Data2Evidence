from __future__ import annotations

from shared_utils.dao.ibisdao import IbisDao
from shared_utils.dao.sqlalchemydao import SqlAlchemyDao
from shared_utils.types import SupportedDatabaseDialects

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from shared_utils.dao.daobase import DaoBase


# Factory to return the correct dao implementation        
def DBDao(**kwargs) -> DaoBase:
    testinstance = SqlAlchemyDao(**kwargs)
    match testinstance.dialect:
        case SupportedDatabaseDialects.POSTGRES:
            return IbisDao(**vars(testinstance))
        case SupportedDatabaseDialects.HANA | SupportedDatabaseDialects.DUCKDB:
            return SqlAlchemyDao(**vars(testinstance))
        case _:
            supported_dialects = [dialect.value for dialect in SupportedDatabaseDialects]
            if testinstance.dialect not in supported_dialects:
                raise ValueError(f"Database dialect '{testinstance.dialect}' not supported, only '{supported_dialects}'.")