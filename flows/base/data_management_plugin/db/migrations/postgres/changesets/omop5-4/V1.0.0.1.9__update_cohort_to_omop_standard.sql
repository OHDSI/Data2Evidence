--liquibase formatted sql
--changeset alp:V1.0.0.1.9__update_cohort_to_omop_standard
-- Drop owner and cohort_modification_date column

ALTER TABLE cohort_definition
DROP COLUMN cohort_modification_date,
DROP COLUMN owner;

-- Set null values to 0
UPDATE cohort_definition
SET
    definition_type_concept_id = 0
WHERE
    definition_type_concept_id IS NULL;

-- Set null values to 0
UPDATE cohort_definition
SET
    subject_concept_id = 0
WHERE
    subject_concept_id IS NULL;

-- Set definition_type_concept_id and subject_concept_id to NOT NULL
ALTER TABLE cohort_definition
ALTER COLUMN definition_type_concept_id
SET
    NOT NULL,
ALTER COLUMN subject_concept_id
SET
    NOT NULL;

-- Alter cohort_initiation_date from timestamp to date
ALTER TABLE cohort_definition
ALTER COLUMN cohort_initiation_date TYPE DATE;

-- Drop default which uses sequence
ALTER TABLE cohort_definition
ALTER COLUMN cohort_definition_id
DROP DEFAULT;

-- Drop sequence 
DROP SEQUENCE cohort_definition_id_seq;

-- Alter cohort table to set timestamp columns to date, and set cohort_end_date to NOT NULL
ALTER TABLE cohort
ALTER COLUMN cohort_start_date TYPE DATE,
ALTER COLUMN cohort_end_date TYPE DATE,
ALTER COLUMN cohort_end_date
SET
    NOT NULL;