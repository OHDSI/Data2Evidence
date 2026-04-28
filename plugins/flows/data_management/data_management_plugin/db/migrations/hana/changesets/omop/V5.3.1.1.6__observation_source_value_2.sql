--liquibase formatted sql
--changeset alp:V5.3.1.1.6__observation_source_value_2

ALTER TABLE OBSERVATION ALTER ("OBSERVATION_SOURCE_VALUE" VARCHAR(300));