--liquibase formatted sql
--changeset alp:V1.0.0.1.3__alter_extension_valuestring_column

ALTER TABLE "GDM.RESEARCH_SUBJECT" ALTER (EXTENSION_VALUESTRING VARCHAR(50) NULL);