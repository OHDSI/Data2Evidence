"""Unit tests for the stage timing log lines."""

import logging
import re
import sys

import pytest

from create_cachedb_file_plugin.stage_timing import (
    StageName,
    StageSummary,
    format_stage_line,
    stage,
)


class ListLogger:
    def __init__(self):
        self.lines = []

    def info(self, message):
        self.lines.append(message)


LINE = re.compile(
    r"^stage=(?P<name>\S+)(?P<fields>( \S+=\S+)*?) seconds=(?P<seconds>\d+\.\d{3})"
    r"( rows=(?P<rows>\d+))? status=(?P<status>ok|failed|fallback)( reason=(?P<reason>\S+))?$"
)


def test_a_finished_block_logs_one_ok_line():
    logger = ListLogger()
    with stage(logger, StageName.COPY_CHUNKS, rows=1500, table="measurement", chunks=3):
        pass
    assert len(logger.lines) == 1
    match = LINE.match(logger.lines[0])
    assert match, logger.lines[0]
    assert match["name"] == "copy_chunks"
    assert match["fields"] == " table=measurement chunks=3"
    assert match["rows"] == "1500"
    assert match["status"] == "ok"
    assert match["reason"] is None


def test_values_set_inside_the_block_are_reported():
    logger = ListLogger()
    with stage(logger, StageName.PLAN_ATTEMPT, table="cost", attempt=1) as item:
        item.rows = 42
        item.fields["outcome"] = "skewed"
        item.status = "fallback"
        item.reason = "skew"
    match = LINE.match(logger.lines[0])
    assert match["fields"] == " table=cost attempt=1 outcome=skewed"
    assert match["rows"] == "42"
    assert match["status"] == "fallback"
    assert match["reason"] == "skew"


def test_an_exception_is_logged_as_failed_and_re_raised_unchanged():
    logger = ListLogger()
    error = ValueError("boom")
    with pytest.raises(ValueError) as raised:
        with stage(logger, StageName.SCHEMA_SETUP, schema="cdm"):
            raise error
    assert raised.value is error
    match = LINE.match(logger.lines[0])
    assert match["status"] == "failed"
    assert match["reason"] == "ValueError"


def test_a_base_exception_passes_through_without_a_line():
    logger = ListLogger()
    with pytest.raises(KeyboardInterrupt):
        with stage(logger, StageName.COPY_CHUNKS, table="t"):
            raise KeyboardInterrupt
    assert logger.lines == []


def test_the_failure_reason_never_carries_the_exception_message():
    logger = ListLogger()
    with pytest.raises(RuntimeError):
        with stage(logger, StageName.COPY_SINGLE, table="person"):
            raise RuntimeError("INSERT INTO t SELECT * FROM s WHERE person_id IN (1, 2, 3)")
    assert "INSERT" not in logger.lines[0]
    assert "person_id" not in logger.lines[0]


def test_unsafe_field_values_cannot_break_the_line():
    logger = ListLogger()
    with stage(logger, StageName.INDEX, table="t", index="idx name; DROP"):
        pass
    assert LINE.match(logger.lines[0]), logger.lines[0]
    assert "index=idx_name__DROP" in logger.lines[0]


def test_none_fields_are_left_out():
    logger = ListLogger()
    with stage(logger, StageName.COUNT_EXACT, table="t", column=None):
        pass
    assert "column=" not in logger.lines[0]


def test_no_logger_means_no_line_and_no_error():
    with stage(None, StageName.COPY_SINGLE, table="t"):
        pass


def test_a_standard_logger_is_accepted(caplog):
    with caplog.at_level(logging.INFO):
        with stage(logging.getLogger(__name__), StageName.FTS, table="concept"):
            pass
    assert caplog.records[0].getMessage().startswith("stage=fts table=concept ")


def test_the_summary_lists_the_slowest_tables_first_and_cuts_at_ten():
    summary = StageSummary("cdm")
    for i in range(12):
        summary.add(f"t{i}", float(i), 10)
    summary.add("no_rows", 0.5, None)
    line = summary.line()
    assert line.startswith("stage_summary schema=cdm tables=13 rows=120 seconds=66.500 ")
    assert line.endswith("top=t11:11.0,t10:10.0,t9:9.0,t8:8.0,t7:7.0,t6:6.0,t5:5.0,t4:4.0,t3:3.0,t2:2.0")


def test_the_number_of_slowest_tables_can_be_chosen():
    summary = StageSummary("cdm")
    for i in range(4):
        summary.add(f"t{i}", float(i), None)
    assert summary.line(top=2).endswith("top=t3:3.0,t2:2.0")

def test_a_named_summary_says_which_stage_it_covers_and_omits_unknown_rows():
    logger = ListLogger()
    summary = StageSummary("cdm", StageName.FTS)
    for table in ("concept", "concept_synonym"):
        with stage(logger, StageName.FTS, summary=summary, schema="cdm", table=table):
            pass
    line = summary.line()
    assert line.startswith("stage_summary stage=fts schema=cdm tables=2 seconds=")
    assert "rows=" not in line
    assert "top=concept" in line


def test_the_table_summary_line_is_unchanged_without_a_stage_name():
    summary = StageSummary("cdm")
    summary.add("person", 1.5, 10)
    assert summary.line() == "stage_summary schema=cdm tables=1 rows=10 seconds=1.500 top=person:1.5"


def test_a_stage_with_a_summary_adds_its_table():
    logger = ListLogger()
    summary = StageSummary("cdm")
    with stage(logger, StageName.TABLE_TOTAL, summary=summary, table="person") as item:
        item.rows = 7
    assert summary.tables[0][0] == "person"
    assert summary.tables[0][2] == 7


def test_format_is_stable_for_a_known_stage():
    from create_cachedb_file_plugin.stage_timing import Stage

    item = Stage(StageName.RECONCILE_SOURCE, {"table": "drug_era"}, rows=5)
    item.seconds = 1.23456
    assert format_stage_line(item) == (
        "stage=reconcile_source table=drug_era seconds=1.235 rows=5 status=ok"
    )



def test_continue_break_and_return_inside_a_stage_log_ok_and_keep_control_flow():
    logger = ListLogger()
    seen = []
    for i in range(3):
        with stage(logger, StageName.TABLE_TOTAL, table=f"t{i}"):
            if i == 0:
                continue
            seen.append(i)
            if i == 1:
                break
    assert seen == [1]

    def planned():
        with stage(logger, StageName.PLAN_ATTEMPT, table="t"):
            return "plan"

    assert planned() == "plan"
    assert [LINE.match(line)["status"] for line in logger.lines] == ["ok", "ok", "ok"]


def test_the_original_traceback_is_kept():
    def fail():
        raise ValueError("boom")

    with pytest.raises(ValueError) as raised:
        with stage(ListLogger(), StageName.COPY_SINGLE, table="t"):
            fail()
    assert raised.traceback[-1].name == "fail"


class BrokenLogger:
    def info(self, message):
        raise OSError("log sink down")


def test_a_failing_logger_changes_neither_the_result_nor_the_exception():
    with stage(BrokenLogger(), StageName.COPY_SINGLE, table="t", rows="not a number"):
        result = 5
    assert result == 5

    error = KeyError("original")
    with pytest.raises(KeyError) as raised:
        with stage(BrokenLogger(), StageName.COPY_SINGLE, table="t"):
            raise error
    assert raised.value is error



def test_stage_names_are_the_lowercase_log_names():
    assert [name.value for name in StageName] == [
        "flow_total", "slot_reconcile", "schema_setup", "schema_total", "table_total",
        "plan_attempt", "count_estimate", "count_exact", "count_nulls", "boundaries",
        "copy_single", "copy_chunks", "reconcile_source", "reconcile_target", "index", "fts",
    ]


def test_stage_timing_does_not_drag_in_prefect():
    import create_cachedb_file_plugin.stage_timing  # noqa: F401

    assert "prefect" not in sys.modules
