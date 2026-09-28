#!/bin/sh
set -eu
# jupyterhub creates a pg user > pg
# notebook tries to read db > pg

# creates jupyter_broker (password: JUPYTER_DB_BROKER_PASSWORD), which the hub uses to create temporary jh_ users
psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=broker_password="$JUPYTER_DB_BROKER_PASSWORD" <<'SQL'
CREATE ROLE jupyter_poc_reader NOLOGIN;
CREATE ROLE jupyter_broker LOGIN CREATEROLE PASSWORD :'broker_password';
GRANT jupyter_poc_reader TO jupyter_broker WITH ADMIN OPTION;

CREATE SCHEMA jupyter_private AUTHORIZATION postgres;
CREATE SCHEMA jupyter_views AUTHORIZATION postgres;

CREATE TABLE jupyter_private.demo_patient (
  patient_id integer PRIMARY KEY,
  cohort_name text NOT NULL,
  observation_count integer NOT NULL
);

INSERT INTO jupyter_private.demo_patient VALUES
  (1001, 'demo-diabetes', 12),
  (1002, 'demo-cardiology', 7),
  (1003, 'demo-oncology', 3);

CREATE VIEW jupyter_views.demo_patient_summary
WITH (security_barrier = true)
AS
SELECT patient_id, cohort_name, observation_count
FROM jupyter_private.demo_patient;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA jupyter_private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA jupyter_private FROM PUBLIC;
REVOKE ALL ON SCHEMA jupyter_views FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA jupyter_views FROM PUBLIC;

GRANT CONNECT ON DATABASE jupyter_poc TO jupyter_poc_reader;
GRANT USAGE ON SCHEMA jupyter_views TO jupyter_poc_reader;
GRANT SELECT ON jupyter_views.demo_patient_summary TO jupyter_poc_reader;
SQL
