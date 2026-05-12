--liquibase formatted sql
--changeset alp:V1.0.0.1.7__update_cohort_definition_id_to_autoincrement

ALTER TABLE
    cohort_definition
ALTER COLUMN
    cohort_definition_id
SET
    DEFAULT nextval('cohort_definition_id_seq');


--rollback ALTER TABLE cohort_definition ALTER COLUMN cohort_definition_id DROP DEFAULT;
