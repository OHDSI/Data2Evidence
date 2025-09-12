from typing import Set, List
from re import match as regex_match

# Base tables in CDM Schema and the timestamp and person_id columns to filter on
_CDM_COLUMN_FILTER_MAP = {
    "cohort": {"timestamp_column": "cohort_start_date"},
    "cohort_attribute": {"timestamp_column": "cohort_start_date"},
    "cohort_definition": {"timestamp_column": "cohort_initiation_date"},
    "concept": {"timestamp_column": "valid_start_date"},
    "concept_relationship": {"timestamp_column": "valid_start_date"},
    "condition_era": {
        "timestamp_column": "condition_era_start_date",
        "person_id_column": "person_id",
    },
    "condition_occurrence": {
        "timestamp_column": "condition_start_datetime",
        "person_id_column": "person_id",
    },
    "cost": {"person_id_column": "paid_by_patient"},
    "death": {"timestamp_column": "death_date", "person_id_column": "person_id"},
    "device_exposure": {
        "timestamp_column": "device_exposure_start_datetime",
        "person_id_column": "person_id",
    },
    "dose_era": {
        "timestamp_column": "dose_era_start_date",
        "person_id_column": "person_id",
    },
    "drug_era": {
        "timestamp_column": "drug_era_start_date",
        "person_id_column": "person_id",
    },
    "drug_exposure": {
        "timestamp_column": "drug_exposure_start_datetime",
        "person_id_column": "person_id",
    },
    "drug_strength": {"timestamp_column": "valid_start_date"},
    "note": {"timestamp_column": "note_date", "person_id_column": "person_id"},
    "observation": {
        "timestamp_column": "observation_date",
        "person_id_column": "person_id",
    },
    "observation_period": {
        "timestamp_column": "observation_period_start_date",
        "person_id_column": "person_id",
    },
    "payer_plan_period": {
        "timestamp_column": "payer_plan_period_start_date",
        "person_id_column": "person_id",
    },
    "person": {"person_id_column": "person_id"},
    "procedure_occurrence": {
        "timestamp_column": "procedure_datetime",
        "person_id_column": "person_id",
    },
    "specimen": {"timestamp_column": "specimen_date", "person_id_column": "person_id"},
    "visit_occurrence": {
        "timestamp_column": "visit_start_date",
        "person_id_column": "person_id",
    },
}

TABLES_TO_EXCLUDE = [
    r"\b\w+(\.\w+)*_history\b",
    # Liquibase tables
    r"^databasechangelog$",
    r"^DATABASECHANGELOG$",
    # Postgres system tables
    r"^pg_.*",
]

TABLES_TO_EXCLUDE_REGEX = "(?i)(" + "|".join(TABLES_TO_EXCLUDE) + ")"


def filter_tables(table_list: List[str]) -> Set[str]:
    """
    Returns a set of table names from table_list that do not match any exclusion patterns.

    Args:
        table_list (List[str]): List of table names to consider for copying.

    Returns:
        Set[str]: Set of table names to copy.
    """

    return {
        table
        for table in sorted(table_list)
        if not regex_match(TABLES_TO_EXCLUDE_REGEX, table)
    }


COLUMNS_TO_EXCLUDE = ""


COLUMNS_TO_EXCLUDE_REGEX = ""


def filter_columns(column_list: List[str]) -> Set[str]:
    """
    Returns a set of column names from column_list that do not match any exclusion patterns.

    Args:
        column_list (List[str]): List of column names to consider for copying.

    Returns:
        Set[str]: Set of column names to copy.
    """

    return {
        column
        for column in sorted(column_list)
        if not regex_match(COLUMNS_TO_EXCLUDE_REGEX, column)
    }
