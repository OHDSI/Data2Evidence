from __future__ import annotations

from _shared_flow_utils.types import AuthMode
from _shared_flow_utils.dao.ibisdao import IbisDao
from _shared_flow_utils.dao.trexdao import TrexDao
from _shared_flow_utils.dao.sqlalchemydao import SqlAlchemyDao
from _shared_flow_utils.types import SupportedDatabaseDialects

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from _shared_flow_utils.dao.daobase import DaoBase


# Registry mapping dialects to their DAO classes
_DAO_REGISTRY = {
    SupportedDatabaseDialects.POSTGRES: IbisDao,
    SupportedDatabaseDialects.HANA: SqlAlchemyDao,
    SupportedDatabaseDialects.DUCKDB: SqlAlchemyDao,
    SupportedDatabaseDialects.BIGQUERY: SqlAlchemyDao,
    SupportedDatabaseDialects.TREX: TrexDao,
}


def DBDao(dialect=None, **kwargs) -> DaoBase:
    """
    Factory function to create the appropriate DAO implementation.

    Args:
        dialect: Database dialect to use. If None, inferred from connection.
        **kwargs: Additional arguments passed to the DAO constructor.

    Returns:
        DaoBase: Appropriate DAO implementation for the given dialect.

    Raises:
        ValueError: If the dialect is not supported.
    """
    test_instance = SqlAlchemyDao(**kwargs)
    inferred_dialect = test_instance.dialect

    is_hana_jwt_auth = test_instance.tenant_configs.authMode == AuthMode.JWT and test_instance.dialect == SupportedDatabaseDialects.HANA

    # Todo: Update implementation if Hana JWT uses trex
    # If dialect is explicitly TREX, but the test instance infers HANA, pass is_hana to TrexDao
    if dialect == SupportedDatabaseDialects.TREX and not is_hana_jwt_auth:
        is_hana = inferred_dialect == SupportedDatabaseDialects.HANA
        return TrexDao(**vars(test_instance), is_hana=is_hana)

    # Otherwise, select the DAO class from the registry
    selected_dialect = dialect if dialect is not None else inferred_dialect
    dao_class = _DAO_REGISTRY.get(selected_dialect)
    if not dao_class:
        supported_dialects = [d.value for d in SupportedDatabaseDialects]
        raise ValueError(
            f"Database dialect '{selected_dialect}' not supported. "
            f"Supported dialects: {supported_dialects}"
        )

    # For non-SqlAlchemy DAOs, pass the test instance's attributes
    if dao_class != SqlAlchemyDao:
        return dao_class(**vars(test_instance))

    return test_instance
