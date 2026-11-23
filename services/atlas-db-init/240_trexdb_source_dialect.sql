-- Move sources registered under the pre-rename "trexsql" dialect to "trexdb"
-- (idempotent, runs on every startup). WebAPI only knows "trexdb"; a source left
-- on "trexsql" throws "Unsupported data source dialect" on every use.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'webapi' AND table_name = 'source'
    ) THEN
        RAISE NOTICE 'webapi.source not found, skipping trexdb dialect rename';
        RETURN;
    END IF;

    UPDATE webapi.source
    SET source_dialect = 'trexdb',
        source_connection = regexp_replace(source_connection, '^jdbc:trexsql:', 'jdbc:trexdb:')
    WHERE source_dialect = 'trexsql';
END $$;
