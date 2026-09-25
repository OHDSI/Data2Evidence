from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
import sqlalchemy as sql
from sqlalchemy import text
from sqlalchemy.pool import StaticPool

from data_management_plugin import sql_migration as sm

ALL_DIALECT_MODELS = [
    (dialect, model)
    for dialect, models in sm.DATAMODEL_CHANGESET_DIRS.items()
    for model in models
]


# --- _parse_changeset / _parse_changeset_header ---

def test_parse_changeset_strips_liquibase_comment_lines():
    raw = (
        "--liquibase formatted sql\n"
        "--changeset alp:V1.0.0.0.0__create_tables\n"
        "\n"
        "CREATE TABLE foo(id integer);\n"
        "\n"
        "--rollback DROP TABLE foo;\n"
    )
    split_statements, body = sm._parse_changeset(raw)
    assert split_statements is True
    assert "liquibase" not in body.lower()
    assert "rollback" not in body.lower()
    assert "CREATE TABLE foo(id integer);" in body


def test_parse_changeset_detects_split_statements_false():
    raw = (
        "--liquibase formatted sql\n"
        "--changeset alp:V1.0.0.0.2__create_sp splitStatements:false\n"
        "\n"
        "CREATE OR REPLACE PROCEDURE foo() AS $$ BEGIN SELECT 1; SELECT 2; END; $$;\n"
    )
    split_statements, body = sm._parse_changeset(raw)
    assert split_statements is False
    assert "BEGIN SELECT 1; SELECT 2; END;" in body


def test_parse_changeset_rejects_multiple_changeset_sections():
    raw = (
        "--liquibase formatted sql\n"
        "--changeset alp:first\nCREATE TABLE a(id integer);\n"
        "--changeset alp:second\nCREATE TABLE b(id integer);\n"
    )
    with pytest.raises(ValueError, match="2 '--changeset' sections"):
        sm._parse_changeset(raw)


def test_parse_changeset_header_returns_author_and_id():
    raw = "--liquibase formatted sql\n--changeset alp:V1.0.0.0.0__create_x labels:frankfurt\n\nSELECT 1;"
    assert sm._parse_changeset_header(raw) == ("alp", "V1.0.0.0.0__create_x")


def test_parse_changeset_header_requires_header():
    with pytest.raises(ValueError, match="Missing"):
        sm._parse_changeset_header("--liquibase formatted sql\nSELECT 1;")


# --- _split_sql_statements ---

def test_split_sql_statements_drops_blank_and_comment_only_fragments():
    body = (
        "CREATE TABLE foo(id integer);\n"
        "\n"
        "-- just a comment, no statement here\n"
        "\n"
        "CREATE INDEX idx_foo ON foo(id);"
    )
    statements = sm._split_sql_statements(body)
    assert statements == ["CREATE TABLE foo(id integer)", "CREATE INDEX idx_foo ON foo(id)"]


def test_split_sql_statements_empty_body_returns_empty_list():
    assert sm._split_sql_statements("") == []


def test_split_sql_statements_ignores_semicolons_inside_block_comments():
    # e.g. omop5-4/V1.0.0.0.4__apply_v5.4.sql keeps old, superseded DDL wrapped
    # in a /* ... */ block, with semicolons inside it
    body = (
        "CREATE TABLE foo(id integer);\n"
        "/*\n"
        'DROP TABLE IF EXISTS "OLD_TABLE";\n'
        "\n"
        'CREATE TABLE "ANOTHER_OLD_TABLE" (id integer);\n'
        "*/\n"
        "CREATE INDEX idx_foo ON foo(id);"
    )
    statements = sm._split_sql_statements(body)
    assert statements == ["CREATE TABLE foo(id integer)", "CREATE INDEX idx_foo ON foo(id)"]


def test_split_sql_statements_ignores_semicolon_in_trailing_line_comment():
    body = "CREATE TABLE foo (\n  id integer, -- the id; primary\n  name text\n);\nSELECT 1;"
    statements = sm._split_sql_statements(body)
    assert len(statements) == 2
    assert "primary" not in statements[0]
    assert "name text" in statements[0]


def test_split_sql_statements_keeps_semicolon_and_dashes_inside_string_literals():
    body = "INSERT INTO t VALUES ('a;b', 'x -- y', 'it''s; ok');\nSELECT 1;"
    statements = sm._split_sql_statements(body)
    assert statements == ["INSERT INTO t VALUES ('a;b', 'x -- y', 'it''s; ok')", "SELECT 1"]


def test_split_sql_statements_keeps_semicolon_inside_quoted_identifier():
    statements = sm._split_sql_statements('CREATE TABLE "we;ird" (id integer);')
    assert statements == ['CREATE TABLE "we;ird" (id integer)']


# --- bind-parameter escaping ---

def test_escape_bind_params_escapes_sqlscript_variables():
    stmt = "SELECT COUNT(*) INTO N FROM :TEMP_QUESTION_OUTPUT WHERE ID = :Questionnaire_ID"
    clause = sm._to_text(stmt)
    assert clause.compile().params == {}
    assert str(clause.compile()) == stmt


def test_escape_bind_params_leaves_casts_and_time_literals_alone():
    stmt = "SELECT x::integer, '12:30', \"VIEW::OMOP.CONCEPT\" FROM t"
    assert sm._escape_bind_params(stmt) == stmt


# --- _set_current_schema_statement ---

def test_set_current_schema_statement_postgres_is_local_and_lowercases():
    assert sm._set_current_schema_statement("postgres", "MySchema") == 'SET LOCAL search_path TO "myschema"'


def test_set_current_schema_statement_hana_uppercases():
    assert sm._set_current_schema_statement("hana", "MySchema") == 'SET SCHEMA "MYSCHEMA"'


@pytest.mark.parametrize("dialect", ["postgres", "hana"])
def test_set_current_schema_statement_escapes_embedded_quotes(dialect):
    statement = sm._set_current_schema_statement(dialect, 'a"; DROP SCHEMA x; --')
    assert '""' in statement
    assert statement.endswith('"')


# --- list_changeset_files (reads real on-disk changesets) ---

@pytest.mark.parametrize("dialect", ["postgres", "hana"])
def test_list_changeset_files_medical_imaging(dialect):
    files = sm.list_changeset_files(dialect, "medical-imaging")

    assert [f.path.name for f in files] == [
        "V1.0.0.0.0__create_medical_imaging_tables.sql",
        "V1.0.0.0.1__create_eav_table.sql",
    ]
    assert files[0].relative_path == (
        f"db/migrations/{dialect}/changesets/medical-imaging/V1.0.0.0.0__create_medical_imaging_tables.sql"
    )
    assert all(f.path.exists() for f in files)


def test_list_changeset_files_rejects_unsupported_data_model():
    with pytest.raises(ValueError, match="'custom-omop-ms' is not supported for dialect 'postgres'"):
        sm.list_changeset_files("postgres", "custom-omop-ms")


def test_list_changeset_files_rejects_unsupported_dialect():
    with pytest.raises(ValueError, match="dialect 'snowflake'"):
        sm.list_changeset_files("snowflake", "medical-imaging")


@pytest.mark.parametrize("dialect,filename", [
    ("postgres", "V1.0.0.0.4__apply_v5.4.sql"),
    ("hana", "V5.4.1.1.1__apply_v5.4.sql"),
])
def test_list_changeset_files_includes_label_and_context_tagged_changesets(dialect, filename):
    # These changesets carry a `labels:`/`contexts:` modifier on their
    # --changeset line. Verified against the real Liquibase CLI: without
    # --labels/--contexts passed (this plugin never passes either), Liquibase
    # applies them anyway, so the runner must include them too.
    files = sm.list_changeset_files(dialect, "omop5-4")
    assert filename in [f.path.name for f in files]


def test_list_changeset_files_omop5_4_postgres_includes_gdm_hana_does_not():
    postgres_dirs = {f.relative_path.split("/")[4] for f in sm.list_changeset_files("postgres", "omop5-4")}
    hana_dirs = {f.relative_path.split("/")[4] for f in sm.list_changeset_files("hana", "omop5-4")}
    assert "gdm" in postgres_dirs
    assert "gdm" not in hana_dirs


@pytest.mark.parametrize("dialect", ["postgres", "hana"])
def test_list_changeset_files_waveform_is_omop5_4_plus_waveform_dir(dialect):
    omop54_files = sm.list_changeset_files(dialect, "omop5-4")
    waveform_files = sm.list_changeset_files(dialect, "waveform")

    assert [f.relative_path for f in waveform_files[:len(omop54_files)]] == [
        f.relative_path for f in omop54_files
    ]
    trailing_dirs = {f.relative_path.split("/")[4] for f in waveform_files[len(omop54_files):]}
    assert trailing_dirs == {"waveform"}


# --- lint every on-disk changeset the runner can execute ---

@pytest.mark.parametrize("dialect,data_model", ALL_DIALECT_MODELS)
def test_all_changesets_are_executable_by_the_runner(dialect, data_model):
    """Guards future changesets against what the runner can't handle: a missing
    or repeated --changeset header, `:name` that would be read as a bind
    parameter, a `$$` body in a file that gets split on `;`, and any `${...}`
    placeholder other than ${VOCAB_SCHEMA}."""
    for changeset in sm.list_changeset_files(dialect, data_model):
        name = changeset.relative_path
        raw = changeset.path.read_text()
        split_statements, body = sm._parse_changeset(raw)
        sm._parse_changeset_header(raw)

        assert "${" not in body.replace(sm.VOCAB_SCHEMA_PLACEHOLDER, ""), f"{name}: unknown placeholder"
        if split_statements:
            assert "$$" not in body, f"{name}: has a $$ body but is split on ';' (add splitStatements:false)"
            statements = sm._split_sql_statements(body)
        else:
            statements = [body]
        for statement in statements:
            clause = sm._to_text(statement)
            assert str(clause.compile()) == statement, f"{name}: bind-parameter escaping does not round-trip"


# --- apply_changeset ---

def _make_dbdao_mock():
    dbdao = MagicMock()
    connection = MagicMock()
    trans = MagicMock()
    connection.begin.return_value = trans
    dbdao.engine.connect.return_value.__enter__.return_value = connection
    return dbdao, connection, trans


def _changeset(raw, relative_path="db/migrations/postgres/changesets/medical-imaging/V1__create_foo.sql"):
    return sm.ChangesetFile(path=MagicMock(read_text=lambda: raw), relative_path=relative_path)


SIMPLE_CHANGESET = "--liquibase formatted sql\n--changeset alp:V1\n\nCREATE TABLE foo(id integer);"


@patch("data_management_plugin.sql_migration._record_changeset")
def test_apply_changeset_sets_schema_runs_statements_and_records_in_same_transaction(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()
    changeset = _changeset(SIMPLE_CHANGESET)

    sm.apply_changeset(dbdao, "my_schema", "postgres", changeset, "my_vocab_schema", MagicMock())

    executed_sql = [c.args[0].text for c in connection.execute.call_args_list]
    assert executed_sql == ['SET LOCAL search_path TO "my_schema"', "CREATE TABLE foo(id integer)"]
    record_mock.assert_called_once_with(connection, "my_schema", changeset, "alp", "V1")
    trans.commit.assert_called_once()
    trans.rollback.assert_not_called()


@patch("data_management_plugin.sql_migration._record_changeset")
def test_apply_changeset_rolls_back_and_reraises_on_statement_failure(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()
    connection.execute.side_effect = [None, Exception("boom")]

    with pytest.raises(Exception, match="boom"):
        sm.apply_changeset(dbdao, "my_schema", "postgres", _changeset(SIMPLE_CHANGESET),
                           "my_vocab_schema", MagicMock())

    trans.rollback.assert_called_once()
    trans.commit.assert_not_called()
    record_mock.assert_not_called()


@patch("data_management_plugin.sql_migration._record_changeset", side_effect=Exception("record failed"))
def test_apply_changeset_rolls_back_when_recording_fails(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()

    with pytest.raises(Exception, match="record failed"):
        sm.apply_changeset(dbdao, "my_schema", "postgres", _changeset(SIMPLE_CHANGESET),
                           "my_vocab_schema", MagicMock())

    trans.rollback.assert_called_once()
    trans.commit.assert_not_called()


@patch("data_management_plugin.sql_migration._record_changeset")
def test_apply_changeset_executes_split_statements_false_body_as_one_statement(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()
    raw = (
        "--liquibase formatted sql\n"
        "--changeset alp:V1 splitStatements:false\n\n"
        "CREATE OR REPLACE PROCEDURE foo() AS $$ BEGIN SELECT 1; SELECT 2; END; $$;"
    )

    sm.apply_changeset(dbdao, "my_schema", "postgres", _changeset(raw), "my_vocab_schema", MagicMock())

    executed_sql = [c.args[0].text for c in connection.execute.call_args_list]
    # one SET statement + exactly one statement for the whole procedure body
    assert len(executed_sql) == 2
    assert "BEGIN SELECT 1; SELECT 2; END;" in executed_sql[1]


@patch("data_management_plugin.sql_migration._record_changeset")
def test_apply_changeset_escapes_sqlscript_variables(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()
    raw = (
        "--liquibase formatted sql\n--changeset alp:V1 splitStatements:false\n\n"
        "CREATE PROCEDURE p (IN Questionnaire_ID VARCHAR(10)) AS BEGIN\n"
        "  SELECT * FROM t WHERE id = :Questionnaire_ID;\nEND;"
    )

    sm.apply_changeset(dbdao, "my_schema", "hana", _changeset(raw), "v", MagicMock())

    executed = connection.execute.call_args_list[1].args[0]
    assert executed.compile().params == {}


@patch("data_management_plugin.sql_migration._record_changeset")
def test_apply_changeset_substitutes_vocab_schema_placeholder(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()
    raw = (
        "--liquibase formatted sql\n--changeset alp:V1\n\n"
        'CREATE OR REPLACE VIEW "VIEW::OMOP.CONCEPT" AS SELECT * FROM ${VOCAB_SCHEMA}."CONCEPT";'
    )

    sm.apply_changeset(dbdao, "my_schema", "postgres", _changeset(raw), "my_vocab_schema", MagicMock())

    executed_sql = [c.args[0].text for c in connection.execute.call_args_list]
    assert executed_sql[1] == 'CREATE OR REPLACE VIEW "VIEW::OMOP.CONCEPT" AS SELECT * FROM my_vocab_schema."CONCEPT"'


@patch("data_management_plugin.sql_migration._record_changeset")
def test_apply_changeset_rejects_unsafe_vocab_schema_when_placeholder_is_used(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()
    raw = "--liquibase formatted sql\n--changeset alp:V1\n\nCREATE TABLE t (v varchar DEFAULT '${VOCAB_SCHEMA}');"

    with pytest.raises(ValueError, match="not a plain identifier"):
        sm.apply_changeset(dbdao, "my_schema", "postgres", _changeset(raw), "x'); DROP TABLE t; --", MagicMock())

    connection.execute.assert_not_called()


@patch("data_management_plugin.sql_migration._record_changeset")
def test_apply_changeset_does_not_validate_vocab_schema_when_placeholder_unused(record_mock):
    dbdao, connection, trans = _make_dbdao_mock()

    sm.apply_changeset(dbdao, "my_schema", "postgres", _changeset(SIMPLE_CHANGESET), "not a plain identifier", MagicMock())

    trans.commit.assert_called_once()


# --- _record_changeset / ensure_changelog_table (real SQLAlchemy, sqlite) ---

LIQUIBASE_TABLE_DDL = """
CREATE TABLE legacy.databasechangelog (
    id VARCHAR(255) NOT NULL, author VARCHAR(255) NOT NULL, filename VARCHAR(255) NOT NULL,
    dateexecuted TIMESTAMP NOT NULL, orderexecuted INTEGER NOT NULL, exectype VARCHAR(10) NOT NULL,
    md5sum VARCHAR(35), description VARCHAR(255), comments VARCHAR(255), tag VARCHAR(255),
    liquibase VARCHAR(20), contexts VARCHAR(255), labels VARCHAR(255), deployment_id VARCHAR(10)
)
"""


@pytest.fixture
def sqlite_engine():
    engine = sql.create_engine("sqlite://", poolclass=StaticPool)
    with engine.begin() as connection:
        connection.exec_driver_sql("ATTACH DATABASE ':memory:' AS legacy")
    return engine


def _record(engine, filename="db/migrations/postgres/changesets/x/V2__b.sql"):
    changeset = sm.ChangesetFile(path=None, relative_path=filename)
    with engine.begin() as connection:
        sm._record_changeset(connection, "legacy", changeset, "alp", "V2__b")


def _rows(engine):
    with engine.connect() as connection:
        return connection.execute(text(
            "SELECT id, author, filename, orderexecuted, exectype FROM legacy.databasechangelog ORDER BY orderexecuted"
        )).all()


def test_record_changeset_fills_every_required_column_of_a_liquibase_created_table(sqlite_engine):
    with sqlite_engine.begin() as connection:
        connection.exec_driver_sql(LIQUIBASE_TABLE_DDL)
        connection.exec_driver_sql(
            "INSERT INTO legacy.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype) "
            "VALUES ('V1__a', 'alp', 'db/migrations/postgres/changesets/x/V1__a.sql', CURRENT_TIMESTAMP, 7, 'EXECUTED')"
        )

    _record(sqlite_engine)

    rows = _rows(sqlite_engine)
    assert [r.filename.split("/")[-1] for r in rows] == ["V1__a.sql", "V2__b.sql"]
    assert rows[1].orderexecuted == 8
    assert (rows[1].id, rows[1].author, rows[1].exectype) == ("V2__b", "alp", "EXECUTED")


def test_record_changeset_tolerates_a_table_with_only_filename_and_dateexecuted(sqlite_engine):
    with sqlite_engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE legacy.databasechangelog (filename VARCHAR(500), dateexecuted TIMESTAMP)")

    _record(sqlite_engine)

    with sqlite_engine.connect() as connection:
        assert connection.execute(text("SELECT filename FROM legacy.databasechangelog")).scalar().endswith("V2__b.sql")


def test_ensure_changelog_table_creates_the_columns_liquibase_requires():
    dbdao = MagicMock()
    dbdao.check_table_exists.return_value = False

    sm.ensure_changelog_table(dbdao, "s1")

    schema, table, columns = dbdao.create_table.call_args.args
    assert (schema, table) == ("s1", "databasechangelog")
    assert {"id", "author", "filename", "dateexecuted", "orderexecuted", "exectype"} <= set(columns)


def test_ensure_changelog_table_leaves_an_existing_table_alone():
    dbdao = MagicMock()
    dbdao.check_table_exists.return_value = True

    sm.ensure_changelog_table(dbdao, "s1")

    dbdao.create_table.assert_not_called()


# --- _schema_migration_lock ---

def test_schema_migration_lock_takes_and_releases_advisory_lock_on_postgres():
    engine = MagicMock()
    connection = engine.connect.return_value.__enter__.return_value
    connection.execution_options.return_value = connection

    with sm._schema_migration_lock(engine, "postgres", "s1"):
        statements = [str(c.args[0]) for c in connection.execute.call_args_list]
        assert any("pg_advisory_lock" in s for s in statements)
        assert not any("pg_advisory_unlock" in s for s in statements)

    statements = [str(c.args[0]) for c in connection.execute.call_args_list]
    assert "pg_advisory_unlock" in statements[-1]
    assert connection.execute.call_args_list[-1].args[1] == {"schema": "s1"}


def test_schema_migration_lock_releases_when_the_body_raises():
    engine = MagicMock()
    connection = engine.connect.return_value.__enter__.return_value
    connection.execution_options.return_value = connection

    with pytest.raises(RuntimeError):
        with sm._schema_migration_lock(engine, "postgres", "s1"):
            raise RuntimeError("migration failed")

    assert "pg_advisory_unlock" in str(connection.execute.call_args_list[-1].args[0])


def test_schema_migration_lock_is_a_noop_on_hana():
    engine = MagicMock()

    with sm._schema_migration_lock(engine, "hana", "s1"):
        pass

    engine.connect.assert_not_called()


# --- apply_data_model_schema ---

@patch("data_management_plugin.sql_migration.apply_changeset")
@patch("data_management_plugin.sql_migration.get_applied_filenames")
@patch("data_management_plugin.sql_migration.ensure_changelog_table")
def test_apply_data_model_schema_skips_already_applied_changesets(
    ensure_table_mock, get_applied_mock, apply_changeset_mock
):
    dbdao = MagicMock()
    all_files = sm.list_changeset_files("postgres", "medical-imaging")
    get_applied_mock.return_value = {all_files[0].relative_path}

    with patch("data_management_plugin.sql_migration.get_run_logger", return_value=MagicMock()):
        sm.apply_data_model_schema(dbdao, "my_schema", "medical-imaging", "postgres")

    ensure_table_mock.assert_called_once_with(dbdao, "my_schema")
    apply_changeset_mock.assert_called_once()
    assert apply_changeset_mock.call_args.args[3].relative_path == all_files[1].relative_path
    # one engine is shared across the whole run
    assert apply_changeset_mock.call_args.args[6] is dbdao.engine
    dbdao.validate_schema_name.assert_called_once_with("my_schema")


@patch("data_management_plugin.sql_migration.apply_changeset")
@patch("data_management_plugin.sql_migration.get_applied_filenames")
@patch("data_management_plugin.sql_migration.ensure_changelog_table")
def test_apply_data_model_schema_noop_when_fully_applied(
    ensure_table_mock, get_applied_mock, apply_changeset_mock
):
    dbdao = MagicMock()
    all_files = sm.list_changeset_files("postgres", "medical-imaging")
    get_applied_mock.return_value = {f.relative_path for f in all_files}

    with patch("data_management_plugin.sql_migration.get_run_logger", return_value=MagicMock()):
        sm.apply_data_model_schema(dbdao, "my_schema", "medical-imaging", "postgres")

    apply_changeset_mock.assert_not_called()


@patch("data_management_plugin.sql_migration.apply_changeset")
@patch("data_management_plugin.sql_migration.get_applied_filenames", return_value=set())
@patch("data_management_plugin.sql_migration.ensure_changelog_table")
def test_apply_data_model_schema_count_limits_pending_changesets(
    ensure_table_mock, get_applied_mock, apply_changeset_mock
):
    with patch("data_management_plugin.sql_migration.get_run_logger", return_value=MagicMock()):
        sm.apply_data_model_schema(MagicMock(), "my_schema", "omop5-4", "postgres", count=3)

    assert apply_changeset_mock.call_count == 3


@patch("data_management_plugin.sql_migration.apply_changeset")
@patch("data_management_plugin.sql_migration.get_applied_filenames", return_value=set())
@patch("data_management_plugin.sql_migration.ensure_changelog_table")
def test_apply_data_model_schema_holds_the_lock_while_applying(
    ensure_table_mock, get_applied_mock, apply_changeset_mock
):
    events = []

    @contextmanager
    def fake_lock(engine, dialect, schema_name):
        events.append(("lock", dialect, schema_name))
        yield
        events.append(("unlock",))

    apply_changeset_mock.side_effect = lambda *a, **k: events.append(("apply",))

    with patch("data_management_plugin.sql_migration._schema_migration_lock", fake_lock), \
         patch("data_management_plugin.sql_migration.get_run_logger", return_value=MagicMock()):
        sm.apply_data_model_schema(MagicMock(), "s1", "medical-imaging", "postgres")

    assert events == [("lock", "postgres", "s1"), ("apply",), ("apply",), ("unlock",)]


def test_apply_data_model_schema_rejects_unsupported_data_model_before_touching_the_schema():
    dbdao = MagicMock()
    with patch("data_management_plugin.sql_migration.get_run_logger", return_value=MagicMock()), \
         patch("data_management_plugin.sql_migration.ensure_changelog_table"), \
         patch("data_management_plugin.sql_migration.get_applied_filenames", return_value=set()), \
         pytest.raises(ValueError, match="not supported"):
        sm.apply_data_model_schema(dbdao, "s1", "custom-omop-ms", "postgres")


# --- get_latest_available_changeset ---

@patch("data_management_plugin.sql_migration.get_applied_filenames")
def test_get_latest_available_changeset_returns_newest_pending(get_applied_mock):
    dbdao = MagicMock()
    all_files = sm.list_changeset_files("postgres", "medical-imaging")
    get_applied_mock.return_value = set()  # nothing applied yet

    result = sm.get_latest_available_changeset(dbdao, "my_schema", "medical-imaging", "postgres")

    assert result == all_files[-1].relative_path


@patch("data_management_plugin.sql_migration.get_applied_filenames")
def test_get_latest_available_changeset_returns_newest_applied_when_up_to_date(get_applied_mock):
    dbdao = MagicMock()
    all_files = sm.list_changeset_files("postgres", "medical-imaging")
    get_applied_mock.return_value = {f.relative_path for f in all_files}

    result = sm.get_latest_available_changeset(dbdao, "my_schema", "medical-imaging", "postgres")

    assert result == all_files[-1].relative_path


def test_get_latest_available_changeset_rejects_unsupported_data_model():
    with pytest.raises(ValueError, match="not supported"):
        sm.get_latest_available_changeset(MagicMock(), "s1", "custom-omop-ms", "postgres")
