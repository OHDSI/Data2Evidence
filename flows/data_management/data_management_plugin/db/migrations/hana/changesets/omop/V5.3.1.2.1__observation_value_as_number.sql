--liquibase formatted sql
--changeset alp:V5.3.1.2.1__observation_value_as_number

ALTER TABLE "OBSERVATION" ALTER ("VALUE_AS_NUMBER" FLOAT);