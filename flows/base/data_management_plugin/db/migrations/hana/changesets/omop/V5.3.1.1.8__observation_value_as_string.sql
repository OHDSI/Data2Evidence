--liquibase formatted sql
--changeset alp:V5.3.1.1.8__observation_value_as_string

ALTER TABLE OBSERVATION ALTER ("VALUE_AS_STRING" VARCHAR(500));