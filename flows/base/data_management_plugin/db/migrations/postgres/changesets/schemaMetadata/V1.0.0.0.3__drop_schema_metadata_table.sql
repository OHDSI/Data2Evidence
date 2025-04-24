--liquibase formatted sql
--changeset alp:V1.0.0.0.3__drop_schema_metadata_table

DROP TABLE IF EXISTS schema_metadata CASCADE;