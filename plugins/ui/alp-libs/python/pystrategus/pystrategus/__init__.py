"""
Module `pyqe` is the python interface to QE. The goal of
this module is to help researchers to build rule-based cohorts for
further analysis.
"""

import pystrategus.cohort_generator as CohortGeneratorModule
import pystrategus.strategus as Strategus
import pystrategus.cohort_definition_set as CohortDefinitionSet

__all__ = [
    'CohortGeneratorModule',
    'Strategus',
    'CohortDefinitionSet'
]
