--liquibase formatted sql
--changeset alp:V1.0.0.2.0__add_replica_identity
-- Add replica identity for cohort and cohort_definition
ALTER TABLE cohort REPLICA IDENTITY FULL;

ALTER TABLE cohort_definition REPLICA IDENTITY FULL;