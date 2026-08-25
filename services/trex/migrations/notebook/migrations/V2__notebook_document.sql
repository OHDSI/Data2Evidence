-- Stored notebooks. Distinct from notebook.analysis_definition (Strategus specs):
-- a `document` is a free-form notebook (cells + metadata) serialized into `content`.
CREATE TABLE IF NOT EXISTS notebook.document (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content     JSONB NOT NULL,
    created_by  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notebook_document_updated
    ON notebook.document(updated_at DESC);
