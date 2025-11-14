import pandas as pd
from re import match
from pathlib import Path


def get_failed_analysis_ids(output_folder: str) -> list[int]:
    """
    Get the list of failed analysis IDs from the output folder.
    """
    error_files = list(Path(output_folder).glob("achillesError_*.txt"))
    failed_id_str = [int(file.stem.split("_")[-1]) for file in error_files if file.is_file()]

    sorted_failed_ids = sorted(failed_id_str)

    return sorted_failed_ids if sorted_failed_ids else None


def failed_analysis_ids_to_str(failed_ids: list[int]) -> str:
    """
    Convert the list of failed analysis IDs to a comma separated string.
    """
    failed_ids_str = ",".join(map(str, failed_ids))
    return f'"{failed_ids_str}"'


def is_safe_schema_name(schema: str) -> bool:
    return match(r"^[a-zA-Z][a-zA-Z0-9_]*$", schema) is not None


def get_cdm_source(dbdao, schema: str, *, use_trex_connection: bool = False) -> str:
    """
    Get the cdm_source_abbreviation from the cdm_source table.
    """
    if use_trex_connection:
        sql = f'SELECT cdm_source_abbreviation FROM "{schema}"."cdm_source"'
        value = dbdao.execute_sql(
            sql,
            fetch=True,
        )
        return value[0][0] if value else None
    return dbdao.get_value(
        schema=schema, table="cdm_source", column="cdm_source_abbreviation"
    )


def get_export_to_ares_output_path(
    output_folder: str, cdm_source_abbreviation: str
) -> str:
    """
    Get the path to the exportToAres output folder.
    """

    ares_path = Path(output_folder) / cdm_source_abbreviation[:25]
    cdm_release_date = next(Path(ares_path).iterdir()).name
    return str(ares_path / cdm_release_date)


def get_export_to_ares_results_from_file(ares_output_path: str) -> dict:
    # export_to_ares creates many csv files, but now we are only interested in saving results from records-by-domain.csv
    # Read records-by-domain.csv and parse csv into json
    file_name = "records-by-domain"
    df = pd.read_csv(Path(ares_output_path) / f"{file_name}.csv")
    df = df.rename(columns={"count_records": "countRecords"})

    data = {
        "exportToAres": {
            "cdmReleaseDate": Path(ares_output_path).name,
            file_name: df.to_dict(orient="records"),
        }
    }

    return data


def get_error_message(error_file_name: str, error_path: str | None) -> str | None:
    """
    Get the error message from the error file if it exists.
    """
    if error_path is None:
        error_path = Path.cwd()
    error_file = Path(error_path) / error_file_name
    if error_file.exists():
        with error_file.open("r") as f:
            return f.read()
    return None
