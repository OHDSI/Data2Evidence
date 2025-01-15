SET
  search_path TO demo_cdm;

-- Create cohort table
CREATE TABLE
  IF NOT EXISTS cohort (
    cohort_definition_id integer NOT NULL,
    subject_id integer NOT NULL,
    cohort_start_date DATE NOT NULL,
    cohort_end_date DATE NOT NULL
  );