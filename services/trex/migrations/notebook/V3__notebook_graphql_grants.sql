-- Expose the `notebook` schema to PostGraphile. PostGraphile connects as the
-- unprivileged `authenticator` role and SET ROLEs to anon/authenticated/
-- service_role per request, so it only introspects objects those roles can see.
-- Plugin-created schemas get no grants by default (only core/schema/
-- V3__graphql_trexdb_grants.sql grants `trexdb`), so without this the study
-- editor's createNotebookAnalysisDefinition mutation is absent from the GraphQL
-- schema and saving a study fails with HTTP 400 "Cannot query field
-- createNotebookAnalysisDefinition on type Mutation".
--
-- notebook.* has no RLS, so authenticated gets full table CRUD (unscoped) and
-- service_role gets ALL. Mirrors the pattern in core/schema/V3__graphql_trexdb_grants.sql.
-- One column IS sensitive: cdm_connection.password_encrypted holds an AES-encrypted
-- value (useless without METADATA_ENC_KEY) and is hidden from GraphQL via its
-- `@behavior -*` smart comment. This table-level grant still lets authenticated read
-- those encrypted bytes over direct SQL, so treat the column as in-scope when reviewing
-- privileges — narrow this to column-level grants if a future value must stay unreadable.

GRANT USAGE ON SCHEMA notebook TO anon, authenticated, service_role, authenticator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA notebook TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA notebook TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA notebook TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA notebook TO service_role;

-- Future tables/sequences in the schema inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA notebook
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA notebook
  GRANT USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA notebook
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA notebook
  GRANT ALL ON SEQUENCES TO service_role;
