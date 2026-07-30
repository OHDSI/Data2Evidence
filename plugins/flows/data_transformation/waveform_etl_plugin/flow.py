from dataclasses import dataclass, field
import pandas as pd

from pathlib import Path
from prefect import flow, task
from prefect.logging import get_run_logger

from .types import *
from .transform import *
from .waveform_reader import parse_record, get_next_record_ids, _discover_records

from _shared_flow_utils.dao.DBDao import DBDao


def get_waveform_data_path(filepath: str) -> Path:
    """
    Returns the path to the waveform data directory.
    """
    cwd = Path.cwd()
    waveform_data_path = cwd / filepath
    return waveform_data_path


@task(log_prints=True)
def extract_records(waves_root: Path) -> list[RecordInfo]:
    """Discover WFDB records under `waves_root` and parse their headers, skipping (and logging) any that fail to parse."""
    logger = get_run_logger()

    records = _discover_records(waves_root)
    logger.info("Found %d records under %s", len(records), waves_root)
    for rec in records:
        logger.info(f"Record: {rec.group_id}")

    infos: list[RecordInfo] = []
    for ref in records:
        try:
            info = parse_record(ref)
        except Exception:
            logger.exception(f"Failed to parse {ref.header_path}")
            continue
        else:
            infos.append(info)
    return infos


@task(log_prints=True)
def fetch_next_record_ids(schema: str, tables_to_ingest: dict[str, str], dbdao) -> dict[str, int]:
    return get_next_record_ids(schema, tables_to_ingest, dbdao)


@task(log_prints=True)
def build_id_maps(
    infos: list[RecordInfo], next_record_ids: dict[str, int]
) -> tuple[dict[int, int], dict[int, int]]:
    person_id_map = build_sequential_id_map(
        pd.Series([int(info.subject_id) for info in infos]),
        next_record_ids["person"],
    )
    visit_occurrence_id_map = build_sequential_id_map(
        pd.Series([int(info.hadm_id) if info.hadm_id is not None else None for info in infos]),
        next_record_ids["visit_occurrence"],
    )
    return person_id_map, visit_occurrence_id_map


@task(log_prints=True)
def build_person_and_visit_dataframes(
    infos: list[RecordInfo],
    person_id_map: dict[int, int],
    visit_occurrence_id_map: dict[int, int],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    person_df = build_person_dataframe(person_id_map)
    visit_occurrence_df = build_visit_occurrence_dataframe(infos, person_id_map, visit_occurrence_id_map)
    return person_df, visit_occurrence_df


@task(log_prints=True)
def build_staging_dataframes(
    infos: list[RecordInfo],
    source_uri_prefix: str,
    target_uri_prefix: str,
    person_id_map: dict[int, int],
    visit_occurrence_id_map: dict[int, int],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    file_rows: list[dict] = []  # for waveform_files_all.csv
    channel_rows: list[dict] = []  # for waveform_channels_all.csv
    for info in infos:
        file_rows.extend(
            build_file_rows(
                info,
                source_uri_prefix,
                target_uri_prefix,
                person_id_map,
                visit_occurrence_id_map,
            )
        )
        channel_rows.extend(build_channel_rows(info, source_uri_prefix, target_uri_prefix))

    return build_dataframes(file_rows, channel_rows, person_id_map, visit_occurrence_id_map)


@task(log_prints=True)
def build_occurrence_and_registry_dataframes(
    waveform_files_all: pd.DataFrame,
    next_record_ids: dict[str, int],
    waveform_occurrence_concept_id: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    waveform_occurrence_df = build_wf_occurrence_dataframe(
        waveform_files_all, next_record_ids["waveform_occurrence"], waveform_occurrence_concept_id
    )
    waveform_registry_df = build_wf_registry_dataframe(
        waveform_files_all, next_record_ids["waveform_registry"], waveform_occurrence_df
    )
    return waveform_occurrence_df, waveform_registry_df


@task(log_prints=True)
def build_channel_metadata_dataframe(
    waveform_channels_all: pd.DataFrame,
    next_record_ids: dict[str, int],
    waveform_registry_df: pd.DataFrame,
    vocab_schema: str,
    dbdao,
) -> pd.DataFrame:
    return build_wf_channel_metadata_dataframe(
        waveform_channels_all,
        next_record_ids["waveform_channel_metadata"],
        waveform_registry_df,
        vocab_schema,
        dbdao,
    )


@task(log_prints=True)
def truncate_tables(schema: str, tables: list[str], dbdao) -> None:
    logger = get_run_logger()
    logger.warning(f"Truncating tables in schema {schema} as per options.to_truncate=True")
    for table in tables:
        try:
            dbdao.truncate_table(schema, table)
            logger.info(f"Successfully truncated table {table} in schema {schema}.")
        except Exception as e:
            logger.error(f"Failed to truncate table {table} in schema {schema}: {e}")
            raise


@task(log_prints=True,
      task_run_name="load_dataframe_{table}")
def load_dataframe(df: pd.DataFrame, table: str, schema: str, dbdao) -> None:
    df.to_sql(table, schema=schema, con=dbdao.engine, if_exists="append", index=False)


@task(log_prints=True)
def load_vocab_tables(
    vocab_schema_name: str,
    to_truncate: bool,
    dbdao,
    tables_to_exclude: list[str] | None = None,
) -> None:
    """Load every CSV in waveform_vocab/ into a like-named table in the vocab schema."""
    logger = get_run_logger()
    excluded = set(tables_to_exclude or [])
    vocab_dir = Path(__file__).parent / "waveform_vocab"

    for csv_path in sorted(vocab_dir.glob("*.csv")):
        table = csv_path.stem
        if table in excluded:
            logger.info(f"Skipping excluded table {table}")
            continue

        df = pd.read_csv(csv_path)

        if to_truncate:
            try:
                dbdao.truncate_table(vocab_schema_name, table)
                logger.info(f"Successfully truncated table {table} in schema {vocab_schema_name}.")
            except Exception as e:
                logger.error(f"Failed to truncate table {table} in schema {vocab_schema_name}: {e}")
                raise

        df.to_sql(table, schema=vocab_schema_name, con=dbdao.engine, if_exists="append", index=False)
        logger.info(f"Loaded {len(df)} rows into {vocab_schema_name}.{table}")


@flow(log_prints=True)
def waveform_etl_plugin(options: WaveformETLOptions):
    logger = get_run_logger()
    if options.flow_action_type == FlowActionType.LOAD_WAVEFORM_DATA:
        logger.info(f"Starting waveform ETL plugin with options: {options}")

        schema = options.schema_name
        waveform_occurrence_concept_id = int(options.waveform_occurrence_concept_id)

        tables_to_ingest = {
            "person": "person_id",
            "visit_occurrence": "visit_occurrence_id",
            "waveform_occurrence": "waveform_occurrence_id",
            "waveform_registry": "waveform_registry_id",
            "waveform_channel_metadata": "waveform_channel_metadata_id",
        }

        dbdao = DBDao(database_code=options.database_code, cache_id=options.cache_id)

        # --- Extract ---
        waveform_data_path = get_waveform_data_path(options.filepath)
        logger.info(f"Waveform data path: {waveform_data_path}")

        infos = extract_records(waveform_data_path)

        if options.to_truncate:
            truncate_tables(schema, list(tables_to_ingest.keys()), dbdao)

        # --- Transform ---
        next_record_ids = fetch_next_record_ids(schema, tables_to_ingest, dbdao)
        logger.info(f"Next record IDs: {next_record_ids}")

        person_id_map, visit_occurrence_id_map = build_id_maps(infos, next_record_ids)
        logger.info(f"Person ID map: {person_id_map}")
        logger.info(f"Visit Occurrence ID map: {visit_occurrence_id_map}")

        person_df, visit_occurrence_df = build_person_and_visit_dataframes(
            infos, person_id_map, visit_occurrence_id_map
        )

        source_uri_prefix = "SOURCE_PREFIX"
        target_uri_prefix = "TARGET_PREFIX"

        waveform_files_all, waveform_channels_all = build_staging_dataframes(
            infos, source_uri_prefix, target_uri_prefix, person_id_map, visit_occurrence_id_map
        )
        logger.info(f"Waveform files all length: {len(waveform_files_all)}")

        waveform_occurrence_df, waveform_registry_df = build_occurrence_and_registry_dataframes(
            waveform_files_all, next_record_ids, waveform_occurrence_concept_id
        )

        waveform_channel_metadata_df = build_channel_metadata_dataframe(
            waveform_channels_all,
            next_record_ids,
            waveform_registry_df,
            options.vocab_schema_name,
            dbdao,
        )

        # --- Load ---
        load_dataframe(person_df, "person", schema, dbdao)
        load_dataframe(visit_occurrence_df, "visit_occurrence", schema, dbdao)
        load_dataframe(waveform_occurrence_df, "waveform_occurrence", schema, dbdao)
        load_dataframe(waveform_registry_df, "waveform_registry", schema, dbdao)
        load_dataframe(waveform_channel_metadata_df, "waveform_channel_metadata", schema, dbdao)
    elif options.flow_action_type == FlowActionType.LOAD_VOCAB:
        logger.info(f"Starting load waveform vocab with options: {options}")

        tables_to_exclude = ["mapping"]

        dbdao = DBDao(database_code=options.database_code, cache_id=options.cache_id)

        load_vocab_tables(
            options.vocab_schema_name,
            options.to_truncate,
            dbdao,
            tables_to_exclude=tables_to_exclude,
        )
