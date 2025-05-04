--liquibase formatted sql
--changeset alp:V5.3.1.1.4__observation_source_value

ALTER TABLE OBSERVATION ALTER ("OBSERVATION_SOURCE_VALUE" VARCHAR(150));