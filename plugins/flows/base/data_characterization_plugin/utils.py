import pandas as pd
from re import match, sub
from pathlib import Path


def get_failed_analysis_ids(output_folder: str) -> list[int] | None:
    """
    Get the list of failed analysis IDs from the output folder.
    """
    error_files = list(Path(output_folder).glob("achillesError_*.txt"))
    failed_ids = [int(file.stem.split("_")[-1]) for file in error_files if file.is_file()]

    sorted_failed_ids = sorted(failed_ids)

    return sorted_failed_ids if sorted_failed_ids else None


def failed_analysis_ids_to_str(failed_ids: list[int]) -> str:
    """
    Convert the list of failed analysis IDs to a comma separated string.
    """
    failed_ids_str = ",".join(map(str, failed_ids))
    return failed_ids_str


def is_safe_schema_name(schema: str) -> bool:
    # Allow leading underscore (cache_ids from sanitized UUIDs) and a single catalog.schema pair.
    return match(r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$", schema) is not None


def get_cdm_source(
    dbdao, schema: str, *, use_trex_connection: bool = False, is_hana: bool = False
) -> str | None:
    """
    Get the cdm_source_abbreviation from the cdm_source table.
    """
    if use_trex_connection:
        if is_hana:
            # HANA datasets go through trex pgwire's HANA passthrough, which ships the
            # literal query to HANA. HANA folds unquoted identifiers to UPPER-CASE, so the
            # table must be referenced UNQUOTED (quoted "cdm_source" would not match the
            # actual CDM_SOURCE table). No DuckDB catalog prefix — meaningless to HANA.
            sql = f'SELECT cdm_source_abbreviation FROM "{schema}".cdm_source'
        else:
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


def _error_signature(content: str) -> str:
    """Normalize an Achilles error report so the same failure across many analyses groups together."""
    lines = content.splitlines()
    message = next(
        (lines[i + 1].strip() for i, line in enumerate(lines)
         if line.strip() == "Error:" and i + 1 < len(lines) and lines[i + 1].strip()),
        next((line.strip() for line in lines if line.strip()), "unknown error"),
    )
    message = sub(r"\(Query:.*", "", message)
    return sub(r"\d+", "N", message)[:250]


def get_analysis_error_details(
    output_folder: str, max_groups: int = 8, sample_chars: int = 2000
) -> str | None:
    """Group the per-analysis Achilles error reports by root error for logging, with one sample each."""
    error_files = sorted(
        Path(output_folder).glob("achillesError_*.txt"),
        key=lambda f: int(f.stem.split("_")[-1]),
    )
    if not error_files:
        return None

    groups: dict[str, dict] = {}
    for error_file in error_files:
        try:
            content = error_file.read_text()
        except OSError:
            continue
        analysis_id = error_file.stem.split("_")[-1]
        group = groups.setdefault(_error_signature(content), {"ids": [], "sample": content})
        group["ids"].append(analysis_id)

    header = f"{len(error_files)} analysis error report(s), {len(groups)} distinct error(s):"
    sections = [header]
    for group in list(groups.values())[:max_groups]:
        ids = ",".join(group["ids"])
        sections.append(f"\n[analyses {ids}]\n{group['sample'].strip()[:sample_chars]}")
    if len(groups) > max_groups:
        sections.append(f"\n... and {len(groups) - max_groups} more distinct error group(s)")
    return "\n".join(sections)


def get_achilles_log_tail(output_folder: str, max_lines: int = 60) -> str | None:
    """
    Return the tail of Achilles' execution log (log_achilles.txt) for debugging context.
    """
    log_file = Path(output_folder) / "log_achilles.txt"
    if not log_file.exists():
        return None
    try:
        lines = log_file.read_text(errors="replace").splitlines()
    except OSError:
        return None
    return "\n".join(lines[-max_lines:])
