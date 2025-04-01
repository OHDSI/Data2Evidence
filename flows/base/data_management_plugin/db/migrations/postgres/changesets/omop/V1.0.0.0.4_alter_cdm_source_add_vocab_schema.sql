--liquibase formatted sql
--changeset alp:V1.0.0.0.4_alter_cdm_source_add_vocab_schema.sql
--validChecksum: 8:bc37ccd8889268de494dcc10aff7a50e

ALTER TABLE "CDM_SOURCE" ADD "VOCABULARY_SCHEMA" VARCHAR(255) DEFAULT '${VOCAB_SCHEMA}';
