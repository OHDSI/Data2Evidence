import re

import pytest

from create_cachedb_file_plugin.stage_timing import (
    StageName,
    StageSummary,
    stage,
)


class ListLogger:
    def __init__(self):
        self.lines = []

    def info(self, message):
        self.lines.append(message)


LINE = re.compile(
    r"^stage=(?P<name>\S+)(?P<fields>( [^\s=]+=\S+)*?) seconds=(?P<seconds>\d+\.\d{3})"
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


def test_the_failure_reason_never_carries_the_exception_message():
    logger = ListLogger()
    with pytest.raises(RuntimeError):
        with stage(logger, StageName.COPY_SINGLE, table="person"):
            raise RuntimeError("INSERT INTO t SELECT * FROM s WHERE person_id IN (1, 2, 3)")
    assert "INSERT" not in logger.lines[0]
    assert "person_id" not in logger.lines[0]


def test_the_summary_lists_the_slowest_tables_first_and_cuts_at_ten():
    summary = StageSummary("cdm")
    for i in range(12):
        summary.add(f"t{i}", float(i), 10)
    summary.add("no_rows", 0.5, None)
    line = summary.line()
    assert line.startswith("stage_summary schema=cdm tables=13 rows=120 seconds=66.500 ")
    assert line.endswith("top=t11:11.0,t10:10.0,t9:9.0,t8:8.0,t7:7.0,t6:6.0,t5:5.0,t4:4.0,t3:3.0,t2:2.0")


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


def test_a_stage_with_a_summary_adds_its_table():
    logger = ListLogger()
    summary = StageSummary("cdm")
    with stage(logger, StageName.TABLE_TOTAL, summary=summary, table="person") as item:
        item.rows = 7
    assert summary.tables[0][0] == "person"
    assert summary.tables[0][2] == 7


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
