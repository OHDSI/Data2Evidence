from __future__ import annotations

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
    # Only DaoBase and TrexDao __init__ accept cache_id; pop it so the
    # SqlAlchemyDao probe constructor doesn't reject it, then re-attach
    # to the probe so vars(test_instance) carries it forward.
    cache_id = kwargs.pop("cache_id", None)

    # Create a test instance to infer dialect if not provided
    test_instance = SqlAlchemyDao(**kwargs)
    if cache_id is not None:
        test_instance.cache_id = cache_id
    # Always infer dialect from test_instance if not provided

    # Todo: Update implementation if Hana uses trex
    # If flow passes TREX but test_instance infers HANA, use HANA
    if dialect == SupportedDatabaseDialects.TREX and test_instance.dialect == SupportedDatabaseDialects.HANA:
        selected_dialect = SupportedDatabaseDialects.HANA
    else:
        selected_dialect = dialect if dialect is not None else test_instance.dialect
    # Get the DAO class from registry
    dao_class = _DAO_REGISTRY.get(selected_dialect)
    if not dao_class:
        supported_dialects = [d.value for d in SupportedDatabaseDialects]
        raise ValueError(
            f"Database dialect '{selected_dialect}' not supported. "
            f"Supported dialects: {supported_dialects}"
        )

    # For non-SqlAlchemy DAOs, pass the test instance's attributes.
    if dao_class != SqlAlchemyDao:
        attrs = vars(test_instance)
        # Only TrexDao's __init__ accepts cache_id; for other DAOs the
        # superclass DaoBase.__init__ defaults self.cache_id from database_code.
        if dao_class is TrexDao:
            return dao_class(**attrs)
        attrs_no_cache = {k: v for k, v in attrs.items() if k != "cache_id"}
        return dao_class(**attrs_no_cache)

    return test_instance
