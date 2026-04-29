--liquibase formatted sql
--changeset alp:V5.3.1.1.5__observation_value_as_date

ALTER TABLE OBSERVATION ALTER ("VALUE_AS_DATETIME" date);