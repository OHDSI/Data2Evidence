from unittest.mock import MagicMock, patch

import pytest

from data_management_plugin import sql_migration as sm


# --- _parse_changeset ---

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


# --- _set_current_schema_statement ---

def test_set_current_schema_statement_postgres_lowercases():
    assert sm._set_current_schema_statement("postgres", "MySchema") == 'SET search_path TO "myschema"'


def test_set_current_schema_statement_hana_uppercases():
    assert sm._set_current_schema_statement("hana", "MySchema") == 'SET SCHEMA "MYSCHEMA"'


# --- is_sql_migration_data_model ---

@pytest.mark.parametrize("data_model", ["medical-imaging", "omop5-4"])
@pytest.mark.parametrize("dialect", ["postgres", "hana"])
def test_is_sql_migration_data_model_true_for_migrated_models(data_model, dialect):
    assert sm.is_sql_migration_data_model(data_model, dialect) is True


@pytest.mark.parametrize("dialect", ["postgres", "hana"])
def test_is_sql_migration_data_model_false_for_waveform(dialect):
    # waveform stays on Liquibase until it's migrated too
    assert sm.is_sql_migration_data_model("waveform", dialect) is False


def test_is_sql_migration_data_model_false_for_unknown_dialect():
    assert sm.is_sql_migration_data_model("medical-imaging", "snowflake") is False


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


# --- apply_changeset ---

class AnyDatetime:
    """Matches any value when compared with == (used for the dateexecuted field)."""
    def __eq__(self, other):
        return True


def _make_dbdao_mock():
    dbdao = MagicMock()
    connection = MagicMock()
    trans = MagicMock()
    connection.begin.return_value = trans
    dbdao.engine.connect.return_value.__enter__.return_value = connection
    return dbdao, connection, trans


def test_apply_changeset_sets_schema_then_executes_statements_then_records():
    dbdao, connection, trans = _make_dbdao_mock()
    changeset = sm.ChangesetFile(
        path=MagicMock(read_text=lambda: "--liquibase formatted sql\n--changeset alp:V1\n\nCREATE TABLE foo(id integer);"),
        relative_path="db/migrations/postgres/changesets/medical-imaging/V1__create_foo.sql",
    )
    logger = MagicMock()

    sm.apply_changeset(dbdao, "my_schema", "postgres", changeset, "my_vocab_schema", logger)

    executed_sql = [c.args[0].text for c in connection.execute.call_args_list]
    assert executed_sql[0] == 'SET search_path TO "my_schema"'
    assert executed_sql[1] == "CREATE TABLE foo(id integer)"
    trans.commit.assert_called_once()
    trans.rollback.assert_not_called()

    dbdao.insert_values_into_table.assert_called_once_with(
        "my_schema",
        sm.CHANGELOG_TABLE,
        [{"filename": changeset.relative_path, "dateexecuted": AnyDatetime()}],
    )


def test_apply_changeset_rolls_back_and_reraises_on_failure():
    dbdao, connection, trans = _make_dbdao_mock()
    connection.execute.side_effect = [None, Exception("boom")]
    changeset = sm.ChangesetFile(
        path=MagicMock(read_text=lambda: "--liquibase formatted sql\n--changeset alp:V1\n\nCREATE TABLE foo(id integer);"),
        relative_path="db/migrations/postgres/changesets/medical-imaging/V1__create_foo.sql",
    )
    logger = MagicMock()

    with pytest.raises(Exception, match="boom"):
        sm.apply_changeset(dbdao, "my_schema", "postgres", changeset, "my_vocab_schema", logger)

    trans.rollback.assert_called_once()
    trans.commit.assert_not_called()
    dbdao.insert_values_into_table.assert_not_called()


def test_apply_changeset_executes_split_statements_false_body_as_one_statement():
    dbdao, connection, trans = _make_dbdao_mock()
    raw = (
        "--liquibase formatted sql\n"
        "--changeset alp:V1 splitStatements:false\n\n"
        "CREATE OR REPLACE PROCEDURE foo() AS $$ BEGIN SELECT 1; SELECT 2; END; $$;"
    )
    changeset = sm.ChangesetFile(
        path=MagicMock(read_text=lambda: raw),
        relative_path="db/migrations/postgres/changesets/questionnaire/V1__create_sp.sql",
    )
    logger = MagicMock()

    sm.apply_changeset(dbdao, "my_schema", "postgres", changeset, "my_vocab_schema", logger)

    executed_sql = [c.args[0].text for c in connection.execute.call_args_list]
    # one SET SCHEMA statement + exactly one statement for the whole procedure body
    assert len(executed_sql) == 2
    assert "BEGIN SELECT 1; SELECT 2; END;" in executed_sql[1]


def test_apply_changeset_substitutes_vocab_schema_placeholder():
    dbdao, connection, trans = _make_dbdao_mock()
    changeset = sm.ChangesetFile(
        path=MagicMock(read_text=lambda: (
            "--liquibase formatted sql\n--changeset alp:V1\n\n"
            'CREATE OR REPLACE VIEW "VIEW::OMOP.CONCEPT" AS SELECT * FROM ${VOCAB_SCHEMA}."CONCEPT";'
        )),
        relative_path="db/migrations/postgres/changesets/omop5-4/V1__view.sql",
    )
    logger = MagicMock()

    sm.apply_changeset(dbdao, "my_schema", "postgres", changeset, "my_vocab_schema", logger)

    executed_sql = [c.args[0].text for c in connection.execute.call_args_list]
    assert executed_sql[1] == 'CREATE OR REPLACE VIEW "VIEW::OMOP.CONCEPT" AS SELECT * FROM my_vocab_schema."CONCEPT"'


# --- apply_data_model_schema ---

@patch("data_management_plugin.sql_migration.apply_changeset")
@patch("data_management_plugin.sql_migration.get_applied_filenames")
@patch("data_management_plugin.sql_migration.ensure_changelog_table")
def test_apply_data_model_schema_skips_already_applied_changesets(
    ensure_table_mock, get_applied_mock, apply_changeset_mock
):
    dbdao = MagicMock()
    all_files = sm.list_changeset_files("postgres", "medical-imaging")
    already_applied = {all_files[0].relative_path}
    get_applied_mock.return_value = already_applied

    with patch("data_management_plugin.sql_migration.get_run_logger", return_value=MagicMock()):
        sm.apply_data_model_schema(dbdao, "my_schema", "medical-imaging", "postgres")

    ensure_table_mock.assert_called_once_with(dbdao, "my_schema")
    apply_changeset_mock.assert_called_once()
    applied_changeset_arg = apply_changeset_mock.call_args.args[3]
    assert applied_changeset_arg.relative_path == all_files[1].relative_path


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
