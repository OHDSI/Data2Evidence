import pandas as pd
from re import match
from pathlib import Path


def get_failed_analysis_ids(output_folder: str) -> list[int] | None:
    """
    Get the list of failed analysis IDs from the output folder.
    """
    error_files = list(Path(output_folder).glob("achillesError_*.txt"))
    failed_ids = [int(file.stem.split("_")[-1]) for file in error_files if file.is_file()]

    sorted_failed_ids = sorted(failed_ids)

    return sorted_failed_ids if sorted_failed_ids else None


def _read_text_snippet(file_path: Path, max_chars: int) -> str:
    """
    Read a bounded text snippet from a diagnostic file.
    """
    try:
        text = file_path.read_text(errors="replace")
    except Exception as e:
        return f"<unable to read {file_path.name}: {e}>"

    if len(text) <= max_chars:
        return text

    return f"{text[:max_chars]}\n... truncated after {max_chars} characters ..."


def _analysis_id_from_error_file(file_path: Path) -> int:
    try:
        return int(file_path.stem.split("_")[-1])
    except ValueError:
        return 0


def collect_achilles_diagnostics(
    output_folder: str,
    max_error_files: int = 10,
    max_log_files: int = 3,
    max_chars_per_file: int = 4000,
) -> dict:
    """
    Collect bounded Achilles diagnostic files for failure artifacts.

    Achilles can fail while parsing its own log files, which hides the original
    SQL error. Capturing generated achillesError/log files lets users debug
    failed runs without direct database access.
    """
    output_path = Path(output_folder)
    diagnostics = {
        "output_folder": str(output_path),
        "files": {},
        "truncated_file_groups": {},
    }

    if not output_path.exists():
        diagnostics["error"] = f"Output folder does not exist: {output_path}"
        return diagnostics

    for file_name in ("errorReportR.txt", "errorReportSql.txt"):
        file_path = output_path / file_name
        if file_path.exists():
            diagnostics["files"][file_name] = _read_text_snippet(
                file_path, max_chars_per_file
            )

    error_files = sorted(
        output_path.glob("achillesError_*.txt"),
        key=_analysis_id_from_error_file,
    )
    for file_path in error_files[:max_error_files]:
        diagnostics["files"][file_path.name] = _read_text_snippet(
            file_path, max_chars_per_file
        )
    if len(error_files) > max_error_files:
        diagnostics["truncated_file_groups"]["achillesError_*.txt"] = (
            f"{len(error_files) - max_error_files} additional file(s) omitted"
        )

    log_files = sorted(output_path.glob("log_achilles*.txt"))
    for file_path in log_files[:max_log_files]:
        diagnostics["files"][file_path.name] = _read_text_snippet(
            file_path, max_chars_per_file
        )
    if len(log_files) > max_log_files:
        diagnostics["truncated_file_groups"]["log_achilles*.txt"] = (
            f"{len(log_files) - max_log_files} additional file(s) omitted"
        )

    return diagnostics


def failed_analysis_ids_to_str(failed_ids: list[int]) -> str:
    """
    Convert the list of failed analysis IDs to a comma separated string.
    """
    failed_ids_str = ",".join(map(str, failed_ids))
    return failed_ids_str


def is_safe_schema_name(schema: str) -> bool:
    # Allow leading underscore (cache_ids from sanitized UUIDs) and a single catalog.schema pair.
    return match(r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$", schema) is not None


def get_cdm_source(dbdao, schema: str, *, use_trex_connection: bool = False) -> str:
    """
    Get the cdm_source_abbreviation from the cdm_source table.
    """
    if use_trex_connection:
        catalog = getattr(dbdao, "cache_id", None) or dbdao.database_code
        sql = f'SELECT cdm_source_abbreviation FROM "{catalog}"."{schema}"."cdm_source"'
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
