-- V4: ensure soft-delete columns exist on both notebook tables (D2).
ALTER TABLE notebook.analysis_definition ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE notebook.analysis_definition ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE notebook.analysis_definition ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE notebook.document            ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
