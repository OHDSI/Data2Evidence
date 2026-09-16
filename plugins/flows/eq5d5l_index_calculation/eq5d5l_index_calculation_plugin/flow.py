import datetime
import os
from typing import Optional

from .types import (
    Eq5d5lPluginType,
    Eq5d5lCalculateConfig,
    DIMENSION_ORDER,
    DIMENSION_CONCEPT_ID_MAP,
    EQ5D5L_INDEX_MEASUREMENT_CONCEPT_ID,
    EQ5D5L_TYPE_CONCEPT_ID,
    EQ5D5L_ALGORITHM_METADATA_NAME,
)
from .scoring import load_value_set, assemble_health_state, health_state_to_index

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.types import SupportedDatabaseDialects

from prefect import flow, task
from prefect.logging import get_run_logger

os.environ['plugin_name'] = 'eq5d5l_index_calculation_plugin'

# select_rows_where_in()/delete_and_insert_rows() only exist on SqlAlchemyDao (and
# IbisDao, which subclasses it) - not on TrexDao. A TREX-dialect dataset would
# otherwise fail deep inside the flow with a bare AttributeError.
_REQUIRED_DAO_METHODS = ("select_rows_where_in", "delete_and_insert_rows")

_SUPPORTED_DIALECTS = (SupportedDatabaseDialects.POSTGRES,)

# fhir_omop_key_map's ON CONFLICT target - see _require_fhir_mapping_table().
_KEY_MAP_UNIQUE_COLUMNS = ("fhir_id", "fhir_resource_type", "omop_table_name", "omop_id")

# Pairs per stale-lineage DELETE statement - keeps the generated SQL bounded
# instead of growing with the whole prior measurement set on a large rerun.
_STALE_KEY_MAP_DELETE_BATCH_SIZE = 500


@flow(log_prints=True)
def eq5d5l_index_calculation_plugin(options: Eq5d5lPluginType):
    logger = get_run_logger()
    config = options.config
    logger.info(f"Flow parameters received: {config.json()}")
    calculate_eq5d5l_index(config)


def calculate_eq5d5l_index(config: Eq5d5lCalculateConfig):
    logger = get_run_logger()

    value_set = load_value_set(config.country_code)
    logger.info(f"Loaded EuroQol value set for country_code='{config.country_code}'")

    dbdao = DBDao(database_code=config.database_code, cache_id=config.omop_dataset_id)
    missing_dao_methods = [m for m in _REQUIRED_DAO_METHODS if not hasattr(dbdao, m)]
    if dbdao.dialect not in _SUPPORTED_DIALECTS or missing_dao_methods:
        raise NotImplementedError(
            f"eq5d5l_index_calculation_plugin does not support the '{dbdao.dialect}' "
            f"dialect ({type(dbdao).__name__} is missing {missing_dao_methods}); use a "
            f"Postgres-backed dataset instead."
        )

    dimension_concept_id_map = DIMENSION_CONCEPT_ID_MAP

    observation_rows = read_eq5d5l_observations(
        dbdao=dbdao,
        schema_name=config.schema_name,
        dimension_concept_id_map=dimension_concept_id_map,
    )
    logger.info(f"Fetched {len(observation_rows)} observation row(s) for the 5 EQ-5D-5L dimensions")

    rows = calculate_index_rows(
        observation_rows=observation_rows,
        dimension_concept_id_map=dimension_concept_id_map,
        value_set=value_set,
    )
    logger.info(f"Computed {len(rows)} EQ-5D-5L index row(s)")

    if config.dry_run:
        logger.info("dry_run=True, skipping write to measurement")
        return rows

    measurement_concept_id = EQ5D5L_INDEX_MEASUREMENT_CONCEPT_ID
    for row in rows:
        row["measurement_concept_id"] = measurement_concept_id

    if rows:
        # Checked before write_measurements()'s destructive delete-and-replace, not
        # just inside write_fhir_key_map() - otherwise a missing prerequisite would
        # be discovered only after the old measurement rows are already gone,
        # leaving them replaced with no FHIR lineage/metadata written for them.
        mapping_schema = f"{config.database_code}_{config.schema_name}_fhir_mapping"
        # cache_id must match the OMOP dbdao's above: on a snapshot/cache dataset,
        # omop_dataset_id (not database_code) is the catalog the mapping schema
        # actually lives in.
        mapping_dao = DBDao(
            dialect=SupportedDatabaseDialects.TREX,
            database_code=config.database_code,
            cache_id=config.omop_dataset_id,
        )
        _require_fhir_mapping_table(mapping_dao, mapping_schema)

    inserted_rows, previous_measurement_rows = write_measurements(
        dbdao=dbdao,
        schema_name=config.schema_name,
        measurement_concept_id=measurement_concept_id,
        rows=rows,
    )
    logger.info(
        f"Wrote {len(rows)} EQ-5D-5L measurement row(s) to "
        f"{config.schema_name}.measurement (measurement_concept_id={measurement_concept_id})"
    )

    write_fhir_key_map(
        dbdao=dbdao,
        database_code=config.database_code,
        omop_dataset_id=config.omop_dataset_id,
        schema_name=config.schema_name,
        rows=inserted_rows,
        previous_measurement_rows=previous_measurement_rows,
    )

    if inserted_rows:
        write_algorithm_metadata(
            dbdao=dbdao,
            schema_name=config.schema_name,
            country_code=config.country_code,
            value_set=value_set,
        )

    return rows


@task(log_prints=True)
def read_eq5d5l_observations(dbdao, schema_name: str, dimension_concept_id_map: dict) -> list:
    """
    Read the 5 EQ-5D-5L dimension observation rows from the OMOP `observation` table,
    identified by observation_concept_id per dimension. This assumes the upstream FHIR
    QuestionnaireResponse -> OMOP transform (EQ-5D-5LObservationMap.json, run outside
    this plugin) has already populated these rows.
    This plugin does not connect to the FHIR cache or do any FHIR resolution itself.
    """
    concept_ids = list(dimension_concept_id_map.values())
    return dbdao.select_rows_where_in(
        schema=schema_name,
        table="observation",
        columns=[
            "observation_id",
            "person_id",
            "observation_concept_id",
            "observation_source_value",
            "value_source_value",
            "observation_date",
            "observation_datetime",
            "visit_occurrence_id",
        ],
        where_column="observation_concept_id",
        where_values=concept_ids,
    )


def _extract_level(code: Optional[str]) -> Optional[int]:
    """Parses a 1-5 EQ-5D-5L level from `code`; returns None if it isn't one."""
    if code is None:
        return None
    try:
        level = int(code)
    except (TypeError, ValueError):
        return None
    return level if level in (1, 2, 3, 4, 5) else None


@task(log_prints=True)
def calculate_index_rows(
    observation_rows: list,
    dimension_concept_id_map: dict,
    value_set: dict,
) -> list:
    """
    Group the flat observation rows by observation_source_value - per
    EQ-5D-5LObservationMap.json's design, this holds the plain source
    QuestionnaireResponse id (qrId) shared by all 5 dimension rows of one
    administration, after the downstream python_node's resolution step - then score
    each complete group. Each dimension's answer level is read from
    value_source_value as a plain numeric code ("1".."5"); a non-numeric code is
    treated as missing for that dimension (per EQ-5D-5LObservationMap.json's own
    doc comment, the FHIR answer code vocabulary isn't guaranteed numeric, but this
    plugin has no per-deployment mapping to fall back on for one that isn't).
    """
    logger = get_run_logger()
    concept_to_dimension = {v: k for k, v in dimension_concept_id_map.items()}

    groups = {}
    for row in observation_rows:
        dim = concept_to_dimension.get(row["observation_concept_id"])
        if dim is None:
            continue
        qr_id = row["observation_source_value"]
        if qr_id is None:
            logger.warning(
                f"observation_id={row['observation_id']}: no observation_source_value "
                f"(expected the source QuestionnaireResponse id) - cannot group into a "
                f"questionnaire administration, skipping"
            )
            continue
        groups.setdefault(qr_id, []).append((dim, row))

    rows = []
    for qr_id, dim_rows in groups.items():
        dimension_answers = {}
        visit_occurrence_id = None
        person_ids = set()
        observed_at = None
        for dim, row in dim_rows:
            level = _extract_level(row["value_source_value"])
            if level is not None:
                dimension_answers[dim] = level
            if row["visit_occurrence_id"] is not None:
                visit_occurrence_id = row["visit_occurrence_id"]
            if observed_at is None:
                observed_at = row["observation_datetime"] or row["observation_date"]
            person_ids.add(row["person_id"])

        if len(person_ids) > 1:
            logger.warning(
                f"qrId={qr_id}: rows disagree on person_id ({person_ids}) - "
                f"skipping this questionnaire administration"
            )
            continue

        missing = [d for d in DIMENSION_ORDER if d not in dimension_answers]
        if missing:
            logger.warning(
                f"qrId={qr_id}: missing or unparseable dimension(s) {missing} - "
                f"skipping this questionnaire administration"
            )
            continue

        health_state = assemble_health_state(dimension_answers)
        index_value = health_state_to_index(health_state, value_set)

        is_datetime = isinstance(observed_at, datetime.datetime)
        measurement_date = observed_at.date() if is_datetime else observed_at
        measurement_datetime = observed_at if is_datetime else None

        rows.append({
            "person_id": int(person_ids.pop()),
            "measurement_date": measurement_date,
            "measurement_datetime": measurement_datetime,
            "measurement_type_concept_id": EQ5D5L_TYPE_CONCEPT_ID,
            "value_as_number": index_value,
            "visit_occurrence_id": int(visit_occurrence_id) if visit_occurrence_id is not None else None,
            "measurement_source_value": qr_id,
            "value_source_value": health_state,
        })
    return rows


@task(log_prints=True)
def write_measurements(
    dbdao, schema_name: str, measurement_concept_id: int, rows: list
) -> tuple[list, list]:
    """
    Deletes and re-inserts this dataset's measurement rows for measurement_concept_id.
    Returns (inserted_rows, previous_measurement_rows) - see README's "Re-run /
    overwrite behavior" for the full contract. previous_measurement_rows carries
    both measurement_id and measurement_source_value (not just the id) so callers
    can identify the exact rows being replaced, not just their id - an id alone
    isn't a safe identity check once ids can be reused by a later run.
    """
    logger = get_run_logger()
    if not rows:
        logger.warning(
            "No EQ-5D-5L index rows were computed - leaving existing "
            f"{schema_name}.measurement rows (measurement_concept_id={measurement_concept_id}) "
            "untouched rather than deleting them with nothing to replace them."
        )
        return [], []

    previous_measurement_rows = dbdao.select_rows_where_in(
        schema=schema_name,
        table="measurement",
        columns=["measurement_id", "measurement_source_value"],
        where_column="measurement_concept_id",
        where_values=[measurement_concept_id],
    )

    inserted_rows = dbdao.delete_and_insert_rows(
        schema=schema_name,
        table="measurement",
        delete_column="measurement_concept_id",
        delete_value=measurement_concept_id,
        insert_rows=rows,
        id_column="measurement_id",
    )
    return inserted_rows, previous_measurement_rows


def _require_fhir_mapping_table(mapping_dao, mapping_schema: str) -> None:
    """
    This plugin is a lineage *consumer*: it only ever appends key-map rows for the
    measurements it computed, on top of a mapping schema/table that the upstream
    EQ5D5L-to-OMOP-Observation FHIR->OMOP pipeline (FhirMappingNode, see
    plugins/flows/data_transformation/dataflow_ui_plugin/nodes.py) must already have
    created by writing the 5 dimension observation rows. It deliberately does not
    create the schema/table itself - a missing one means that prerequisite ETL run
    hasn't happened for this dataset, which should fail loudly here rather than be
    silently papered over with a fresh, empty mapping table.
    """
    if not mapping_dao.check_schema_exists(mapping_schema) or not mapping_dao.check_table_exists(
        mapping_schema, "fhir_omop_key_map"
    ):
        raise ValueError(
            f"'{mapping_schema}.fhir_omop_key_map' does not exist. This plugin requires the "
            f"upstream EQ5D5L-to-OMOP-Observation FHIR->OMOP pipeline to have already run for "
            f"this dataset (creating the FHIR mapping schema/table) before this plugin runs."
        )

    # A table created by an older FhirMappingNode can still carry its former
    # (fhir_id, fhir_resource_type) unique index rather than the current 4-column
    # one this plugin's ON CONFLICT target requires - existence alone isn't enough.
    indexes = mapping_dao.get_indexes_for_table(mapping_schema, "fhir_omop_key_map")
    has_current_unique_index = any(
        index.get("unique") and all(col in index.get("definition", "") for col in _KEY_MAP_UNIQUE_COLUMNS)
        for index in indexes
    )
    if not has_current_unique_index:
        raise ValueError(
            f"'{mapping_schema}.fhir_omop_key_map' exists but has no unique index over "
            f"{_KEY_MAP_UNIQUE_COLUMNS}, which this plugin's ON CONFLICT target requires. "
            f"Re-run the upstream EQ5D5L-to-OMOP-Observation FHIR->OMOP pipeline for this "
            f"dataset to upgrade the mapping table's index before running this plugin again."
        )


def _delete_stale_measurement_key_map_rows(
    mapping_dao, mapping_schema: str, previous_measurement_rows: list, con=None
) -> None:
    """
    Deletes fhir_omop_key_map rows for the exact (measurement_id,
    measurement_source_value) pairs write_measurements() just replaced. Matched on
    both columns, not omop_id alone - an id-allocator can reuse a deleted id for an
    unrelated row from a concurrent run on the same dataset, and matching by id
    alone would delete that other run's fresh mapping instead of the actually-stale
    one. Runs in _STALE_KEY_MAP_DELETE_BATCH_SIZE-sized batches (one DELETE
    statement each) so a large rerun's generated SQL stays bounded rather than
    growing with the whole prior measurement set.
    """
    mapping_escaped_schema = mapping_schema.replace('"', '""')
    for batch_start in range(0, len(previous_measurement_rows), _STALE_KEY_MAP_DELETE_BATCH_SIZE):
        batch = previous_measurement_rows[batch_start:batch_start + _STALE_KEY_MAP_DELETE_BATCH_SIZE]
        # omop_id/fhir_id are VARCHAR (see write_fhir_key_map's str(row["measurement_id"])
        # below), so these must be quoted string literals, not bare numeric literals.
        conditions = " OR ".join(
            "(omop_id = '{omop_id}' AND fhir_id = '{fhir_id}')".format(
                omop_id=int(row["measurement_id"]),
                fhir_id=str(row["measurement_source_value"]).replace("'", "''"),
            )
            for row in batch
        )
        mapping_dao.execute_sql(f"""
            DELETE FROM "{mapping_escaped_schema}".fhir_omop_key_map
            WHERE fhir_resource_type = 'QuestionnaireResponse' AND omop_table_name = 'measurement'
            AND ({conditions})
        """, con=con)


@task(log_prints=True)
def write_fhir_key_map(
    dbdao,
    database_code: str,
    omop_dataset_id: str,
    schema_name: str,
    rows: list,
    previous_measurement_rows: list,
):
    """
    Reconciles `previous_measurement_rows` then upserts fhir_omop_key_map lineage
    for `rows` - see README's "FHIR lineage" section for the full contract.
    """
    if not rows and not previous_measurement_rows:
        return
    logger = get_run_logger()
    mapping_schema = f"{database_code}_{schema_name}_fhir_mapping"
    # cache_id must match the OMOP dbdao's: on a snapshot/cache dataset,
    # omop_dataset_id (not database_code) is the catalog the mapping schema lives in.
    mapping_dao = DBDao(
        dialect=SupportedDatabaseDialects.TREX, database_code=database_code, cache_id=omop_dataset_id,
    )
    _require_fhir_mapping_table(mapping_dao, mapping_schema)

    if rows:
        # write_measurements() and this task run as separate transactions, so a
        # concurrent rerun of this same dataset could have replaced these measurement
        # rows - and, since ids can be reused, even reassigned one of `rows`' own ids to
        # an unrelated row - by the time we get here. Matching on (measurement_id,
        # measurement_source_value) together, not id alone, tells an actually-current
        # row apart from a same-id row a concurrent run just wrote for a different qrId.
        current_rows = {
            (row["measurement_id"], row["measurement_source_value"])
            for row in dbdao.select_rows_where_in(
                schema=schema_name,
                table="measurement",
                columns=["measurement_id", "measurement_source_value"],
                where_column="measurement_id",
                where_values=[row["measurement_id"] for row in rows],
            )
        }
        stale_rows = [
            row for row in rows
            if (row["measurement_id"], row["measurement_source_value"]) not in current_rows
        ]
        if stale_rows:
            logger.warning(
                f"{len(stale_rows)} measurement row(s) were already replaced by another run "
                f"before their fhir_omop_key_map lineage could be written - skipping them."
            )
        rows = [
            row for row in rows
            if (row["measurement_id"], row["measurement_source_value"]) in current_rows
        ]

    key_map_rows = [
        (
            row["measurement_source_value"],
            "QuestionnaireResponse",
            "measurement",
            str(row["measurement_id"]),
        )
        for row in rows
    ]

    if not previous_measurement_rows and not key_map_rows:
        return

    # The reconciling delete(s) and the replacement insert run as one transaction
    # (autocommit=False, committed on this block's successful exit) - otherwise a
    # failure between them (e.g. the insert) would leave the dataset with its
    # lineage cleared and nothing written to replace it.
    with mapping_dao._get_connection(autocommit=False) as con:
        if previous_measurement_rows:
            _delete_stale_measurement_key_map_rows(mapping_dao, mapping_schema, previous_measurement_rows, con=con)
            logger.info(
                f"Removed stale fhir_omop_key_map row(s) for {len(previous_measurement_rows)} "
                f"previous measurement row(s) in {mapping_schema}"
            )
        if key_map_rows:
            mapping_dao.batch_insert_values(
                mapping_schema,
                "fhir_omop_key_map",
                ["fhir_id", "fhir_resource_type", "omop_table_name", "omop_id"],
                key_map_rows,
                con=con,
                on_conflict="ON CONFLICT (fhir_id, fhir_resource_type, omop_table_name, omop_id) DO NOTHING",
            )
            logger.info(f"Upserted {len(key_map_rows)} fhir_omop_key_map row(s) in {mapping_schema}")


@task(log_prints=True)
def write_algorithm_metadata(dbdao, schema_name: str, country_code: str, value_set: dict) -> None:
    """
    Record one OMOP `metadata` row per dataset describing which EuroQol value set and
    scoring method (see scoring.SUPPORTED_METHODS) produced the current
    `measurement` rows, so a later reader of `{schema_name}.metadata` can see how
    they were derived without needing this plugin's source or run history. Uses
    metadata_concept_id=0 / metadata_type_concept_id=0 - no standard OMOP concept
    represents "value-set-derived questionnaire scoring algorithm" - so the
    description lives entirely in `name`/`value_as_string`, the same way the
    `metadata` table is meant to hold free-text ETL provenance that has no fitting
    standard concept.

    Overwrite-on-rerun, mirroring write_measurements(): deletes any existing row(s)
    named EQ5D5L_ALGORITHM_METADATA_NAME before inserting the new one, in the same
    transaction. Without this, re-running for a different country_code (or a value
    set update) would leave the *previous* run's algorithm description sitting
    alongside the new one - or, worse, alongside measurement rows it no longer
    describes - rather than replacing it to stay in sync with write_measurements()'s
    own overwrite-on-rerun of the `measurement` rows it documents.
    """
    logger = get_run_logger()
    value_as_string = (
        f"country_code={country_code.upper()}; method={value_set.get('method')}; "
        f"source={value_set.get('source', '')}"
    )[:250]

    now = datetime.datetime.now()
    dbdao.delete_and_insert_rows(
        schema=schema_name,
        table="metadata",
        delete_column="name",
        delete_value=EQ5D5L_ALGORITHM_METADATA_NAME,
        insert_rows=[{
            "metadata_concept_id": 0,
            "metadata_type_concept_id": 0,
            "name": EQ5D5L_ALGORITHM_METADATA_NAME,
            "value_as_string": value_as_string,
            "value_as_concept_id": None,
            "value_as_number": None,
            "metadata_date": now.date(),
            "metadata_datetime": now,
        }],
        id_column="metadata_id",
    )
    logger.info(f"Wrote EQ-5D-5L algorithm metadata row to {schema_name}.metadata: {value_as_string}")
