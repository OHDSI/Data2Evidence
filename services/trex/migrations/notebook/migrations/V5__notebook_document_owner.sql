-- V5: notebooks belong to the user who created them.
--
-- Until now any signed-in user could overwrite, rename or delete every notebook
-- through GraphQL: V3 grants `authenticated` unscoped CRUD on notebook.* and
-- nothing set or checked created_by. In a training session that means one
-- participant's Save replaces the notebook for everybody.
--
-- After this migration, for the `authenticated` role (every non-admin user):
--   * all notebooks stay readable, so shared notebooks can still be opened,
--     run and duplicated;
--   * a new notebook is owned by its creator, whatever created_by the client
--     sends;
--   * only the owner can update or delete it. Delete is a soft delete, i.e. an
--     UPDATE of deleted_at, so the UPDATE policy covers it too.
-- Notebooks with no owner (created_by NULL: everything that existed before
-- this migration, and anything inserted directly in SQL) are read-only for
-- `authenticated`. They act as shared templates that users duplicate.
--
-- Admins are unaffected. /trex-token gives system admins trex_role "admin",
-- which trex maps to service_role, and service_role has BYPASSRLS. Migrations
-- and direct SQL run as the table owner, which RLS does not apply to either.

-- trex subjects are opaque strings, not UUIDs, so a UUID column could never
-- hold the id trex puts in app.user_id. No row has a value yet, so the cast
-- loses nothing.
ALTER TABLE notebook.document ALTER COLUMN created_by TYPE TEXT USING created_by::text;

-- The signed-in user, as trex's auth-context sets it per GraphQL request.
-- NULL when there is no user, so `created_by = notebook.current_user_id()`
-- never matches an unowned row.
CREATE OR REPLACE FUNCTION notebook.current_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;

-- Ownership is assigned by the server and cannot be changed through the API.
-- Applies only to `authenticated`, so admins and SQL sessions can still assign
-- or clear an owner.
CREATE OR REPLACE FUNCTION notebook.document_set_owner() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.created_by := notebook.current_user_id();
    ELSE
      NEW.created_by := OLD.created_by;
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS document_set_owner ON notebook.document;
CREATE TRIGGER document_set_owner
  BEFORE INSERT OR UPDATE ON notebook.document
  FOR EACH ROW EXECUTE FUNCTION notebook.document_set_owner();

ALTER TABLE notebook.document ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_select ON notebook.document;
CREATE POLICY document_select ON notebook.document
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS document_insert ON notebook.document;
CREATE POLICY document_insert ON notebook.document
  FOR INSERT TO authenticated
  WITH CHECK (created_by = notebook.current_user_id());

DROP POLICY IF EXISTS document_update ON notebook.document;
CREATE POLICY document_update ON notebook.document
  FOR UPDATE TO authenticated
  USING (created_by = notebook.current_user_id())
  WITH CHECK (created_by = notebook.current_user_id());

DROP POLICY IF EXISTS document_delete ON notebook.document;
CREATE POLICY document_delete ON notebook.document
  FOR DELETE TO authenticated
  USING (created_by = notebook.current_user_id());

-- Exposed by PostGraphile as the computed field NotebookDocument.canEdit, so
-- the notebook UI can offer Duplicate instead of a Save that would be refused.
-- Mirrors the policies above: true for anyone RLS does not restrict. The
-- COALESCE turns the NULL from an unowned row into false.
CREATE OR REPLACE FUNCTION notebook.document_can_edit(d notebook.document) RETURNS boolean
  LANGUAGE sql STABLE
  AS $$ SELECT current_user <> 'authenticated'
            OR COALESCE(d.created_by = notebook.current_user_id(), false) $$;

GRANT EXECUTE ON FUNCTION notebook.current_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notebook.document_can_edit(notebook.document) TO authenticated, service_role;
