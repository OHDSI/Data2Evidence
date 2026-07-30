from collections import defaultdict
from pathlib import PurePosixPath
import pandas as pd
import sqlalchemy as sql
import datetime as dt

from .table_fields import *
from .types import RecordInfo


# Hardcoded as this flow only supports WFDB format for now.
WAVEFORM_FORMAT_SOURCE_VALUE = "WFDB"
WAVEFORM_FORMAT_CONCEPT_ID = 2082499975


# Compression wrappers that don't count as the "real" extension on their own,
# e.g. "record.csv.gz" should report "CSV.GZ", not just "GZ".
_COMPRESSION_SUFFIXES = {".gz", ".bz2", ".xz", ".zip", ".zst"}


def _extract_extension(path: str | None) -> str | None:
    """Extract the file extension from a path (e.g. "file.csv.gz" -> "CSV.GZ"), or None if none found."""
    if not isinstance(path, str):
        return None
    suffixes = PurePosixPath(path.strip()).suffixes
    if not suffixes:
        return None
    if len(suffixes) >= 2 and suffixes[-1].lower() in _COMPRESSION_SUFFIXES:
        extension = suffixes[-2] + suffixes[-1]
    else:
        extension = suffixes[-1]
    return extension[1:].upper()


def build_sequential_id_map(source_ids: pd.Series, start_id: int) -> dict:
    """Build a mapping from each distinct value in `source_ids` to a sequential integer id, starting from `start_id`."""
    distinct = source_ids.dropna().drop_duplicates()
    return {value: start_id + offset for offset, value in enumerate(distinct)}


def rows_to_dataframe(rows: list[dict], fieldnames: list[str]) -> pd.DataFrame:
    """Build a DataFrame with a fixed column order/set, even when `rows` is empty."""
    return pd.DataFrame(rows, columns=fieldnames)


def build_file_rows(
    info: RecordInfo,
    src_uri_prefix: str,
    target_uri_prefix: str,
    person_id_map: dict[int, int],
    visit_occurrence_id_map: dict[int, int],
) -> list[dict]:
    """Transforms extracted data into waveform_files_all for staging, one row per file (master header, segment headers, .dat files, numerics if present)."""
    group_id = info.ref.group_id
    person_source_id = int(info.subject_id)
    visit_occurrence_source_id = int(info.hadm_id) if info.hadm_id is not None else None
    session_start = info.start_datetime
    session_end = info.end_datetime

    source_dir = f"{info.ref.subject_dir.parent.name}/{info.ref.subject_dir.name}/{info.ref.record_dir.name}"
    src_dir_uri = f"{src_uri_prefix.rstrip('/')}/{source_dir}"
    trg_dir_uri = f"{target_uri_prefix.rstrip('/')}/{source_dir}"

    rows: list[dict] = []

    rows.append(
        _build_file_row(
            group_id=group_id,
            person_source_id=person_source_id,
            visit_occurrence_source_id=visit_occurrence_source_id,
            session_start=session_start,
            session_end=session_end,
            file_start=session_start,
            file_end=session_end,
            src_dir_uri=src_dir_uri,
            trg_dir_uri=trg_dir_uri,
            filename=f"{info.ref.record_name}.hea",
            person_id_map=person_id_map,
            visit_occurrence_id_map=visit_occurrence_id_map,
        )
    )

    for seg in info.segments:
        if seg.name == "~":
            continue
        seg_start = session_start + dt.timedelta(seconds=seg.start_offset_samples / info.fs)
        seg_end = seg_start + dt.timedelta(seconds=seg.n_samples / info.fs)
        for filename in [f"{seg.name}.hea", *seg.files]:
            rows.append(
                _build_file_row(
                    group_id=group_id,
                    person_source_id=person_source_id,
                    visit_occurrence_source_id=visit_occurrence_source_id,
                    session_start=session_start,
                    session_end=session_end,
                    file_start=seg_start,
                    file_end=seg_end,
                    src_dir_uri=src_dir_uri,
                    trg_dir_uri=trg_dir_uri,
                    filename=filename,
                    person_id_map=person_id_map,
                    visit_occurrence_id_map=visit_occurrence_id_map,
                )
            )

    # Numerics file, if present, spans the whole session.
    numerics_name = f"{info.ref.record_name}n.csv.gz"
    if (info.ref.record_dir / numerics_name).exists():
        rows.append(
            _build_file_row(
                group_id=group_id,
                person_source_id=person_source_id,
                visit_occurrence_source_id=visit_occurrence_source_id,
                session_start=session_start,
                session_end=session_end,
                file_start=session_start,
                file_end=session_end,
                src_dir_uri=src_dir_uri,
                trg_dir_uri=trg_dir_uri,
                filename=numerics_name,
                person_id_map=person_id_map,
                visit_occurrence_id_map=visit_occurrence_id_map,
            )
        )

    return rows


def _build_file_row(
    group_id: str,
    person_source_id: int,
    visit_occurrence_source_id: int | None,
    session_start: dt.datetime,
    session_end: dt.datetime,
    file_start: dt.datetime,
    file_end: dt.datetime,
    src_dir_uri: str,
    trg_dir_uri: str,
    filename: str,
    person_id_map: dict[int, int],
    visit_occurrence_id_map: dict[int, int],
) -> dict:
    """Build a single row for waveform_files_all, given the parameters and the source/target URI prefixes."""
    return {
        "group_id": group_id,
        "person_source_id": person_source_id,
        "visit_occurrence_source_id": visit_occurrence_source_id,
        "visit_detail_source_id": None,
        "session_start": session_start,
        "session_end": session_end,
        "file_start": file_start,
        "file_end": file_end,
        "src_file": f"{src_dir_uri}/{filename}",
        "trg_file": f"{trg_dir_uri}/{filename}",
        "person_id": person_id_map.get(person_source_id),
        "visit_occurrence_id": (
            visit_occurrence_id_map.get(visit_occurrence_source_id)
            if visit_occurrence_source_id is not None
            else None
        ),
        "visit_detail_id": 0,
    }



def build_channel_rows(
    info: RecordInfo,
    source_uri_prefix: str,
    target_uri_prefix: str,
) -> list[dict]:
    """Build rows for waveform_channels_all, one row per channel in the record's segments."""
    group_id = info.ref.group_id
    person_source_id = int(info.subject_id)
    visit_occurrence_source_id = int(info.hadm_id) if info.hadm_id is not None else None

    source_dir = f"{info.ref.subject_dir.parent.name}/{info.ref.subject_dir.name}/{info.ref.record_dir.name}"
    trg_dir_uri = f"{target_uri_prefix.rstrip('/')}/{source_dir}"

    rows: list[dict] = []
    for seg in info.segments:
        for ch in seg.channels:
            rows.append(
                {
                    "group_id": group_id,
                    "person_source_id": person_source_id,
                    "visit_occurrence_source_id": visit_occurrence_source_id,
                    "trg_file": f"{trg_dir_uri}/{ch.file_name}",
                    "channel_name": ch.name,
                    "sample_units": ch.units,
                    "sample_rate": ch.sample_rate,
                    "sample_rate_units": "Hz",
                    "gain": ch.gain,
                    "gain_units": ch.units,
                    "segment_length": seg.n_samples,
                }
            )
    return rows

def build_dataframes(
    file_rows: list[dict],
    channel_rows: list[dict],
    person_id_map: dict[int, int],
    visit_occurrence_id_map: dict[int, int],
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Build two staging dataframes for waveform ingestion: waveform_files_all and waveform_channels_all."""
    waveform_files_all = rows_to_dataframe(file_rows, WAVEFORM_FILES_FIELDNAMES)
    waveform_channels_all = rows_to_dataframe(channel_rows, WAVEFORM_CHANNELS_FIELDNAMES)

    waveform_channels_all["person_id"] = waveform_channels_all["person_source_id"].map(person_id_map)
    waveform_channels_all["visit_occurrence_id"] = waveform_channels_all["visit_occurrence_source_id"].map(
        visit_occurrence_id_map
    )
    waveform_channels_all["visit_detail_id"] = None

    return waveform_files_all, waveform_channels_all


def build_person_dataframe(person_id_map: dict[int, int]) -> pd.DataFrame:
    """Build a staging dataframe for person ingestion, one row per distinct subject_id."""
    rows = [
        {
            "person_id": person_id,
            "gender_concept_id": 0,
            "year_of_birth": None,
            "month_of_birth": None,
            "day_of_birth": None,
            "birth_datetime": None,
            "race_concept_id": 0,
            "ethnicity_concept_id": 0,
            "location_id": None,
            "provider_id": None,
            "care_site_id": None,
            "person_source_value": str(person_source_id),
            "gender_source_value": None,
            "gender_source_concept_id": 0,
            "race_source_value": None,
            "race_source_concept_id": 0,
            "ethnicity_source_value": None,
            "ethnicity_source_concept_id": 0,
        }
        for person_source_id, person_id in person_id_map.items()
    ]
    return rows_to_dataframe(rows, PERSON_FIELDNAMES)


def build_visit_occurrence_dataframe(
    infos: list[RecordInfo],
    person_id_map: dict[int, int],
    visit_occurrence_id_map: dict[int, int],
) -> pd.DataFrame:
    """Build a staging dataframe for visit_occurrence ingestion, one row per distinct visit_occurrence_id."""
    rows = []
    seen: set[int] = set()
    for info in infos:
        if info.hadm_id is None:
            continue
        visit_occurrence_source_id = int(info.hadm_id)
        if visit_occurrence_source_id in seen:
            continue
        seen.add(visit_occurrence_source_id)
        rows.append(
            {
                "visit_occurrence_id": visit_occurrence_id_map[visit_occurrence_source_id],
                "person_id": person_id_map[int(info.subject_id)],
                "visit_concept_id": 0,
                "visit_start_date": None,
                "visit_start_datetime": None,
                "visit_end_date": None,
                "visit_end_datetime": None,
                "visit_type_concept_id": 0,
                "provider_id": None,
                "care_site_id": None,
                "visit_source_value": str(visit_occurrence_source_id),
                "visit_source_concept_id": 0,
                "admitted_from_concept_id": 0,
                "admitted_from_source_value": None,
                "discharged_to_concept_id": 0,
                "discharged_to_source_value": None,
                "preceding_visit_occurrence_id": None,
            }
        )
    return rows_to_dataframe(rows, VISIT_OCCURRENCE_FIELDNAMES)


def build_wf_occurrence_dataframe(waveform_files_all: pd.DataFrame, waveform_occurrence_id: int, waveform_occurrence_concept_id: int) -> pd.DataFrame:
    """Build a staging dataframe for waveform_occurrence ingestion, one row per record (group_id)."""
    occurrence = waveform_files_all.groupby("group_id", as_index=False).agg(
        person_id=("person_id", "max"),
        waveform_occurrence_start_datetime=("session_start", "max"),
        waveform_occurrence_end_datetime=("session_end", "max"),
        visit_occurrence_id=("visit_occurrence_id", "max"),
        visit_detail_id=("visit_detail_id", "max"),
        num_of_files=("group_id", "count"),
    )

    waveform_occurrence_id_map = build_sequential_id_map(occurrence["group_id"], waveform_occurrence_id)
    occurrence["waveform_occurrence_id"] = occurrence["group_id"].map(waveform_occurrence_id_map)
    occurrence["waveform_occurrence_concept_id"] = waveform_occurrence_concept_id
    occurrence["preceding_waveform_occurrence_id"] = None
    occurrence["waveform_format_concept_id"] = WAVEFORM_FORMAT_CONCEPT_ID
    occurrence["waveform_occurrence_source_value"] = occurrence["group_id"]
    occurrence["waveform_format_source_value"] = WAVEFORM_FORMAT_SOURCE_VALUE

    return occurrence[WAVEFORM_OCCURRENCE_FIELDNAMES]


def _shared_registry_columns(rows: pd.DataFrame) -> dict:
    """ Build a dict of columns shared by all waveform_registry rows, given a DataFrame of waveform_files_all rows."""
    return {
        "waveform_registry_id": None,
        "waveform_occurrence_id": rows["waveform_occurrence_id"],
        "waveform_feature_id": None,
        "person_id": rows["person_id"],
        "waveform_file_start_datetime": rows["file_start"],
        "waveform_file_end_datetime": rows["file_end"],
        "visit_occurrence_id": rows["visit_occurrence_id"],
        "visit_detail_id": rows["visit_detail_id"],
        "file_extension_concept_id": 0,
    }


def build_wf_registry_dataframe(
    waveform_files_all: pd.DataFrame,
    waveform_registry_id: int,
    waveform_occurrence: pd.DataFrame,
) -> pd.DataFrame:
    """Build a staging dataframe for waveform_registry ingestion, one row per file (master header, segment headers, .dat files, numerics if present)."""
    f = waveform_files_all.copy()
    f["src_extension"] = f["src_file"].map(_extract_extension)

    occurrence_id_by_group = dict(
        zip(waveform_occurrence["waveform_occurrence_source_value"], waveform_occurrence["waveform_occurrence_id"])
    )
    f["waveform_occurrence_id"] = f["group_id"].map(occurrence_id_by_group)

    is_numerics = f["src_file"].str.lower().str.contains(r"n\.hea$", regex=True) & f[
        "trg_file"
    ].str.lower().str.contains(r"n\.csv$", regex=True)
    numerics = f[is_numerics]
    non_numerics = f[~is_numerics]

    # Row 1 for numerics files: HEA extension metadata pointing at the CSV target.
    numerics_hea_rows = pd.DataFrame(
        {
            **_shared_registry_columns(numerics),
            "file_extension_source_value": numerics["src_extension"],
            "waveform_source_file_uri": numerics["src_file"],
            "waveform_target_file_uri": numerics["src_file"].str.replace(r"\.hea$", ".csv", regex=True),
        }
    )

    # Row 2 for numerics files: CSV extension metadata. This row's own "source" is the
    # derived .csv path (src_file with .hea swapped for .csv), not the raw src_file
    # column, so its extension is extracted from that derived path, not trg_file.
    numerics_csv_source = numerics["src_file"].str.replace(r"\.hea$", ".csv", regex=True)
    numerics_csv_rows = pd.DataFrame(
        {
            **_shared_registry_columns(numerics),
            "file_extension_source_value": numerics_csv_source.map(_extract_extension),
            "waveform_source_file_uri": numerics_csv_source,
            "waveform_target_file_uri": numerics["trg_file"],
        }
    )

    # Base row for non-numerics files.
    base_rows = pd.DataFrame(
        {
            **_shared_registry_columns(non_numerics),
            "file_extension_source_value": non_numerics["src_extension"],
            "waveform_source_file_uri": non_numerics["src_file"],
            "waveform_target_file_uri": non_numerics["trg_file"],
        }
    )

    registry = pd.concat([numerics_hea_rows, numerics_csv_rows, base_rows], ignore_index=True)

    # One distinct id per row (not a value->id map like person_id/visit_occurrence_id --
    # every registry row, even two for the same numerics file, needs its own unique key),
    # sequential starting from the next available waveform_registry_id.
    registry["waveform_registry_id"] = range(waveform_registry_id, waveform_registry_id + len(registry))


    # Todo: file_extension_concept_id is 0 for now as there are no matching concept ids
    
    return registry[WAVEFORM_REGISTRY_FIELDNAMES]


def _get_concept_id_map(vocab_schema: str, dbdao) -> dict[str, int]:
    """Map lowercased WFE Lead concept names (channel names and metadata types alike) to their standard concept_id, from the vocab schema's concept table."""
    metadata_obj = sql.MetaData(schema=vocab_schema)
    concept_table = sql.Table("concept", metadata_obj, autoload_with=dbdao.engine)
    stmt = sql.select(concept_table.c.concept_id, concept_table.c.concept_name).where(
        concept_table.c.concept_class_id == "WFE Lead",
        concept_table.c.standard_concept == "S",
        concept_table.c.domain_id == "Waveform Metadata",
        concept_table.c.vocabulary_id == "WAVEFORM",
    )
    concepts = pd.read_sql(stmt, dbdao.engine)
    return defaultdict(int, zip(concepts["concept_name"].str.lower(), concepts["concept_id"]))

def _get_unit_concept_id_map(vocab_schema: str, dbdao) -> dict[str, int]:
    """Map lowercased Unit concept names to their standard concept_id, from the vocab schema's concept table."""
    metadata_obj = sql.MetaData(schema=vocab_schema)
    concept_table = sql.Table("concept", metadata_obj, autoload_with=dbdao.engine)
    stmt = sql.select(concept_table.c.concept_id, concept_table.c.concept_name).where(
        concept_table.c.concept_class_id == "Unit",
        concept_table.c.domain_id == "Unit",
        concept_table.c.standard_concept == "S",
        concept_table.c.vocabulary_id == "WAVEFORM",
    )
    concepts = pd.read_sql(stmt, dbdao.engine)
    return defaultdict(int, zip(concepts["concept_name"].str.lower(), concepts["concept_id"]))


# OMOP standard concept ID for the unit "samples" (concept_name="sample", domain="Unit").
_SAMPLES_UNIT_CONCEPT_ID = 2061509816


def _metric_rows(channels: pd.DataFrame, metadata_type: str, value_as_number, unit_source_value) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "trg_file": channels["trg_file"],
            "channel_name": channels["channel_name"],
            "metadata_type": metadata_type,
            "value_as_number": value_as_number,
            "unit_source_value": unit_source_value,
        }
    )


def _unit_concept_id(unit_source_value) -> int:
    if isinstance(unit_source_value, str) and unit_source_value.upper() == "SAMPLES":
        return _SAMPLES_UNIT_CONCEPT_ID
    return 0


def _resolve_unit_concept_id(unit_source_value, unit_concept_map: dict[str, int]) -> int:
    """"Samples" is a fixed concept id; everything else is looked up from the vocab's Unit concepts."""
    unit_concept_id = _unit_concept_id(unit_source_value)
    if unit_concept_id:
        return unit_concept_id
    if isinstance(unit_source_value, str):
        return unit_concept_map[unit_source_value.lower()]
    return 0


def build_wf_channel_metadata_dataframe(
    waveform_channels_all: pd.DataFrame,
    waveform_channel_metadata_id: int,
    waveform_registry: pd.DataFrame,
    vocab_schema: str,
    dbdao
) -> pd.DataFrame:

    c = waveform_channels_all
    concept_id_map = _get_concept_id_map(vocab_schema, dbdao)
    unit_concept_id_map = _get_unit_concept_id_map(vocab_schema, dbdao)

    unpivoted = pd.concat(
        [
            _metric_rows(c, "AMPLITUDE", None, c["sample_units"]),
            _metric_rows(c, "SAMPLERATE", c["sample_rate"], c["sample_rate_units"]),
            _metric_rows(c, "RESOLUTION", c["gain"], c["gain_units"]),
            _metric_rows(c, "SEGMENTLENGTH", c["segment_length"], "samples"),
        ],
        ignore_index=True,
    )

    registry_link = (
        waveform_registry[["waveform_target_file_uri", "waveform_registry_id"]]
        .drop_duplicates(subset="waveform_target_file_uri")
        .rename(columns={"waveform_target_file_uri": "trg_file"})
    )
    unpivoted = unpivoted.merge(registry_link, on="trg_file", how="left", validate="many_to_one")

    metadata = pd.DataFrame(
        {
            "waveform_channel_metadata_id": range(
                waveform_channel_metadata_id, waveform_channel_metadata_id + len(unpivoted)
            ),
            "waveform_registry_id": unpivoted["waveform_registry_id"],
            "procedure_occurrence_id": None, # Todo: link to procedure_occurrence if available 
            "device_exposure_id": None, # Todo: link to procedure_occurrence if available 
            "waveform_channel_source_value": unpivoted["channel_name"],
            "channel_concept_id": unpivoted["channel_name"].str.lower().map(concept_id_map),
            "metadata_source_value": unpivoted["metadata_type"],
            "metadata_concept_id": unpivoted["metadata_type"].str.lower().map(concept_id_map),
            "value_as_number": unpivoted["value_as_number"],
            "value_as_concept_id": 0,
            "value_as_string": None,
            "unit_concept_id": unpivoted["unit_source_value"].apply(
                _resolve_unit_concept_id, unit_concept_map=unit_concept_id_map
            ),
            "unit_source_value": unpivoted["unit_source_value"],
        }
    )

    return metadata[WAVEFORM_CHANNEL_METADATA_FIELDNAMES]
