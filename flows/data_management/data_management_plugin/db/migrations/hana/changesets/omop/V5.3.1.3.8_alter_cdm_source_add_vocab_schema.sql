--liquibase formatted sql
--changeset alp:V5.3.1.3.8_alter_cdm_source_add_vocab_schema.sql

ALTER TABLE "CDM_SOURCE" ADD ("VOCABULARY_SCHEMA" VARCHAR(255) DEFAULT '${VOCAB_SCHEMA}');