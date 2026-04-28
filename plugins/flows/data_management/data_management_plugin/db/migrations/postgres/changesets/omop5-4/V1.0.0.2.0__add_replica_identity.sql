--liquibase formatted sql
--changeset alp:V1.0.0.2.0__add_replica_identity onValidationFail:MARK_RAN
--validChecksum: 8:6ff0f790a390a1fa6695e40ded88659c
-- Add replica identity for cohort and cohort_definition
-- ALTER TABLE cohort REPLICA IDENTITY FULL;

-- ALTER TABLE cohort_definition REPLICA IDENTITY FULL;