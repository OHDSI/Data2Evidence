"""Applies the "--liquibase formatted sql" changesets directly via SQLAlchemy.

Applied changesets are recorded in a Liquibase-shaped `databasechangelog` table, so
schemas Liquibase already migrated are picked up as-is and the DAO version/date
methods keep working.
"""
import re
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator, List, NamedTuple, Optional

from sqlalchemy import DateTime, Integer, MetaData, String, Table, func, select, text

from prefect.logging import get_run_logger

from _shared_flow_utils.dao.daobase import DaoBase

CHANGELOG_TABLE = "databasechangelog"

MIGRATIONS_ROOT = Path(__file__).resolve().parent / "db" / "migrations"

LOCK_TIMEOUT_SECONDS = 600

SPLIT_STATEMENTS_FALSE_REGEX = re.compile(r"splitStatements:false", re.IGNORECASE)
CHANGESET_HEADER_REGEX = re.compile(r"^--changeset\s+([^:\s]+):(\S+)")
VOCAB_SCHEMA_PLACEHOLDER = "${VOCAB_SCHEMA}"
# used unquoted in the changesets, so it must be a plain identifier
SAFE_IDENTIFIER_REGEX = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
# same pattern SQLAlchemy's text() uses to find `:name` bind parameters
BIND_PARAM_REGEX = re.compile(r"(?<![:\w\x5c]):(\w+)(?!:)")

# Changesets tagged `labels:`/`contexts:` (e.g. omop5-4/V1.0.0.0.4__apply_v5.4.sql) are
# still applied: Liquibase 4.5.0 only skips them when --labels/--contexts is passed.

# hana has no `gdm`; waveform is omop5-4 plus its own directory
_OMOP54_DIRS_POSTGRES = ["omop", "questionnaireResponse", "researchSubject", "consent",
                        "views", "schemaMetadata", "bi", "omop5-4", "monitor",
                        "questionnaire", "gdm"]
_OMOP54_DIRS_HANA = ["omop", "questionnaireResponse", "researchSubject", "monitor",
                     "consent", "views", "schemaMetadata", "bi", "omop5-4",
                     "questionnaire"]

DATAMODEL_CHANGESET_DIRS = {
    "postgres": {
        "medical-imaging": ["medical-imaging"],
        "omop5-4": _OMOP54_DIRS_POSTGRES,
        "waveform": _OMOP54_DIRS_POSTGRES + ["waveform"],
    },
    "hana": {
        "medical-imaging": ["medical-imaging"],
        "omop5-4": _OMOP54_DIRS_HANA,
        "waveform": _OMOP54_DIRS_HANA + ["waveform"],
    },
}


class ChangesetFile(NamedTuple):
    path: Path
    # stored in databasechangelog.filename; extract_version parses this exact shape
    relative_path: str


def _parse_changeset(raw_text: str) -> tuple[bool, str]:
    split_statements = True
    body_lines = []
    changeset_count = 0
    for line in raw_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("--liquibase formatted sql"):
            continue
        if stripped.startswith("--changeset"):
            changeset_count += 1
            if SPLIT_STATEMENTS_FALSE_REGEX.search(stripped):
                split_statements = False
            continue
        if stripped.startswith("--rollback"):
            continue
        body_lines.append(line)
    if changeset_count > 1:
        raise ValueError(f"Found {changeset_count} '--changeset' sections, expected exactly 1 per file")
    return split_statements, "\n".join(body_lines).strip()


def _parse_changeset_header(raw_text: str) -> tuple[str, str]:
    for line in raw_text.splitlines():
        match = CHANGESET_HEADER_REGEX.match(line.strip())
        if match:
            return match.group(1), match.group(2)
    raise ValueError("Missing '--changeset author:id' header")


def _split_sql_statements(sql_body: str) -> List[str]:
    """Split on top-level `;`, dropping comments and ignoring `;` inside strings and quoted identifiers."""
    statements: List[str] = []
    current: List[str] = []

    def flush() -> None:
        statement = "".join(current).strip()
        if statement:
            statements.append(statement)
        current.clear()

    i, n = 0, len(sql_body)
    while i < n:
        char = sql_body[i]
        following = sql_body[i + 1] if i + 1 < n else ""
        if char == "-" and following == "-":
            end = sql_body.find("\n", i)
            i = n if end == -1 else end
        elif char == "/" and following == "*":
            end = sql_body.find("*/", i + 2)
            i = n if end == -1 else end + 2
            current.append(" ")
        elif char in ("'", '"'):
            j = i + 1
            while j < n:
                if sql_body[j] == char:
                    if j + 1 < n and sql_body[j + 1] == char:
                        j += 2
                        continue
                    break
                j += 1
            current.append(sql_body[i:j + 1])
            i = j + 1
        elif char == ";":
            flush()
            i += 1
        else:
            current.append(char)
            i += 1
    flush()
    return statements


def _escape_bind_params(statement: str) -> str:
    # HANA SQLScript uses `:name` for variables, which text() would read as a bind parameter
    return BIND_PARAM_REGEX.sub(r"\\:\1", statement)


def _to_text(statement: str):
    clause = text(_escape_bind_params(statement))
    if clause.compile().params:
        raise ValueError(f"Statement contains an unescapable bind parameter: {statement[:100]}")
    return clause


def _quote_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def _set_current_schema_statement(dialect: str, schema_name: str) -> str:
    # changesets use unqualified table names
    if dialect == "hana":
        return f"SET SCHEMA {_quote_identifier(schema_name.upper())}"
    return f"SET LOCAL search_path TO {_quote_identifier(schema_name.lower())}"


def list_changeset_files(dialect: str, data_model: str) -> List[ChangesetFile]:
    try:
        changeset_dirs = DATAMODEL_CHANGESET_DIRS[dialect][data_model]
    except KeyError:
        raise ValueError(
            f"Data model '{data_model}' is not supported for dialect '{dialect}'"
        ) from None
    files = []
    for dir_name in changeset_dirs:
        changeset_dir = MIGRATIONS_ROOT / dialect / "changesets" / dir_name
        for file_path in sorted(changeset_dir.glob("*.sql")):
            relative_path = f"db/migrations/{dialect}/changesets/{dir_name}/{file_path.name}"
            files.append(ChangesetFile(path=file_path, relative_path=relative_path))
    return files


def ensure_changelog_table(dbdao: DaoBase, schema_name: str) -> None:
    if not dbdao.check_table_exists(schema_name, CHANGELOG_TABLE):
        dbdao.create_table(
            schema_name,
            CHANGELOG_TABLE,
            {
                "id": String(255),
                "author": String(255),
                "filename": String(500),
                "dateexecuted": DateTime,
                "orderexecuted": Integer,
                "exectype": String(10),
            },
        )


def get_applied_filenames(dbdao: DaoBase, schema_name: str, engine=None) -> set:
    engine = dbdao.engine if engine is None else engine
    with engine.connect() as connection:
        table = Table(CHANGELOG_TABLE, MetaData(schema=schema_name), autoload_with=connection)
        rows = connection.execute(select(table.c.filename)).scalars().all()
        return set(rows)


def _record_changeset(connection, schema_name: str, changeset: ChangesetFile,
                      author: str, changeset_id: str) -> None:
    """Insert into databasechangelog on the caller's connection, writing only the columns the table has."""
    table = Table(CHANGELOG_TABLE, MetaData(schema=schema_name), autoload_with=connection)
    row = {
        "id": changeset_id,
        "author": author,
        "filename": changeset.relative_path,
        "dateexecuted": datetime.now(),
        "exectype": "EXECUTED",
    }
    if "orderexecuted" in table.c:
        current_max = connection.execute(select(func.max(table.c.orderexecuted))).scalar()
        row["orderexecuted"] = (current_max or 0) + 1
    connection.execute(table.insert(), [{k: v for k, v in row.items() if k in table.c}])


def apply_changeset(dbdao: DaoBase, schema_name: str, dialect: str,
                    changeset: ChangesetFile, vocab_schema: str, logger,
                    engine=None) -> None:
    raw_text = changeset.path.read_text()
    split_statements, sql_body = _parse_changeset(raw_text)
    author, changeset_id = _parse_changeset_header(raw_text)
    if VOCAB_SCHEMA_PLACEHOLDER in sql_body:
        if not SAFE_IDENTIFIER_REGEX.match(vocab_schema):
            raise ValueError(f"Vocab schema name '{vocab_schema}' is not a plain identifier")
        sql_body = sql_body.replace(VOCAB_SCHEMA_PLACEHOLDER, vocab_schema)

    statements = _split_sql_statements(sql_body) if split_statements else [sql_body]
    engine = dbdao.engine if engine is None else engine

    with engine.connect() as connection:
        trans = connection.begin()
        try:
            connection.execute(text(_set_current_schema_statement(dialect, schema_name)))
            for statement in statements:
                connection.execute(_to_text(statement))
            _record_changeset(connection, schema_name, changeset, author, changeset_id)
            trans.commit()
        except Exception:
            trans.rollback()
            logger.error(
                f"Failed to apply changeset '{changeset.relative_path}' to schema '{schema_name}'"
            )
            raise


@contextmanager
def _schema_migration_lock(engine, dialect: str, schema_name: str) -> Iterator[None]:
    """Serialize concurrent migrations of one schema (Postgres advisory lock only)."""
    if dialect != "postgres":
        yield
        return
    params = {"schema": schema_name}
    with engine.connect() as lock_connection:
        lock_connection = lock_connection.execution_options(isolation_level="AUTOCOMMIT")
        lock_connection.execute(text(f"SET lock_timeout = '{LOCK_TIMEOUT_SECONDS}s'"))
        lock_connection.execute(
            text("SELECT pg_advisory_lock(hashtext('d2e_schema_migration'), hashtext(:schema))"),
            params,
        )
        lock_connection.execute(text("RESET lock_timeout"))
        try:
            yield
        finally:
            lock_connection.execute(
                text("SELECT pg_advisory_unlock(hashtext('d2e_schema_migration'), hashtext(:schema))"),
                params,
            )


def apply_data_model_schema(dbdao: DaoBase, schema_name: str, data_model: str,
                            dialect: str, vocab_schema: Optional[str] = None,
                            count: Optional[int] = None) -> None:
    logger = get_run_logger()
    dbdao.validate_schema_name(schema_name)
    engine = dbdao.engine

    with _schema_migration_lock(engine, dialect, schema_name):
        ensure_changelog_table(dbdao, schema_name)
        applied = get_applied_filenames(dbdao, schema_name, engine)

        pending = [f for f in list_changeset_files(dialect, data_model) if f.relative_path not in applied]

        if count:
            pending = pending[:count]

        if not pending:
            logger.info(
                f"Schema '{schema_name}' is already up to date for data model '{data_model}'"
            )
            return

        for changeset in pending:
            logger.info(f"Applying changeset '{changeset.relative_path}' to schema '{schema_name}'..")
            apply_changeset(dbdao, schema_name, dialect, changeset, vocab_schema or schema_name,
                            logger, engine)
            logger.info(
                f"Successfully applied changeset '{changeset.relative_path}' to schema '{schema_name}'"
            )


def get_latest_available_changeset(dbdao: DaoBase, schema_name: str, data_model: str,
                                   dialect: str) -> str:
    """Newest pending changeset, or the newest applied one if the schema is up to date."""
    all_files = list_changeset_files(dialect, data_model)
    applied = get_applied_filenames(dbdao, schema_name)
    pending = [f for f in all_files if f.relative_path not in applied]
    latest = pending[-1] if pending else (all_files[-1] if all_files else None)
    return latest.relative_path if latest else ""
