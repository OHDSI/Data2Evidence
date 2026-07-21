-- Notebook metadata schema.
CREATE SCHEMA IF NOT EXISTS notebook;

CREATE TABLE IF NOT EXISTS notebook.analysis_definition (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    spec        JSONB NOT NULL,
    created_by  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notebook_def_updated ON notebook.analysis_definition(updated_at DESC);

CREATE TABLE IF NOT EXISTS notebook.analysis_result (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id     UUID REFERENCES notebook.analysis_definition(id),
    job_id            TEXT NOT NULL,
    cdm_connection_id UUID,
    status            TEXT NOT NULL,
    storage_bucket    TEXT NOT NULL,
    storage_key       TEXT NOT NULL,
    size_bytes        BIGINT,
    created_by        UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notebook_result_def ON notebook.analysis_result(definition_id);

CREATE TABLE IF NOT EXISTS notebook.cdm_connection (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label        TEXT NOT NULL,
    dbms         TEXT NOT NULL DEFAULT 'postgresql',
    host         TEXT NOT NULL,
    port         INT  NOT NULL DEFAULT 5432,
    database     TEXT NOT NULL,
    cdm_schema   TEXT NOT NULL,
    vocab_schema TEXT,
    "user"       TEXT NOT NULL,
    password_encrypted BYTEA,
    created_by   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Keep the secret out of the auto-generated GraphQL schema (RLS is bypassed).
-- trex runs PostGraphile v5 (5.0.0-rc.7) with only the Amber + connection-filter
-- presets — NOT the V4 preset — so the v4-era `@omit` smart tag is silently
-- ignored (verified live: a column commented `@omit` still appears in the
-- generated type). The v5 mechanism that actually removes a column from every
-- generated operation/type is the behavior smart tag `@behavior -*`
-- (verified live: `passwordEncrypted` disappears from NotebookCdmConnection).
COMMENT ON COLUMN notebook.cdm_connection.password_encrypted IS E'@behavior -*';
