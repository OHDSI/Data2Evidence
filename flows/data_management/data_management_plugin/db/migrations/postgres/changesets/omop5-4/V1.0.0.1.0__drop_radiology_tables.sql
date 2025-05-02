--liquibase formatted sql
--changeset alp:V1.0.0.1.0__drop_radiology_tables

DROP TABLE IF EXISTS "RADIOLOGY_IMAGE", "RADIOLOGY_OCCURRENCE" CASCADE;