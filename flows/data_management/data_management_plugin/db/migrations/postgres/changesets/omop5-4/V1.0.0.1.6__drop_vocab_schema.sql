--liquibase formatted sql
--changeset alp:V1.0.0.1.6__drop_vocab_schema

ALTER TABLE cdm_source
DROP COLUMN vocabulary_schema;