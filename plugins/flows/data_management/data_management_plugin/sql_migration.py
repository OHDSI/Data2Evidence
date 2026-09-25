"""Applies the changeset .sql files directly via SQLAlchemy.

Plain SQL files work; the Liquibase "--liquibase formatted sql" / "--changeset" comments are optional.
Applied changesets are recorded in a Liquibase-shaped `databasechangelog` table, so
schemas Liquibase already migrated are picked up as-is and the DAO version/date
methods keep working.
"""
import hashlib
import re
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator, List, NamedTuple, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, MetaData, String, Table, func, inspect, select, text,
)

from prefect.logging import get_run_logger

from _shared_flow_utils.dao.daobase import DaoBase

CHANGELOG_TABLE = "databasechangelog"

MIGRATIONS_ROOT = Path(__file__).resolve().parent / "db" / "migrations"

LOCK_TABLE = "databasechangeloglock"
LOCK_WAIT_TIMEOUT_SECONDS = 300
LOCK_WAIT_INTERVAL_SECONDS = 1

SPLIT_STATEMENTS_FALSE_REGEX = re.compile(r"splitStatements:false", re.IGNORECASE)
CHANGESET_HEADER_REGEX = re.compile(r"^--changeset\s+([^:\s]+):(\S+)")
SPLIT_STATEMENTS_FALSE_LINE_REGEX = re.compile(r"^--\s*splitStatements:false\b", re.IGNORECASE)
DEFAULT_AUTHOR = "d2e"
# fits Liquibase's md5sum column (35 chars); marks checksums this runner wrote, since
# Liquibase's own can't be recomputed
CHECKSUM_PREFIX = "d2:"
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


class AppliedChangeset(NamedTuple):
    id: Optional[str]
    author: Optional[str]
    md5sum: Optional[str]


def _parse_changeset(raw_text: str) -> tuple[bool, str]:
    split_statements = True
    body_lines = []
    changeset_count = 0
    for line in raw_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("--liquibase formatted sql"):
            continue
        if SPLIT_STATEMENTS_FALSE_LINE_REGEX.match(stripped):
            split_statements = False
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


def _checksum(raw_text: str) -> str:
    normalized = raw_text.replace("\r\n", "\n").strip()
    return CHECKSUM_PREFIX + hashlib.md5(normalized.encode(), usedforsecurity=False).hexdigest()


def _parse_changeset_header(raw_text: str, filename: str) -> tuple[str, str]:
    """(author, id) from the `--changeset author:id` line; plain SQL files get the default author and the file name."""
    for line in raw_text.splitlines():
        match = CHANGESET_HEADER_REGEX.match(line.strip())
        if match:
            return match.group(1), match.group(2)
    return DEFAULT_AUTHOR, Path(filename).stem


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


def _normalize_identifier(name: str, dialect: Optional[str]) -> str:
    return name.upper() if dialect == "hana" else name


def _normalized_schema_name(engine, schema_name: str) -> str:
    return _normalize_identifier(schema_name, engine.dialect.name)


def _normalized_table_name(engine, table_name: str) -> str:
    return _normalize_identifier(table_name, engine.dialect.name)


def _resolve_column(table: Table, column_name: str):
    if column_name in table.c:
        return table.c[column_name]
    needle = column_name.lower()
    for column in table.c:
        if column.name.lower() == needle:
            return column
    return None


def _is_locked_value(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "t", "yes", "y"}
    return False


def _is_missing_table_error(error: Exception, table_name: str) -> bool:
    message = str(error).lower()
    markers = (
        "does not exist",
        "no such table",
        "invalid table name",
        "undefined table",
        "could not find table",
    )
    return table_name.lower() in message and any(marker in message for marker in markers)


def _is_missing_changelog_table_error(error: Exception) -> bool:
    seen = set()
    current: Optional[BaseException] = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if _is_missing_table_error(current, CHANGELOG_TABLE):
            return True
        current = current.__cause__ or current.__context__
    return False


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
    dialect = getattr(getattr(getattr(dbdao, "engine", None), "dialect", None), "name", None)
    normalized_schema_name = _normalize_identifier(schema_name, dialect)
    changelog_table_name = _normalize_identifier(CHANGELOG_TABLE, dialect)
    if not dbdao.check_table_exists(normalized_schema_name, changelog_table_name):
        dbdao.create_table(
            normalized_schema_name,
            changelog_table_name,
            {
                "id": String(255),
                "author": String(255),
                "filename": String(500),
                "dateexecuted": DateTime,
                "orderexecuted": Integer,
                "exectype": String(10),
                "md5sum": String(35),
            },
        )


def get_applied_changesets(dbdao: DaoBase, schema_name: str, engine=None) -> dict:
    engine = dbdao.engine if engine is None else engine
    with engine.connect() as connection:
        table = Table(
            _normalized_table_name(engine, CHANGELOG_TABLE),
            MetaData(schema=_normalized_schema_name(engine, schema_name)),
            autoload_with=connection,
        )
        filename_column = _resolve_column(table, "filename")
        if filename_column is None:
            return {}
        columns = [filename_column.label("filename")]
        for name in ("id", "author", "md5sum"):
            column = _resolve_column(table, name)
            if column is not None:
                columns.append(column.label(name))
        rows = connection.execute(select(*columns)).mappings().all()
        return {
            row["filename"]: AppliedChangeset(row.get("id"), row.get("author"), row.get("md5sum"))
            for row in rows
        }


def get_applied_filenames(dbdao: DaoBase, schema_name: str, engine=None) -> set:
    return set(get_applied_changesets(dbdao, schema_name, engine))


def _validate_applied_changesets(all_files: List[ChangesetFile], applied: dict) -> None:
    """Refuse to continue if an already-applied changeset file was edited: its author/id changed,
    or (for changesets this runner recorded) its content did."""
    problems = []
    for changeset in all_files:
        recorded = applied.get(changeset.relative_path)
        if recorded is None:
            continue
        raw_text = changeset.path.read_text()
        author, changeset_id = _parse_changeset_header(raw_text, changeset.path.name)
        if recorded.id is not None and recorded.author is not None \
                and (recorded.author, recorded.id) != (author, changeset_id):
            problems.append(
                f"{changeset.relative_path}: recorded as {recorded.author}:{recorded.id}, "
                f"the file now says {author}:{changeset_id}"
            )
        elif recorded.md5sum and recorded.md5sum.startswith(CHECKSUM_PREFIX) \
                and recorded.md5sum != _checksum(raw_text):
            problems.append(f"{changeset.relative_path}: changed since it was applied")
    if problems:
        raise ValueError(
            "Already-applied changesets were modified; add a new changeset instead of editing one:\n- "
            + "\n- ".join(problems)
        )


def _record_changeset(connection, schema_name: str, changeset: ChangesetFile,
                      author: str, changeset_id: str, checksum: str) -> None:
    """Insert into databasechangelog on the caller's connection, writing only the columns the table has."""
    engine = connection.engine
    table = Table(
        _normalized_table_name(engine, CHANGELOG_TABLE),
        MetaData(schema=_normalized_schema_name(engine, schema_name)),
        autoload_with=connection,
    )
    row = {
        "id": changeset_id,
        "author": author,
        "filename": changeset.relative_path,
        "dateexecuted": datetime.now(),
        "exectype": "EXECUTED",
        "md5sum": checksum,
    }
    orderexecuted_column = _resolve_column(table, "orderexecuted")
    if orderexecuted_column is not None:
        current_max = connection.execute(select(func.max(orderexecuted_column))).scalar()
        row["orderexecuted"] = (current_max or 0) + 1
    insert_row = {}
    for key, value in row.items():
        column = _resolve_column(table, key)
        if column is not None:
            insert_row[column.name] = value
    connection.execute(table.insert(), [insert_row])


def apply_changeset(dbdao: DaoBase, schema_name: str, dialect: str,
                    changeset: ChangesetFile, vocab_schema: str, logger,
                    engine=None, record_only: bool = False) -> None:
    raw_text = changeset.path.read_text()
    author, changeset_id = _parse_changeset_header(raw_text, changeset.relative_path.rsplit("/", 1)[-1])
    statements: List[str] = []
    if not record_only:
        split_statements, sql_body = _parse_changeset(raw_text)
        if VOCAB_SCHEMA_PLACEHOLDER in sql_body:
            if not SAFE_IDENTIFIER_REGEX.match(vocab_schema):
                raise ValueError(f"Vocab schema name '{vocab_schema}' is not a plain identifier")
            sql_body = sql_body.replace(VOCAB_SCHEMA_PLACEHOLDER, vocab_schema)
        statements = _split_sql_statements(sql_body) if split_statements else [sql_body]
    engine = dbdao.engine if engine is None else engine

    with engine.connect() as connection:
        trans = connection.begin()
        try:
            if not record_only:
                connection.execute(text(_set_current_schema_statement(dialect, schema_name)))
            for statement in statements:
                connection.execute(_to_text(statement))
            _record_changeset(connection, schema_name, changeset, author, changeset_id, _checksum(raw_text))
            trans.commit()
        except Exception:
            trans.rollback()
            logger.error(
                f"Failed to apply changeset '{changeset.relative_path}' to schema '{schema_name}'"
            )
            raise


def _lock_table(engine, schema_name: str) -> Table:
    # same table Liquibase used, so one Liquibase already created works as-is
    dialect = engine.dialect.name
    return Table(
        _normalize_identifier(LOCK_TABLE, dialect),
        MetaData(schema=_normalize_identifier(schema_name, dialect)),
        Column(_normalize_identifier("id", dialect), Integer, primary_key=True, autoincrement=False),
        Column(_normalize_identifier("locked", dialect), Boolean, nullable=False),
    )


def _ensure_lock_row(engine, table: Table) -> None:
    id_column = _resolve_column(table, "id")
    locked_column = _resolve_column(table, "locked")
    # concurrent first runs can race on creating the table or seeding the row
    try:
        table.create(engine, checkfirst=True)
    except Exception:
        if not inspect(engine).has_table(table.name, schema=table.schema):
            raise
    try:
        with engine.begin() as connection:
            if connection.execute(select(id_column).where(id_column == 1)).first() is None:
                connection.execute(table.insert().values({id_column.name: 1, locked_column.name: False}))
    except Exception as seed_error:
        # a duplicate key aborts the transaction, so look again on a fresh connection
        with engine.connect() as connection:
            if connection.execute(select(id_column).where(id_column == 1)).first() is None:
                raise seed_error


@contextmanager
def _schema_migration_lock(engine, schema_name: str) -> Iterator[None]:
    """Serialize migrations of one schema by holding a row lock on a connection of its own.

    The database releases the lock if this run dies, so there is no lease to expire. The changesets
    run on other connections, which is why HANA's auto-committing DDL does not release it.
    """
    table = _lock_table(engine, schema_name)
    id_column = _resolve_column(table, "id")
    locked_column = _resolve_column(table, "locked")
    _ensure_lock_row(engine, table)
    with engine.connect() as lock_connection:
        lock_wait_started = None
        while True:
            row = lock_connection.execute(
                select(id_column.label("id"), locked_column.label("locked"))
                .where(id_column == 1)
                .with_for_update()
            ).mappings().first()
            if row is None:
                lock_connection.rollback()
                _ensure_lock_row(engine, table)
                continue
            if _is_locked_value(row["locked"]):
                if lock_wait_started is None:
                    lock_wait_started = time.monotonic()
                elif time.monotonic() - lock_wait_started >= LOCK_WAIT_TIMEOUT_SECONDS:
                    lock_connection.rollback()
                    raise TimeoutError(
                        "DATABASECHANGELOGLOCK remains locked. Wait for Liquibase to finish "
                        "or release the lock row before retrying."
                    )
                lock_connection.rollback()
                time.sleep(LOCK_WAIT_INTERVAL_SECONDS)
                continue
            lock_wait_started = None
            break
        try:
            yield
        finally:
            lock_connection.rollback()


def apply_data_model_schema(dbdao: DaoBase, schema_name: str, data_model: str,
                            dialect: str, vocab_schema: Optional[str] = None,
                            count: Optional[int] = None, record_only: bool = False) -> None:
    """record_only marks pending changesets as executed without running their SQL (Liquibase's changelog-sync)."""
    logger = get_run_logger()
    dbdao.validate_schema_name(schema_name)
    all_files = list_changeset_files(dialect, data_model)
    engine = dbdao.engine

    with _schema_migration_lock(engine, schema_name):
        ensure_changelog_table(dbdao, schema_name)
        applied = get_applied_changesets(dbdao, schema_name, engine)
        _validate_applied_changesets(all_files, applied)

        pending = [f for f in all_files if f.relative_path not in applied]

        if count is not None:
            if count < 0:
                raise ValueError("count must be non-negative")
            pending = pending[:count]

        if not pending:
            logger.info(
                f"Schema '{schema_name}' is already up to date for data model '{data_model}'"
            )
            return

        verb = "Recording (without running)" if record_only else "Applying"
        for changeset in pending:
            logger.info(f"{verb} changeset '{changeset.relative_path}' for schema '{schema_name}'..")
            apply_changeset(dbdao, schema_name, dialect, changeset, vocab_schema or schema_name,
                            logger, engine, record_only)
            logger.info(f"Done with changeset '{changeset.relative_path}' for schema '{schema_name}'")


def get_latest_available_changeset(dbdao: DaoBase, schema_name: str, data_model: str,
                                   dialect: str) -> str:
    """Newest pending changeset, or the newest applied one if the schema is up to date."""
    all_files = list_changeset_files(dialect, data_model)
    try:
        applied = get_applied_filenames(dbdao, schema_name)
    except Exception as error:
        if _is_missing_changelog_table_error(error):
            applied = set()
        else:
            raise
    pending = [f for f in all_files if f.relative_path not in applied]
    latest = pending[-1] if pending else (all_files[-1] if all_files else None)
    return latest.relative_path if latest else ""
