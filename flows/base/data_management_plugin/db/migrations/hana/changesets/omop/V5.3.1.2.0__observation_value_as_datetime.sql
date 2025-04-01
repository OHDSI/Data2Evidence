--liquibase formatted sql
--changeset alp:V5.3.1.2.0__observation_value_as_datetime

ALTER TABLE "OBSERVATION" ALTER ("VALUE_AS_DATETIME" TIMESTAMP);