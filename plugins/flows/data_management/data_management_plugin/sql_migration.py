"""Liquibase-free schema migration runner.

Applies the existing "--liquibase formatted sql" changeset files directly via
SQLAlchemy, without shelling out to the Liquibase CLI. Changeset files are left
untouched on disk (including their `--liquibase formatted sql` / `--changeset`
/ `--rollback` comment lines) so this can be rolled out data-model by
data-model alongside the Liquibase path in liquibase.py.

Applied changesets are recorded in a `databasechangelog` table shaped like
Liquibase's own (just `filename` + `dateexecuted`), so the existing
DaoBase.get_last_executed_changeset / get_datamodel_created_date /
get_datamodel_updated_date methods keep working unchanged for data models
migrated to this runner. `filename` is stored as the same
"db/migrations/<dialect>/changesets/<dir>/<file>" relative path Liquibase used
to store, since `_shared_flow_utils.update_dataset_metadata.extract_version`
(shared by both the Liquibase and this path) parses that exact shape.
"""
import re
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, List, NamedTuple, Optional

from sqlalchemy import DateTime, MetaData, String, Table, select, text

from prefect.logging import get_run_logger

if TYPE_CHECKING:
    from _shared_flow_utils.dao.daobase import DaoBase

CHANGELOG_TABLE = "databasechangelog"

MIGRATIONS_ROOT = Path(__file__).resolve().parent / "db" / "migrations"

SPLIT_STATEMENTS_FALSE_REGEX = re.compile(r"splitStatements:false", re.IGNORECASE)
# Note: some changesets carry a `labels:`/`contexts:` modifier on their
# --changeset line (e.g. omop5-4/V1.0.0.0.4__apply_v5.4.sql). Verified against
# the real Liquibase 4.5.0 CLI: without --labels/--contexts passed on the
# command line (this plugin never passes either), Liquibase applies ALL
# changesets regardless of label/context - the filter only excludes when
# actively supplied and non-matching. So these are NOT skipped here either.

# Data models fully migrated off Liquibase. Ordered changeset directories
# mirror the previous <includeAll> entries in each dialect's Liquibase
# changelog XML (db/migrations/<dialect>/liquibase-changelog-*.xml). The two
# dialects intentionally differ (e.g. hana's omop5-4 changelog has no `gdm`).
DATAMODEL_CHANGESET_DIRS = {
    "postgres": {
        "medical-imaging": ["medical-imaging"],
        "omop5-4": ["omop", "questionnaireResponse", "researchSubject", "consent",
                    "views", "schemaMetadata", "bi", "omop5-4", "monitor",
                    "questionnaire", "gdm"],
    },
    "hana": {
        "medical-imaging": ["medical-imaging"],
        "omop5-4": ["omop", "questionnaireResponse", "researchSubject", "monitor",
                    "consent", "views", "schemaMetadata", "bi", "omop5-4",
                    "questionnaire"],
    },
}


class ChangesetFile(NamedTuple):
    path: Path
    # matches the "db/migrations/<dialect>/changesets/<dir>/<file>" shape
    # Liquibase recorded in its own `databasechangelog.filename` column
    relative_path: str


def _parse_changeset(raw_text: str) -> tuple[bool, str]:
    split_statements = True
    body_lines = []
    for line in raw_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("--liquibase formatted sql"):
            continue
        if stripped.startswith("--changeset"):
            if SPLIT_STATEMENTS_FALSE_REGEX.search(stripped):
                split_statements = False
            continue
        if stripped.startswith("--rollback"):
            continue
        body_lines.append(line)
    return split_statements, "\n".join(body_lines).strip()


BLOCK_COMMENT_REGEX = re.compile(r"/\*.*?\*/", re.DOTALL)


def _split_sql_statements(sql_body: str) -> List[str]:
    # strip /* ... */ block comments first - some changesets keep old,
    # superseded DDL inside one (e.g. omop5-4/V1.0.0.0.4__apply_v5.4.sql),
    # and a semicolon inside the comment would otherwise split it apart
    sql_body = BLOCK_COMMENT_REGEX.sub("", sql_body)
    statements = []
    for raw_statement in sql_body.split(";"):
        lines = [
            line for line in raw_statement.split("\n")
            if line.strip() and not line.strip().startswith("--")
        ]
        cleaned = "\n".join(lines).strip()
        if cleaned:
            statements.append(cleaned)
    return statements


def _set_current_schema_statement(dialect: str, schema_name: str) -> str:
    # Changeset SQL uses unqualified table names, so the connection's default
    # schema must be pointed at the target schema first - this is what
    # Liquibase's `--defaultSchemaName`/JDBC `currentSchema` property did.
    if dialect == "hana":
        return f'SET SCHEMA "{schema_name.upper()}"'
    return f'SET search_path TO "{schema_name.lower()}"'


def is_sql_migration_data_model(data_model: str, dialect: str) -> bool:
    return data_model in DATAMODEL_CHANGESET_DIRS.get(dialect, {})


def list_changeset_files(dialect: str, data_model: str) -> List[ChangesetFile]:
    changeset_dirs = DATAMODEL_CHANGESET_DIRS[dialect][data_model]
    files = []
    for dir_name in changeset_dirs:
        changeset_dir = MIGRATIONS_ROOT / dialect / "changesets" / dir_name
        for file_path in sorted(changeset_dir.glob("*.sql")):
            relative_path = f"db/migrations/{dialect}/changesets/{dir_name}/{file_path.name}"
            files.append(ChangesetFile(path=file_path, relative_path=relative_path))
    return files


def ensure_changelog_table(dbdao: "DaoBase", schema_name: str) -> None:
    if not dbdao.check_table_exists(schema_name, CHANGELOG_TABLE):
        dbdao.create_table(
            schema_name,
            CHANGELOG_TABLE,
            {"filename": String(500), "dateexecuted": DateTime},
        )


def get_applied_filenames(dbdao: "DaoBase", schema_name: str) -> set:
    with dbdao.engine.connect() as connection:
        metadata_obj = MetaData(schema=schema_name)
        table = Table(CHANGELOG_TABLE, metadata_obj, autoload_with=connection)
        rows = connection.execute(select(table.c.filename)).scalars().all()
        return set(rows)


def apply_changeset(dbdao: "DaoBase", schema_name: str, dialect: str,
                    changeset: ChangesetFile, vocab_schema: str, logger) -> None:
    split_statements, sql_body = _parse_changeset(changeset.path.read_text())
    # mirrors Liquibase's `-DVOCAB_SCHEMA=<value>` changelog parameter, which
    # substitutes this placeholder in a handful of omop/omop5-4 changesets
    sql_body = sql_body.replace("${VOCAB_SCHEMA}", vocab_schema)

    with dbdao.engine.connect() as connection:
        trans = connection.begin()
        try:
            connection.execute(text(_set_current_schema_statement(dialect, schema_name)))
            if split_statements:
                for statement in _split_sql_statements(sql_body):
                    connection.execute(text(statement))
            else:
                connection.execute(text(sql_body))
            trans.commit()
        except Exception:
            trans.rollback()
            logger.error(
                f"Failed to apply changeset '{changeset.relative_path}' to schema '{schema_name}'"
            )
            raise

    dbdao.insert_values_into_table(
        schema_name,
        CHANGELOG_TABLE,
        [{"filename": changeset.relative_path, "dateexecuted": datetime.now()}],
    )


def apply_data_model_schema(dbdao: "DaoBase", schema_name: str, data_model: str,
                            dialect: str, vocab_schema: Optional[str] = None,
                            count: Optional[int] = None) -> None:
    logger = get_run_logger()
    ensure_changelog_table(dbdao, schema_name)
    applied = get_applied_filenames(dbdao, schema_name)

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
        apply_changeset(dbdao, schema_name, dialect, changeset, vocab_schema or schema_name, logger)
        logger.info(
            f"Successfully applied changeset '{changeset.relative_path}' to schema '{schema_name}'"
        )


def get_latest_available_changeset(dbdao: "DaoBase", schema_name: str, data_model: str,
                                   dialect: str) -> str:
    """Pure-Python equivalent of `liquibase status`: the newest changeset
    defined on disk that has not yet been applied to `schema_name`, or the
    newest applied one if the schema is fully up to date. Returned in the
    same "db/migrations/..." shape stored in `databasechangelog.filename`,
    so callers can run it through `extract_version` like the Liquibase path."""
    all_files = list_changeset_files(dialect, data_model)
    applied = get_applied_filenames(dbdao, schema_name)
    pending = [f for f in all_files if f.relative_path not in applied]
    latest = pending[-1] if pending else (all_files[-1] if all_files else None)
    return latest.relative_path if latest else ""
