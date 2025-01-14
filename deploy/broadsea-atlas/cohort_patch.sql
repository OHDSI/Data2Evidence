SET
  search_path TO demo_cdm;

-- Add cohort_modification_date and owner columns
ALTER TABLE cohort_definition ADD cohort_modification_date TIMESTAMP NULL;

ALTER TABLE cohort_definition ADD owner VARCHAR(255) NOT NULL;

-- Drop NOT NULL for definition_type_concept_id and subject_concept_id
ALTER TABLE cohort_definition
ALTER COLUMN definition_type_concept_id
DROP NOT NULL,
ALTER COLUMN subject_concept_id
DROP NOT NULL;

-- Alter cohort_initiation_date from date to timestamp
ALTER TABLE cohort_definition
ALTER COLUMN cohort_initiation_date TYPE TIMESTAMP;

-- Add sequence for cohort_definition_id
CREATE SEQUENCE IF NOT EXISTS cohort_definition_id_seq START
WITH
  1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

ALTER TABLE cohort_definition
ALTER COLUMN cohort_definition_id
SET DEFAULT nextval ('cohort_definition_id_seq');

-- Create cohort table
CREATE TABLE
  IF NOT EXISTS cohort (
    cohort_definition_id integer NOT NULL,
    subject_id integer NOT NULL,
    cohort_start_date timestamp NOT NULL,
    cohort_end_date timestamp NULL
  );

-- Update cdm_version value in cdm_source
UPDATE cdm_source
SET
  cdm_version = 'v5.3'
WHERE
  cdm_version = 'v5.3.1';