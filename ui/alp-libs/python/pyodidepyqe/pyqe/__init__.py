"""
Module `pyqe` is the python interface to QE. The goal of
this module is to help researchers to build rule-based cohorts for
further analysis.
"""

from pyqe.api.query import Query
from pyqe.api.pa_config import PAConfig
from pyqe.api.result import Result
from pyqe.api.cohort import Cohort
from pyqe.api.concept_query import ConceptQuery, ConceptSet, Concept
from pyqe.api.datasource import DataSource
from pyqe.ql.person import Person
from pyqe.ql.interaction import Interactions
from pyqe.ql.criteria_group import CriteriaGroup
from pyqe.ql.attribute import Attribute, Constraint, DateConstraint, Expression
from pyqe.ql.advanced_time_filter import AdvanceTimeFilter
from pyqe.ql.date_period import DatePeriod, CurrentDatePeriod
from pyqe.types.enum_types import ConfigPath, CardType, LogicalOperator, ComparisonOperator, MatchCriteria, Domain, Format, OriginSelection, TargetSelection

__all__ = [
    # pyqe.api.query
    'Query',
    # pyqe.api.pa_config
    'PAConfig',
    # pyqe.api.result
    'Result',
    # pyqe.api.cohort
    'Cohort',
    # pyqe.api.concept_query
    'ConceptQuery',
    'ConceptSet',
    'Concept',
    # pyqe.api.datasource
    'DataSource',
    # pyqe.ql.filter_card
    'Person',
    'Interactions',
    # pyqe.ql.criteria_group
    'CriteriaGroup',
    # pyqe.ql.attribute
    'Attribute',
    'Constraint',
    'DateConstraint',
    'Expression',
    # pyqe.ql.advanceTimeFilter
    'AdvanceTimeFilter',
    # pyqe.ql.date_period
    'DatePeriod',
    'CurrentDatePeriod',
    # pyqe.types.enum_types
    'ConfigPath',
    'CardType',
    'LogicalOperator',
    'ComparisonOperator',
    'MatchCriteria',
    'Domain',
    'Format',
    'OriginSelection',
    'TargetSelection'
]
