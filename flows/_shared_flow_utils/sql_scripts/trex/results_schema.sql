CREATE TABLE ${RESULTS_SCHEMA}.cohort (
	cohort_definition_id integer NOT NULL,
	subject_id integer NOT NULL,
	cohort_start_date date NOT NULL,
	cohort_end_date date NOT NULL 
);

CREATE TABLE ${RESULTS_SCHEMA}.cohort_definition (
	cohort_definition_id integer NOT NULL,
	cohort_definition_name varchar(255) NOT NULL,
	cohort_definition_description TEXT NULL,
	definition_type_concept_id integer NOT NULL,
	cohort_definition_syntax TEXT NULL,
	subject_concept_id integer NOT NULL,
	cohort_initiation_date date NULL
);