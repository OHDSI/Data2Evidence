import datetime
from pathlib import Path
from unittest.mock import ANY, MagicMock

import pytest
from prefect import flow as prefect_flow
from prefect.testing.utilities import prefect_test_harness

from eq5d5l_index_calculation_plugin import flow, scoring
from eq5d5l_index_calculation_plugin.types import Eq5d5lCalculateConfig
from _shared_flow_utils.types import SupportedDatabaseDialects


@pytest.fixture(autouse=True, scope="session")
def _prefect_test_fixture():
    # Run task/flow-decorated functions against a temp SQLite Prefect API,
    # mirroring dataflow_ui_plugin/tests/conftest.py's convention.
    with prefect_test_harness():
        yield


@pytest.fixture(autouse=True)
def _value_set_dir(monkeypatch):
    real_dir = Path(scoring.__file__).resolve().parent / "external" / "value_sets"
    monkeypatch.setattr(scoring, "ValueSetDir", str(real_dir))
    monkeypatch.setattr("eq5d5l_index_calculation_plugin.flow.load_value_set", scoring.load_value_set)


@prefect_flow
def _run(fn, *args, **kwargs):
    # get_run_logger() (called by every @task and by calculate_eq5d5l_index itself)
    # requires an active flow or task run context. Tests call task functions via
    # `.fn` (the raw, undecorated function - skipping Prefect's own task-run
    # orchestration/persistence) or call the plain `calculate_eq5d5l_index` function
    # directly, so this thin `@flow` wrapper is what supplies that context.
    return fn(*args, **kwargs)


def _observation_row(observation_id, person_id, observation_concept_id, qr_id, answer_code,
                      visit_occurrence_id=None, observation_date=datetime.date(2024, 1, 1)):
    return {
        "observation_id": observation_id,
        "person_id": person_id,
        "observation_concept_id": observation_concept_id,
        "observation_source_value": qr_id,
        "value_source_value": answer_code,
        "observation_date": observation_date,
        "observation_datetime": None,
        "visit_occurrence_id": visit_occurrence_id,
    }


def _full_health_group(qr_id="qr-1", person_id=101, visit_occurrence_id=201):
    # One row per dimension, all at level 1 ("11111" - full health).
    from eq5d5l_index_calculation_plugin.types import DIMENSION_CONCEPT_ID_MAP
    return [
        _observation_row(idx, person_id, concept_id, qr_id, "1", visit_occurrence_id)
        for idx, concept_id in enumerate(DIMENSION_CONCEPT_ID_MAP.values())
    ]


def _current_key_map_indexes():
    # A get_indexes_for_table() result matching the 4-column unique index
    # _require_fhir_mapping_table() requires.
    return [{
        "name": "fhir_omop_key_map_fhir_id_type_table_omop_id_idx",
        "unique": True,
        "column_names": ["fhir_id", "fhir_resource_type", "omop_table_name", "omop_id"],
        "definition": (
            "CREATE UNIQUE INDEX fhir_omop_key_map_fhir_id_type_table_omop_id_idx ON "
            "fhir_omop_key_map (fhir_id, fhir_resource_type, omop_table_name, omop_id)"
        ),
    }]


class TestCalculateIndexRows:
    def test_groups_by_qr_id_and_scores_full_health(self):
        from eq5d5l_index_calculation_plugin.types import DIMENSION_CONCEPT_ID_MAP
        value_set = scoring.load_value_set("AU")
        rows = _run(
            flow.calculate_index_rows.fn,
            observation_rows=_full_health_group(),
            dimension_concept_id_map=DIMENSION_CONCEPT_ID_MAP,
            value_set=value_set,
        )
        assert len(rows) == 1
        row = rows[0]
        assert row["person_id"] == 101
        assert row["visit_occurrence_id"] == 201
        assert row["value_source_value"] == "11111"
        assert row["value_as_number"] == 1.0
        assert row["measurement_source_value"] == "qr-1"
        assert row["measurement_date"] == datetime.date(2024, 1, 1)
        assert row["measurement_type_concept_id"] == 32862

    def test_skips_dimension_with_non_numeric_code(self):
        # answer_code_level_map has been removed - a non-numeric value_source_value
        # is unconditionally unparseable now, so this dimension (and therefore the
        # whole group, missing one of the 5) is skipped rather than scored.
        from eq5d5l_index_calculation_plugin.types import DIMENSION_CONCEPT_ID_MAP
        value_set = scoring.load_value_set("AU")
        concept_ids = list(DIMENSION_CONCEPT_ID_MAP.values())
        observation_rows = [
            _observation_row(0, 1, concept_ids[0], "qr-2", "no-problems"),
            _observation_row(1, 1, concept_ids[1], "qr-2", "1"),
            _observation_row(2, 1, concept_ids[2], "qr-2", "1"),
            _observation_row(3, 1, concept_ids[3], "qr-2", "1"),
            _observation_row(4, 1, concept_ids[4], "qr-2", "1"),
        ]
        rows = _run(
            flow.calculate_index_rows.fn,
            observation_rows=observation_rows,
            dimension_concept_id_map=DIMENSION_CONCEPT_ID_MAP,
            value_set=value_set,
        )
        assert rows == []

    def test_skips_dimension_with_out_of_range_numeric_code(self):
        # A code outside the valid 1-5 range (e.g. "6") must be unparseable, not
        # reach assemble_health_state() and abort the whole flow.
        from eq5d5l_index_calculation_plugin.types import DIMENSION_CONCEPT_ID_MAP
        value_set = scoring.load_value_set("AU")
        concept_ids = list(DIMENSION_CONCEPT_ID_MAP.values())
        observation_rows = [
            _observation_row(0, 1, concept_ids[0], "qr-2", "6"),
            _observation_row(1, 1, concept_ids[1], "qr-2", "1"),
            _observation_row(2, 1, concept_ids[2], "qr-2", "1"),
            _observation_row(3, 1, concept_ids[3], "qr-2", "1"),
            _observation_row(4, 1, concept_ids[4], "qr-2", "1"),
        ]
        rows = _run(
            flow.calculate_index_rows.fn,
            observation_rows=observation_rows,
            dimension_concept_id_map=DIMENSION_CONCEPT_ID_MAP,
            value_set=value_set,
        )
        assert rows == []

    def test_skips_group_missing_a_dimension(self):
        from eq5d5l_index_calculation_plugin.types import DIMENSION_CONCEPT_ID_MAP
        value_set = scoring.load_value_set("AU")
        incomplete = _full_health_group()[:4]  # drop the 5th dimension's row
        rows = _run(
            flow.calculate_index_rows.fn,
            observation_rows=incomplete,
            dimension_concept_id_map=DIMENSION_CONCEPT_ID_MAP,
            value_set=value_set,
        )
        assert rows == []

    def test_skips_group_with_disagreeing_person_id(self):
        from eq5d5l_index_calculation_plugin.types import DIMENSION_CONCEPT_ID_MAP
        value_set = scoring.load_value_set("AU")
        concept_ids = list(DIMENSION_CONCEPT_ID_MAP.values())
        observation_rows = [
            _observation_row(0, 1, concept_ids[0], "qr-3", "1"),
            _observation_row(1, 2, concept_ids[1], "qr-3", "1"),  # different person_id
            _observation_row(2, 1, concept_ids[2], "qr-3", "1"),
            _observation_row(3, 1, concept_ids[3], "qr-3", "1"),
            _observation_row(4, 1, concept_ids[4], "qr-3", "1"),
        ]
        rows = _run(
            flow.calculate_index_rows.fn,
            observation_rows=observation_rows,
            dimension_concept_id_map=DIMENSION_CONCEPT_ID_MAP,
            value_set=value_set,
        )
        assert rows == []

    def test_ignores_rows_for_unmapped_observation_concept_id(self):
        from eq5d5l_index_calculation_plugin.types import DIMENSION_CONCEPT_ID_MAP
        value_set = scoring.load_value_set("AU")
        rows_in = _full_health_group() + [_observation_row(5, 101, 999, "qr-1", "1")]
        rows = _run(
            flow.calculate_index_rows.fn,
            observation_rows=rows_in,
            dimension_concept_id_map=DIMENSION_CONCEPT_ID_MAP,
            value_set=value_set,
        )
        assert len(rows) == 1


class TestWriteMeasurements:
    def test_noop_when_no_rows_leaves_existing_rows_untouched(self):
        dbdao = MagicMock()
        result = _run(
            flow.write_measurements.fn,
            dbdao=dbdao, schema_name="cdmdefault", measurement_concept_id=42537273, rows=[],
        )
        assert result == ([], [])
        dbdao.select_rows_where_in.assert_not_called()
        dbdao.delete_and_insert_rows.assert_not_called()

    def test_delegates_to_delete_and_insert_rows(self):
        dbdao = MagicMock()
        dbdao.select_rows_where_in.return_value = [
            {"measurement_id": 10, "measurement_source_value": "qr-old-1"},
            {"measurement_id": 11, "measurement_source_value": "qr-old-2"},
        ]
        dbdao.delete_and_insert_rows.return_value = [{"measurement_id": 1}]
        rows = [{"person_id": 101}]
        inserted_rows, previous_measurement_rows = _run(
            flow.write_measurements.fn,
            dbdao=dbdao, schema_name="cdmdefault", measurement_concept_id=42537273, rows=rows,
        )
        assert inserted_rows == [{"measurement_id": 1}]
        assert previous_measurement_rows == [
            {"measurement_id": 10, "measurement_source_value": "qr-old-1"},
            {"measurement_id": 11, "measurement_source_value": "qr-old-2"},
        ]
        dbdao.select_rows_where_in.assert_called_once_with(
            schema="cdmdefault",
            table="measurement",
            columns=["measurement_id", "measurement_source_value"],
            where_column="measurement_concept_id",
            where_values=[42537273],
        )
        dbdao.delete_and_insert_rows.assert_called_once_with(
            schema="cdmdefault",
            table="measurement",
            delete_column="measurement_concept_id",
            delete_value=42537273,
            insert_rows=rows,
            id_column="measurement_id",
        )


class TestWriteFhirKeyMap:
    def test_noop_when_no_rows_and_no_previous_rows(self, monkeypatch):
        dbdao_factory = MagicMock()
        monkeypatch.setattr(flow, "DBDao", dbdao_factory)
        _run(
            flow.write_fhir_key_map.fn,
            dbdao=MagicMock(), database_code="alpdev_pg",
            schema_name="cdmdefault", rows=[], previous_measurement_rows=[],
        )
        dbdao_factory.assert_not_called()

    def test_upserts_when_mapping_table_already_exists(self, monkeypatch):
        dbdao_factory = MagicMock()
        mapping_dao = dbdao_factory.return_value
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()
        monkeypatch.setattr(flow, "DBDao", dbdao_factory)

        dbdao = MagicMock()
        dbdao.select_rows_where_in.return_value = [
            {"measurement_id": 555, "measurement_source_value": "qr-1"}
        ]
        rows = [{"measurement_source_value": "qr-1", "measurement_id": 555}]
        _run(
            flow.write_fhir_key_map.fn,
            dbdao=dbdao, database_code="alpdev_pg", schema_name="cdmdefault",
            rows=rows, previous_measurement_rows=[],
        )

        # Matches the upstream FhirMappingNode's own mapping DAO construction
        # (database_code alone, no cache_id).
        dbdao_factory.assert_called_once_with(
            dialect=SupportedDatabaseDialects.TREX,
            database_code="alpdev_pg",
        )
        mapping_dao.check_schema_exists.assert_called_once_with("alpdev_pg_cdmdefault_fhir_mapping")
        mapping_dao.check_table_exists.assert_called_once_with(
            "alpdev_pg_cdmdefault_fhir_mapping", "fhir_omop_key_map"
        )
        # This plugin never creates the mapping schema/table itself.
        mapping_dao.create_schema.assert_not_called()
        mapping_dao.execute_sql.assert_not_called()
        mapping_dao.batch_insert_values.assert_called_once_with(
            "alpdev_pg_cdmdefault_fhir_mapping",
            "fhir_omop_key_map",
            ["fhir_id", "fhir_resource_type", "omop_table_name", "omop_id"],
            [("qr-1", "QuestionnaireResponse", "measurement", "555")],
            con=ANY,
            on_conflict="ON CONFLICT (fhir_id, fhir_resource_type, omop_table_name, omop_id) DO NOTHING",
        )

    def test_skips_rows_whose_measurement_was_already_replaced_by_another_run(self, monkeypatch):
        # write_measurements() and this task are separate transactions - if a
        # concurrent rerun already deleted/replaced `rows`' measurement_id by the
        # time this task checks, that row must be dropped rather than linked.
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        dbdao = MagicMock()
        dbdao.select_rows_where_in.return_value = []  # neither id exists any more
        rows = [
            {"measurement_source_value": "qr-1", "measurement_id": 555},
            {"measurement_source_value": "qr-2", "measurement_id": 556},
        ]
        _run(
            flow.write_fhir_key_map.fn,
            dbdao=dbdao, database_code="alpdev_pg", schema_name="cdmdefault",
            rows=rows, previous_measurement_rows=[],
        )

        mapping_dao.batch_insert_values.assert_not_called()

    def test_skips_row_whose_id_was_reused_by_a_different_qr_id(self, monkeypatch):
        # The id allocator can reuse a deleted id for an unrelated row from a
        # concurrent run - the id alone existing isn't proof it's still *this*
        # row's measurement, so the source_value must match too.
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        dbdao = MagicMock()
        # id 555 exists, but now belongs to a different qrId than `rows` expects.
        dbdao.select_rows_where_in.return_value = [
            {"measurement_id": 555, "measurement_source_value": "qr-from-another-run"}
        ]
        rows = [{"measurement_source_value": "qr-1", "measurement_id": 555}]
        _run(
            flow.write_fhir_key_map.fn,
            dbdao=dbdao, database_code="alpdev_pg", schema_name="cdmdefault",
            rows=rows, previous_measurement_rows=[],
        )

        mapping_dao.batch_insert_values.assert_not_called()

    def test_deletes_stale_mappings_for_previous_measurement_rows_before_upserting(self, monkeypatch):
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        dbdao = MagicMock()
        dbdao.select_rows_where_in.return_value = [
            {"measurement_id": 555, "measurement_source_value": "qr-1"}
        ]
        rows = [{"measurement_source_value": "qr-1", "measurement_id": 555}]
        previous_measurement_rows = [
            {"measurement_id": 10, "measurement_source_value": "qr-old-1"},
            {"measurement_id": 11, "measurement_source_value": "qr-old-2"},
        ]
        _run(
            flow.write_fhir_key_map.fn,
            dbdao=dbdao, database_code="alpdev_pg", schema_name="cdmdefault",
            rows=rows, previous_measurement_rows=previous_measurement_rows,
        )

        mapping_dao.execute_sql.assert_called_once()
        [delete_sql] = mapping_dao.execute_sql.call_args.args
        assert "DELETE FROM" in delete_sql
        assert "alpdev_pg_cdmdefault_fhir_mapping" in delete_sql
        assert "QuestionnaireResponse" in delete_sql
        assert "measurement" in delete_sql
        # Matched by (omop_id, fhir_id) pair, not omop_id alone - and quoted, since
        # both columns are VARCHAR.
        assert "omop_id = '10' AND fhir_id = 'qr-old-1'" in delete_sql
        assert "omop_id = '11' AND fhir_id = 'qr-old-2'" in delete_sql
        mapping_dao.batch_insert_values.assert_called_once()

    def test_batches_stale_delete_for_large_previous_measurement_sets(self, monkeypatch):
        # One DELETE per _STALE_KEY_MAP_DELETE_BATCH_SIZE pairs, not one statement
        # whose size grows with the whole prior measurement set.
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        batch_size = flow._STALE_KEY_MAP_DELETE_BATCH_SIZE
        previous_measurement_rows = [
            {"measurement_id": i, "measurement_source_value": f"qr-old-{i}"}
            for i in range(batch_size + 1)
        ]
        _run(
            flow.write_fhir_key_map.fn,
            dbdao=MagicMock(), database_code="alpdev_pg",
            schema_name="cdmdefault", rows=[], previous_measurement_rows=previous_measurement_rows,
        )

        assert mapping_dao.execute_sql.call_count == 2
        first_sql = mapping_dao.execute_sql.call_args_list[0].args[0]
        second_sql = mapping_dao.execute_sql.call_args_list[1].args[0]
        assert first_sql.count(" OR ") == batch_size - 1
        assert second_sql.count(" OR ") == 0

    def test_escapes_quotes_in_stale_qr_id(self, monkeypatch):
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        _run(
            flow.write_fhir_key_map.fn,
            dbdao=MagicMock(), database_code="alpdev_pg", schema_name="cdmdefault",
            rows=[], previous_measurement_rows=[
                {"measurement_id": 10, "measurement_source_value": "qr-o'brien"},
            ],
        )

        [delete_sql] = mapping_dao.execute_sql.call_args.args
        assert "fhir_id = 'qr-o''brien'" in delete_sql

    def test_deletes_stale_mappings_even_when_no_current_rows(self, monkeypatch):
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        _run(
            flow.write_fhir_key_map.fn,
            dbdao=MagicMock(), database_code="alpdev_pg", schema_name="cdmdefault",
            rows=[], previous_measurement_rows=[{"measurement_id": 10, "measurement_source_value": "qr-old"}],
        )

        mapping_dao.execute_sql.assert_called_once()
        mapping_dao.batch_insert_values.assert_not_called()

    def test_fails_loudly_when_mapping_schema_missing(self, monkeypatch):
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = False
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        rows = [{"measurement_source_value": "qr-1", "measurement_id": 555}]
        with pytest.raises(ValueError, match="does not exist"):
            _run(
                flow.write_fhir_key_map.fn,
                dbdao=MagicMock(), database_code="alpdev_pg", schema_name="cdmdefault",
                rows=rows, previous_measurement_rows=[],
            )

        mapping_dao.batch_insert_values.assert_not_called()

    def test_fails_loudly_when_mapping_table_missing(self, monkeypatch):
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = False
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        rows = [{"measurement_source_value": "qr-1", "measurement_id": 555}]
        with pytest.raises(ValueError, match="does not exist"):
            _run(
                flow.write_fhir_key_map.fn,
                dbdao=MagicMock(), database_code="alpdev_pg", schema_name="cdmdefault",
                rows=rows, previous_measurement_rows=[],
            )

        mapping_dao.batch_insert_values.assert_not_called()

    def test_fails_loudly_when_key_map_index_is_outdated(self, monkeypatch):
        # A table created by an older FhirMappingNode can still carry its former
        # 2-column (fhir_id, fhir_resource_type) unique index.
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = [{
            "name": "fhir_omop_key_map_fhir_id_fhir_resource_type_idx",
            "unique": True,
            "column_names": ["fhir_id", "fhir_resource_type"],
            "definition": (
                "CREATE UNIQUE INDEX fhir_omop_key_map_fhir_id_fhir_resource_type_idx ON "
                "fhir_omop_key_map (fhir_id, fhir_resource_type)"
            ),
        }]
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        rows = [{"measurement_source_value": "qr-1", "measurement_id": 555}]
        with pytest.raises(ValueError, match="unique index"):
            _run(
                flow.write_fhir_key_map.fn,
                dbdao=MagicMock(), database_code="alpdev_pg", schema_name="cdmdefault",
                rows=rows, previous_measurement_rows=[],
            )

        mapping_dao.batch_insert_values.assert_not_called()

    def test_fails_loudly_when_key_map_index_has_extra_columns(self, monkeypatch):
        # A unique index covering the 4 required columns *plus* an extra one (e.g.
        # transformed_at) mentions all 4 required names in its SQL text, but can't
        # satisfy an ON CONFLICT target scoped to exactly those 4 columns - the
        # comparison must be an exact set match, not "does the text contain each
        # name" (which this index would incorrectly pass).
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = [{
            "name": "fhir_omop_key_map_wide_idx",
            "unique": True,
            "column_names": ["fhir_id", "fhir_resource_type", "omop_table_name", "omop_id", "transformed_at"],
            "definition": (
                "CREATE UNIQUE INDEX fhir_omop_key_map_wide_idx ON fhir_omop_key_map "
                "(fhir_id, fhir_resource_type, omop_table_name, omop_id, transformed_at)"
            ),
        }]
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=mapping_dao))

        rows = [{"measurement_source_value": "qr-1", "measurement_id": 555}]
        with pytest.raises(ValueError, match="unique index"):
            _run(
                flow.write_fhir_key_map.fn,
                dbdao=MagicMock(), database_code="alpdev_pg", schema_name="cdmdefault",
                rows=rows, previous_measurement_rows=[],
            )

        mapping_dao.batch_insert_values.assert_not_called()


class TestWriteAlgorithmMetadata:
    def test_overwrites_existing_row_and_inserts_the_new_one(self):
        dbdao = MagicMock()
        dbdao.delete_and_insert_rows.return_value = [{"metadata_id": 7}]
        value_set = {
            "method": "stata_simulation",
            "source": "Parsed at load time from bundled STATA syntax (Australia.txt): some citation",
        }

        _run(
            flow.write_algorithm_metadata.fn,
            dbdao=dbdao, schema_name="cdmdefault", country_code="au", value_set=value_set,
        )

        assert dbdao.delete_and_insert_rows.call_count == 1
        _, kwargs = dbdao.delete_and_insert_rows.call_args
        assert kwargs["schema"] == "cdmdefault"
        assert kwargs["table"] == "metadata"
        # Overwrite-on-rerun: scoped to delete only this plugin's own metadata row,
        # by name, before inserting the freshly computed one - same shape as
        # write_measurements()'s delete_column/delete_value scoping by concept id.
        assert kwargs["delete_column"] == "name"
        assert kwargs["delete_value"] == "EQ-5D-5L Index Calculation Algorithm"
        assert kwargs["id_column"] == "metadata_id"
        [row] = kwargs["insert_rows"]
        assert "metadata_id" not in row  # assigned by delete_and_insert_rows itself
        assert row["metadata_concept_id"] == 0
        assert row["metadata_type_concept_id"] == 0
        assert row["name"] == "EQ-5D-5L Index Calculation Algorithm"
        assert row["value_as_number"] is None
        assert "country_code=AU" in row["value_as_string"]
        assert "method=stata_simulation" in row["value_as_string"]
        assert len(row["value_as_string"]) <= 250

    def test_truncates_long_source_to_fit_column(self):
        dbdao = MagicMock()
        value_set = {"method": "stata_simulation", "source": "x" * 500}

        _run(
            flow.write_algorithm_metadata.fn,
            dbdao=dbdao, schema_name="cdmdefault", country_code="AU", value_set=value_set,
        )

        [row] = dbdao.delete_and_insert_rows.call_args.kwargs["insert_rows"]
        assert len(row["value_as_string"]) == 250


class TestCalculateEq5d5lIndexEndToEnd:
    def _config(self, **overrides):
        defaults = dict(
            schema_name="cdmdefault",
            database_code="alpdev_pg",
            # A real cache/snapshot dataset's id is a sanitized UUID, unrelated in
            # value to database_code (see README's "Parameters" section) - default
            # to one here so tests don't imply the two are normally the same string.
            omop_dataset_id="3f2504e0_4f89_11d3_9a0c_0305e82c3301",
            country_code="AU",
        )
        defaults.update(overrides)
        return Eq5d5lCalculateConfig(**defaults)

    def _patch_daos(self, monkeypatch, observation_rows):
        main_dao = MagicMock()
        main_dao.dialect = SupportedDatabaseDialects.POSTGRES
        state = {"measurement_rows": []}

        def _select_rows_where_in(table, where_column=None, where_values=None, **_):
            if table == "observation":
                return observation_rows
            if table == "measurement" and where_column == "measurement_id":
                # write_fhir_key_map()'s post-write existence re-check: assume no
                # concurrent rerun, so whatever write_measurements() last inserted
                # (by id and source_value together) is still there.
                current = {row["measurement_id"]: row for row in state["measurement_rows"]}
                return [
                    {
                        "measurement_id": measurement_id,
                        "measurement_source_value": current[measurement_id]["measurement_source_value"],
                    }
                    for measurement_id in where_values
                    if measurement_id in current
                ]
            return []  # write_measurements()'s previous-rows read: nothing pre-exists yet

        main_dao.select_rows_where_in.side_effect = _select_rows_where_in

        def _delete_and_insert_rows(insert_rows, id_column, table, **_):
            result = [{**row, id_column: i + 1} for i, row in enumerate(insert_rows)]
            if table == "measurement":
                state["measurement_rows"] = result
            return result

        main_dao.delete_and_insert_rows.side_effect = _delete_and_insert_rows
        mapping_dao = MagicMock()
        mapping_dao.check_schema_exists.return_value = True
        mapping_dao.check_table_exists.return_value = True
        mapping_dao.get_indexes_for_table.return_value = _current_key_map_indexes()

        def _dao_factory(*args, **kwargs):
            # No dialect kwarg: calculate_eq5d5l_index()'s direct-Postgres dbdao
            # (observation/measurement). dialect=TREX explicitly requested: the
            # FHIR mapping dao.
            if kwargs.get("dialect") is None:
                return main_dao
            return mapping_dao

        monkeypatch.setattr(flow, "DBDao", _dao_factory)
        return main_dao, mapping_dao

    @staticmethod
    def _delete_and_insert_calls_for(main_dao, table):
        return [c for c in main_dao.delete_and_insert_rows.call_args_list if c.kwargs["table"] == table]

    def test_writes_measurement_key_map_and_metadata_rows(self, monkeypatch):
        main_dao, mapping_dao = self._patch_daos(monkeypatch, _full_health_group())

        rows = _run(flow.calculate_eq5d5l_index, self._config())

        assert len(rows) == 1
        assert rows[0]["value_as_number"] == 1.0
        assert main_dao.delete_and_insert_rows.call_count == 2
        mapping_dao.batch_insert_values.assert_called_once()
        [metadata_call] = self._delete_and_insert_calls_for(main_dao, "metadata")
        assert metadata_call.kwargs["delete_column"] == "name"
        assert metadata_call.kwargs["delete_value"] == "EQ-5D-5L Index Calculation Algorithm"
        [metadata_row] = metadata_call.kwargs["insert_rows"]
        assert "country_code=AU" in metadata_row["value_as_string"]

    def test_dry_run_skips_all_writes(self, monkeypatch):
        main_dao, mapping_dao = self._patch_daos(monkeypatch, _full_health_group())

        rows = _run(flow.calculate_eq5d5l_index, self._config(dry_run=True))

        assert len(rows) == 1
        main_dao.delete_and_insert_rows.assert_not_called()
        mapping_dao.batch_insert_values.assert_not_called()

    def test_no_valid_groups_skips_measurement_and_metadata_writes(self, monkeypatch):
        # Drop one dimension row so the single group is incomplete and skipped.
        main_dao, mapping_dao = self._patch_daos(monkeypatch, _full_health_group()[:4])

        rows = _run(flow.calculate_eq5d5l_index, self._config())

        assert rows == []
        main_dao.delete_and_insert_rows.assert_not_called()
        mapping_dao.batch_insert_values.assert_not_called()

    def test_raises_when_fhir_mapping_table_missing(self, monkeypatch):
        main_dao, mapping_dao = self._patch_daos(monkeypatch, _full_health_group())
        mapping_dao.check_schema_exists.return_value = False

        with pytest.raises(ValueError, match="does not exist"):
            _run(flow.calculate_eq5d5l_index, self._config())

        # The mapping table prerequisite is checked before write_measurements()'s
        # destructive delete-and-replace, so a missing prerequisite must leave the
        # existing measurement/metadata rows untouched rather than replacing them
        # with nothing to link lineage/metadata to.
        main_dao.delete_and_insert_rows.assert_not_called()

    def test_dbdao_connects_directly_while_mapping_dao_routes_through_trex(self, monkeypatch):
        # dbdao (observation/measurement) connects directly via database_code, no
        # dialect/cache_id override - confirmed against a real local deployment
        # that the Trex catalog keyed by omop_dataset_id is a disconnected
        # snapshot (a standalone DuckDB file), not a live view of the tenant's
        # Postgres: it returned zero rows for observations that exist right now
        # in the live table. mapping_dao (FHIR lineage) still routes through
        # TrexDao, keyed by database_code alone - matches the upstream
        # FhirMappingNode in dataflow_ui_plugin/nodes.py.
        self._patch_daos(monkeypatch, _full_health_group())
        dbdao_factory_spy = MagicMock(side_effect=flow.DBDao)
        monkeypatch.setattr(flow, "DBDao", dbdao_factory_spy)

        _run(flow.calculate_eq5d5l_index, self._config())

        direct_calls = [c for c in dbdao_factory_spy.call_args_list if c.kwargs.get("dialect") is None]
        trex_calls = [c for c in dbdao_factory_spy.call_args_list if c.kwargs.get("dialect") is not None]
        assert len(direct_calls) == 1
        assert direct_calls[0].kwargs == {"database_code": "alpdev_pg"}
        # Two TREX calls: calculate_eq5d5l_index()'s own prerequisite-check
        # mapping_dao, plus write_fhir_key_map()'s own mapping_dao construction.
        assert len(trex_calls) == 2
        assert all("cache_id" not in c.kwargs for c in trex_calls)

    def test_omop_dataset_id_differing_from_database_code_does_not_raise(self, monkeypatch):
        # omop_dataset_id (the dataset's own id, e.g. a snapshot UUID) is expected
        # to differ from database_code (the tenant credentials key) in the normal
        # case - it isn't used for connection routing here (see README), so a
        # mismatch must be a no-op, not a validation error.
        main_dao, mapping_dao = self._patch_daos(monkeypatch, _full_health_group())

        rows = _run(flow.calculate_eq5d5l_index, self._config(omop_dataset_id="a_different_dataset_id"))

        assert len(rows) == 1
        mapping_dao.batch_insert_values.assert_called_once()

    def test_raises_for_unsupported_dialect(self, monkeypatch):
        # dbdao's own dialect is checked directly - it's a plain
        # DBDao(database_code=...) connection (IbisDao/SqlAlchemyDao) now, not a
        # TrexDao whose .dialect always reports 'trex' regardless of the
        # underlying source.
        non_supported_dbdao = MagicMock()
        non_supported_dbdao.dialect = "hana"
        dbdao_factory = MagicMock(return_value=non_supported_dbdao)
        monkeypatch.setattr(flow, "DBDao", dbdao_factory)

        with pytest.raises(NotImplementedError, match="hana"):
            _run(flow.calculate_eq5d5l_index, self._config())

        dbdao_factory.assert_called_once_with(database_code="alpdev_pg")

    def test_accepts_bigquery_dialect(self, monkeypatch):
        # BigQuery is supported alongside Postgres - dbdao resolves to a plain
        # SqlAlchemyDao there (see DBDao's dialect registry), with an accepted
        # concurrency race for id_column allocation instead of Postgres/HANA's
        # table lock (see SqlAlchemyDao._lock_table_for_id_allocation).
        main_dao, mapping_dao = self._patch_daos(monkeypatch, _full_health_group())
        main_dao.dialect = SupportedDatabaseDialects.BIGQUERY

        rows = _run(flow.calculate_eq5d5l_index, self._config())

        assert len(rows) == 1

    def test_raises_when_dbdao_missing_required_methods(self, monkeypatch):
        # Defensive check: IbisDao inherits select_rows_where_in()/
        # delete_and_insert_rows() from SqlAlchemyDao today, but if a future
        # refactor of the shared DAO layer dropped one, this must fail fast and
        # clearly rather than with a bare AttributeError deep inside
        # read_eq5d5l_observations().
        incomplete_dbdao = MagicMock(spec=["dialect"])
        incomplete_dbdao.dialect = SupportedDatabaseDialects.POSTGRES
        monkeypatch.setattr(flow, "DBDao", MagicMock(return_value=incomplete_dbdao))

        with pytest.raises(NotImplementedError, match="select_rows_where_in"):
            _run(flow.calculate_eq5d5l_index, self._config())

    def test_rerun_with_different_country_overwrites_both_measurement_and_metadata(self, monkeypatch):
        # Same dataset (schema_name/database_code), re-run with a different
        # country_code - both write_measurements() and write_algorithm_metadata()
        # must target the *same* delete scope on each run (measurement_concept_id /
        # metadata row name), not one keyed by country, so the second run's DELETE
        # actually clears the first run's rows instead of leaving them behind
        # alongside the new ones.
        main_dao, mapping_dao = self._patch_daos(monkeypatch, _full_health_group())

        _run(flow.calculate_eq5d5l_index, self._config(country_code="AU"))
        _run(flow.calculate_eq5d5l_index, self._config(country_code="CA"))

        measurement_calls = self._delete_and_insert_calls_for(main_dao, "measurement")
        metadata_calls = self._delete_and_insert_calls_for(main_dao, "metadata")
        assert len(measurement_calls) == 2
        assert len(metadata_calls) == 2

        # Both runs delete-scope on the same measurement_concept_id...
        assert measurement_calls[0].kwargs["delete_value"] == measurement_calls[1].kwargs["delete_value"]
        # ...and the same metadata row name...
        assert metadata_calls[0].kwargs["delete_value"] == metadata_calls[1].kwargs["delete_value"]
        assert metadata_calls[0].kwargs["delete_value"] == "EQ-5D-5L Index Calculation Algorithm"
        # ...while the metadata content itself reflects each run's own country.
        [au_row] = metadata_calls[0].kwargs["insert_rows"]
        [ca_row] = metadata_calls[1].kwargs["insert_rows"]
        assert "country_code=AU" in au_row["value_as_string"]
        assert "country_code=CA" in ca_row["value_as_string"]
