--liquibase formatted sql
--changeset alp:V1.0.0.0.1__drop_schema_metadata_table.sql

DROP TABLE IF EXISTS
    "SCHEMA.METADATA"
CASCADE;