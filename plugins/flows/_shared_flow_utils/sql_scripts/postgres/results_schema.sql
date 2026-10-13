CREATE TABLE ${RESULTS_SCHEMA}.cohort (
	cohort_definition_id integer NOT NULL,
	subject_id bigint NOT NULL,
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

-- WebAPI results tables, so Atlas can generate cohorts, characterizations,
-- incidence rates and pathways before Data Characterization has run. Kept in
-- sync with data_characterization_plugin/db/migrations/postgres/concept_hierarchy.sql,
-- which creates the same tables with IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_censor_stats (cohort_definition_id int NOT NULL,
  lost_count BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_inclusion (cohort_definition_id int NOT NULL,
  design_hash int NULL,
  rule_sequence int NOT NULL,
  name varchar(255) NULL,
  description varchar(1000) NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_inclusion_result (cohort_definition_id int NOT NULL,
  mode_id int NOT NULL,
  inclusion_rule_mask bigint NOT NULL,
  person_count bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_inclusion_stats (cohort_definition_id int NOT NULL,
  rule_sequence int NOT NULL,
  mode_id int NOT NULL,
  person_count bigint NOT NULL,
  gain_count bigint NOT NULL,
  person_total bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_summary_stats (cohort_definition_id int NOT NULL,
  mode_id int NOT NULL,
  base_count bigint NOT NULL,
  final_count bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_cache  (design_hash int NOT NULL,
	SUBJECT_ID bigint NOT NULL,
	cohort_start_date date NOT NULL,
	cohort_end_date date NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_censor_stats_cache  (design_hash int NOT NULL,
  lost_count BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_inclusion_result_cache  (design_hash int NOT NULL,
  mode_id int NOT NULL,
  inclusion_rule_mask bigint NOT NULL,
  person_count bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_inclusion_stats_cache  (design_hash int NOT NULL,
  rule_sequence int NOT NULL,
  mode_id int NOT NULL,
  person_count bigint NOT NULL,
  gain_count bigint NOT NULL,
  person_total bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_summary_stats_cache  (design_hash int NOT NULL,
  mode_id int NOT NULL,
  base_count bigint NOT NULL,
  final_count bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.feas_study_inclusion_stats (study_id int NOT NULL,
  rule_sequence int NOT NULL,
  name varchar(255) NOT NULL,
  person_count bigint NOT NULL,
  gain_count bigint NOT NULL,
  person_total bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.feas_study_index_stats (study_id int NOT NULL,
  person_count bigint NOT NULL,
  match_count bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.feas_study_result (study_id int NOT NULL,
  inclusion_rule_mask bigint NOT NULL,
  person_count bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.heracles_analysis
 (analysis_id int,
	analysis_name varchar(255),
	stratum_1_name varchar(255),
	stratum_2_name varchar(255),
	stratum_3_name varchar(255),
	stratum_4_name varchar(255),
	stratum_5_name varchar(255),
	analysis_type varchar(255)
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.HERACLES_HEEL_results 
 (cohort_definition_id int, 
  analysis_id INT, 
  HERACLES_HEEL_warning VARCHAR(255) 
);

--HINT PARTITION(cohort_definition_id int)
--HINT BUCKET(analysis_id, 64)
CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.heracles_results
 (cohort_definition_id int,
	analysis_id int,
	stratum_1 varchar(255),
	stratum_2 varchar(255),
	stratum_3 varchar(255),
	stratum_4 varchar(255),
	stratum_5 varchar(255),
	count_value bigint,
	last_update_time TIMESTAMP DEFAULT CURRENT_DATE
);

--HINT PARTITION(cohort_definition_id int)
--HINT BUCKET(analysis_id, 64)
CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.heracles_results_dist
 (cohort_definition_id int,
	analysis_id int,
	stratum_1 varchar(255),
	stratum_2 varchar(255),
	stratum_3 varchar(255),
	stratum_4 varchar(255),
	stratum_5 varchar(255),
	count_value bigint,
	min_value NUMERIC,
	max_value NUMERIC,
	avg_value NUMERIC,
	stdev_value NUMERIC,
	median_value NUMERIC,
	p10_value NUMERIC,
	p25_value NUMERIC,
	p75_value NUMERIC,
	p90_value NUMERIC,
	last_update_time TIMESTAMP DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.heracles_periods
 (period_id int,
  period_order int,
	period_name varchar(255),
  period_type varchar(50),
	period_start_date date,
	period_end_date date
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cohort_sample_element (cohort_sample_id int NOT NULL,
    rank_value int NOT NULL,
    person_id bigint NOT NULL,
    age int,
    gender_concept_id int
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.ir_analysis_dist  (analysis_id int NOT NULL,
  target_id int NOT NULL,
  outcome_id int NOT NULL,
  strata_sequence int NULL,
  dist_type int NOT NULL,
  total bigint NOT NULL,
  avg_value NUMERIC NOT NULL,
  std_dev NUMERIC NOT NULL,
  min_value int NOT NULL,
  p10_value int NOT NULL,
  p25_value int NOT NULL,
  median_value int NOT NULL,
  p75_value int NOT NULL,
  p90_value int NOT NULL,
  max_value int NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.ir_analysis_result (analysis_id int NOT NULL,
  target_id int NOT NULL,
  outcome_id int NOT NULL,
  strata_mask bigint NOT NULL,
  person_count bigint NOT NULL,
  time_at_risk bigint NOT NULL,
  cases bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.ir_analysis_strata_stats (analysis_id int NOT NULL,
  target_id int NOT NULL,
  outcome_id int NOT NULL,
  strata_sequence int NOT NULL,
  person_count bigint NOT NULL,
  time_at_risk bigint NOT NULL,
  cases bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.ir_strata (analysis_id int NOT NULL,
  strata_sequence int NOT NULL,
  name varchar(255) NULL,
  description varchar(1000) NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.cc_results
 (type VARCHAR(255) NOT NULL,
  fa_type VARCHAR(255) NOT NULL,
  cc_generation_id BIGINT NOT NULL,
  analysis_id INTEGER,
  analysis_name VARCHAR(1000),
  covariate_id BIGINT,
  covariate_name VARCHAR(1000),
  strata_id BIGINT,
  strata_name VARCHAR(1000),
  time_window VARCHAR(255),
  concept_id INTEGER NOT NULL,
  count_value BIGINT,
  avg_value DOUBLE PRECISION,
  stdev_value DOUBLE PRECISION,
  min_value DOUBLE PRECISION,
  p10_value DOUBLE PRECISION,
  p25_value DOUBLE PRECISION,
  median_value DOUBLE PRECISION,
  p75_value DOUBLE PRECISION,
  p90_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  cohort_definition_id BIGINT,
  aggregate_id INTEGER,
  aggregate_name VARCHAR(1000),
  missing_means_zero INTEGER
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.pathway_analysis_codes
 (pathway_analysis_generation_id BIGINT NOT NULL,
	code BIGINT NOT NULL,
	name VARCHAR(2000) NOT NULL,
	is_combo int NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.pathway_analysis_events
 (pathway_analysis_generation_id BIGINT NOT NULL,
	target_cohort_id INTEGER NOT NULL,
	combo_id BIGINT NOT NULL,
	subject_id BIGINT NOT NULL,
	ordinal INTEGER,
	cohort_start_date TIMESTAMP NOT NULL,
	cohort_end_date TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.pathway_analysis_paths
 (pathway_analysis_generation_id BIGINT NOT NULL,
  target_cohort_id INTEGER NOT NULL,
  step_1 BIGINT,
  step_2 BIGINT,
  step_3 BIGINT,
  step_4 BIGINT,
  step_5 BIGINT,
  step_6 BIGINT,
  step_7 BIGINT,
  step_8 BIGINT,
  step_9 BIGINT,
  step_10 BIGINT,
  count_value BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS ${RESULTS_SCHEMA}.pathway_analysis_stats
 (pathway_analysis_generation_id BIGINT NOT NULL,
  target_cohort_id INTEGER NOT NULL,
  target_cohort_count BIGINT NOT NULL,
  pathways_count BIGINT NOT NULL
);
