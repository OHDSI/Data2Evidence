#!/bin/sh
# [FLOW-5] first start only: schemas allowed/secret/schema_b, login roles jupyter_test(_b) with one SELECT grant each
# runs once on an empty data volume
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" \
  --set=logto_password="$LOGTO_DB_PASSWORD" <<'SQL'
-- Logto's own storage
-- CREATEROLE: Logto's seed creates its own per-tenant roles
CREATE ROLE logto LOGIN CREATEROLE PASSWORD :'logto_password';
CREATE DATABASE logto OWNER logto;

-- the PoC database
CREATE DATABASE poc;
REVOKE CONNECT ON DATABASE poc FROM PUBLIC;

-- login role for Logto users holding `jupyter-test`; no password, OAuth only
CREATE ROLE jupyter_test LOGIN;
GRANT CONNECT ON DATABASE poc TO jupyter_test;

-- second login role, for users holding `jupyter-test-b`; sees only schema_b
CREATE ROLE jupyter_test_b LOGIN;
GRANT CONNECT ON DATABASE poc TO jupyter_test_b;
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname poc <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA allowed;
CREATE SCHEMA secret;

CREATE TABLE allowed.demo (id int PRIMARY KEY, label text);
CREATE TABLE allowed.hidden (id int PRIMARY KEY, label text);
CREATE TABLE secret.demo (id int PRIMARY KEY, label text);
INSERT INTO allowed.demo VALUES (1, 'visible-1'), (2, 'visible-2');
INSERT INTO allowed.hidden VALUES (1, 'same schema, no grant');
INSERT INTO secret.demo VALUES (1, 'other schema, no grant');

-- the only access jupyter_test gets: one table in one schema
GRANT USAGE ON SCHEMA allowed TO jupyter_test;
GRANT SELECT ON allowed.demo TO jupyter_test;

-- schema_b belongs to jupyter_test_b only
CREATE SCHEMA schema_b;
CREATE TABLE schema_b.demo (id int PRIMARY KEY, label text);
INSERT INTO schema_b.demo VALUES (1, 'schema b row');
GRANT USAGE ON SCHEMA schema_b TO jupyter_test_b;
GRANT SELECT ON schema_b.demo TO jupyter_test_b;
SQL
