--liquibase formatted sql
--changeset alp:V1.0.0.1.5__update_cohort_definition_table.sql

-- Create sequence for cohort definition id
CREATE SEQUENCE COHORT_DEFINITION_ID_SEQ
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

ALTER TABLE cohort_definition
ALTER COLUMN definition_type_concept_id DROP NOT NULL,
ALTER COLUMN subject_concept_id DROP NOT NULL;