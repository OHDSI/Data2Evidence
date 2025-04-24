--liquibase formatted sql
--changeset alp:V5.4.1.2.5__drop_vocab_schema

ALTER TABLE "CDM_SOURCE" DROP ("VOCABULARY_SCHEMA");