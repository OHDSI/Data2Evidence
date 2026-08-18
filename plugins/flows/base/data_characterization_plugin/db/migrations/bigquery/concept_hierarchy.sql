/*******************************************************************************
 * BigQuery Standard SQL variant of the Achilles/WebAPI results-schema DDL and
 * the concept_hierarchy / heracles_analysis / heracles_periods population.
 *
 * Derived from db/migrations/postgres/concept_hierarchy.sql. Dialect deltas:
 *   - VARCHAR(n) -> STRING, INT/INTEGER/BIGINT -> INT64,
 *     DOUBLE PRECISION -> FLOAT64 (BigQuery rejects the postgres aliases).
 *   - No explicit "NULL" column constraint (BigQuery only has NOT NULL).
 *   - TIMESTAMP DEFAULT CURRENT_DATE -> CURRENT_TIMESTAMP() (type must match).
 *   - No CREATE INDEX: BigQuery has no secondary indexes.
 *   - No ANALYZE: BigQuery has no manual statistics collection.
 *   - No TEMP tables. The flow ships this script statement-by-statement (it is
 *     split on the statement separator), so each statement is its own BigQuery
 *     job and a temp/session table would not survive between them. The heracles_periods working tables
 *     are therefore permanent scratch tables in ${DATA_CHARACTERIZATION_SCHEMA},
 *     created with CREATE OR REPLACE TABLE and dropped at the end of the script.
 *   - Date construction/arithmetic uses DATE(y,m,d) and DATE_ADD(..., INTERVAL n
 *     part) instead of TO_DATE(TO_CHAR(...)) and "+ n*INTERVAL'1 day'".
 *
 * Placeholders (string.Template safe_substitute, same names as the other
 * dialects): ${DATA_CHARACTERIZATION_SCHEMA}, ${VOCAB_SCHEMA}.
 *******************************************************************************/

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort
 (COHORT_DEFINITION_ID INT64 NOT NULL,
	SUBJECT_ID INT64 NOT NULL,
	cohort_start_date date NOT NULL,
	cohort_end_date date NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_censor_stats (cohort_definition_id INT64 NOT NULL,
  lost_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_inclusion (cohort_definition_id INT64 NOT NULL,
  design_hash INT64,
  rule_sequence INT64 NOT NULL,
  name STRING,
  description STRING
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_inclusion_result (cohort_definition_id INT64 NOT NULL,
  mode_id INT64 NOT NULL,
  inclusion_rule_mask INT64 NOT NULL,
  person_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_inclusion_stats (cohort_definition_id INT64 NOT NULL,
  rule_sequence INT64 NOT NULL,
  mode_id INT64 NOT NULL,
  person_count INT64 NOT NULL,
  gain_count INT64 NOT NULL,
  person_total INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_summary_stats (cohort_definition_id INT64 NOT NULL,
  mode_id INT64 NOT NULL,
  base_count INT64 NOT NULL,
  final_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_cache  (design_hash INT64 NOT NULL,
	SUBJECT_ID INT64 NOT NULL,
	cohort_start_date date NOT NULL,
	cohort_end_date date NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_censor_stats_cache  (design_hash INT64 NOT NULL,
  lost_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_inclusion_result_cache  (design_hash INT64 NOT NULL,
  mode_id INT64 NOT NULL,
  inclusion_rule_mask INT64 NOT NULL,
  person_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_inclusion_stats_cache  (design_hash INT64 NOT NULL,
  rule_sequence INT64 NOT NULL,
  mode_id INT64 NOT NULL,
  person_count INT64 NOT NULL,
  gain_count INT64 NOT NULL,
  person_total INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_summary_stats_cache  (design_hash INT64 NOT NULL,
  mode_id INT64 NOT NULL,
  base_count INT64 NOT NULL,
  final_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.feas_study_inclusion_stats (study_id INT64 NOT NULL,
  rule_sequence INT64 NOT NULL,
  name STRING NOT NULL,
  person_count INT64 NOT NULL,
  gain_count INT64 NOT NULL,
  person_total INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.feas_study_index_stats (study_id INT64 NOT NULL,
  person_count INT64 NOT NULL,
  match_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.feas_study_result (study_id INT64 NOT NULL,
  inclusion_rule_mask INT64 NOT NULL,
  person_count INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.heracles_analysis
 (analysis_id INT64,
	analysis_name STRING,
	stratum_1_name STRING,
	stratum_2_name STRING,
	stratum_3_name STRING,
	stratum_4_name STRING,
	stratum_5_name STRING,
	analysis_type STRING
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.heracles_heel_results 
 (cohort_definition_id INT64, 
  analysis_id INT64, 
  HERACLES_HEEL_warning STRING 
);

--HINT PARTITION(cohort_definition_id INT64)
--HINT BUCKET(analysis_id, 64)
CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.heracles_results
 (cohort_definition_id INT64,
	analysis_id INT64,
	stratum_1 STRING,
	stratum_2 STRING,
	stratum_3 STRING,
	stratum_4 STRING,
	stratum_5 STRING,
	count_value INT64,
	last_update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

--HINT PARTITION(cohort_definition_id INT64)
--HINT BUCKET(analysis_id, 64)
CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.heracles_results_dist
 (cohort_definition_id INT64,
	analysis_id INT64,
	stratum_1 STRING,
	stratum_2 STRING,
	stratum_3 STRING,
	stratum_4 STRING,
	stratum_5 STRING,
	count_value INT64,
	min_value NUMERIC,
	max_value NUMERIC,
	avg_value NUMERIC,
	stdev_value NUMERIC,
	median_value NUMERIC,
	p10_value NUMERIC,
	p25_value NUMERIC,
	p75_value NUMERIC,
	p90_value NUMERIC,
	last_update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.heracles_periods
 (period_id INT64,
  period_order INT64,
	period_name STRING,
  period_type STRING,
	period_start_date date,
	period_end_date date
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cohort_sample_element (cohort_sample_id INT64 NOT NULL,
    rank_value INT64 NOT NULL,
    person_id INT64 NOT NULL,
    age INT64,
    gender_concept_id INT64
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.ir_analysis_dist  (analysis_id INT64 NOT NULL,
  target_id INT64 NOT NULL,
  outcome_id INT64 NOT NULL,
  strata_sequence INT64,
  dist_type INT64 NOT NULL,
  total INT64 NOT NULL,
  avg_value NUMERIC NOT NULL,
  std_dev NUMERIC NOT NULL,
  min_value INT64 NOT NULL,
  p10_value INT64 NOT NULL,
  p25_value INT64 NOT NULL,
  median_value INT64 NOT NULL,
  p75_value INT64 NOT NULL,
  p90_value INT64 NOT NULL,
  max_value INT64
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.ir_analysis_result (analysis_id INT64 NOT NULL,
  target_id INT64 NOT NULL,
  outcome_id INT64 NOT NULL,
  strata_mask INT64 NOT NULL,
  person_count INT64 NOT NULL,
  time_at_risk INT64 NOT NULL,
  cases INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.ir_analysis_strata_stats (analysis_id INT64 NOT NULL,
  target_id INT64 NOT NULL,
  outcome_id INT64 NOT NULL,
  strata_sequence INT64 NOT NULL,
  person_count INT64 NOT NULL,
  time_at_risk INT64 NOT NULL,
  cases INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.ir_strata (analysis_id INT64 NOT NULL,
  strata_sequence INT64 NOT NULL,
  name STRING,
  description STRING
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.cc_results
 (type STRING NOT NULL,
  fa_type STRING NOT NULL,
  cc_generation_id INT64 NOT NULL,
  analysis_id INT64,
  analysis_name STRING,
  covariate_id INT64,
  covariate_name STRING,
  strata_id INT64,
  strata_name STRING,
  time_window STRING,
  concept_id INT64 NOT NULL,
  count_value INT64,
  avg_value FLOAT64,
  stdev_value FLOAT64,
  min_value FLOAT64,
  p10_value FLOAT64,
  p25_value FLOAT64,
  median_value FLOAT64,
  p75_value FLOAT64,
  p90_value FLOAT64,
  max_value FLOAT64,
  cohort_definition_id INT64,
  aggregate_id INT64,
  aggregate_name STRING,
  missing_means_zero INT64
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.pathway_analysis_codes
 (pathway_analysis_generation_id INT64 NOT NULL,
	code INT64 NOT NULL,
	name STRING NOT NULL,
	is_combo INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.pathway_analysis_events
 (pathway_analysis_generation_id INT64 NOT NULL,
	target_cohort_id INT64 NOT NULL,
	combo_id INT64 NOT NULL,
	subject_id INT64 NOT NULL,
	ordinal INT64,
	cohort_start_date TIMESTAMP NOT NULL,
	cohort_end_date TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.pathway_analysis_paths
 (pathway_analysis_generation_id INT64 NOT NULL,
  target_cohort_id INT64 NOT NULL,
  step_1 INT64,
  step_2 INT64,
  step_3 INT64,
  step_4 INT64,
  step_5 INT64,
  step_6 INT64,
  step_7 INT64,
  step_8 INT64,
  step_9 INT64,
  step_10 INT64,
  count_value INT64 NOT NULL
);

CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.pathway_analysis_stats
 (pathway_analysis_generation_id INT64 NOT NULL,
  target_cohort_id INT64 NOT NULL,
  target_cohort_count INT64 NOT NULL,
  pathways_count INT64 NOT NULL
);

/*********************************************************************/
/***** Create hierarchy lookup table for the treemap hierarchies *****/
/*********************************************************************/
CREATE TABLE IF NOT EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy
 (concept_id             INT64,
  concept_name           STRING,
  treemap                STRING,
  concept_hierarchy_type STRING,
  level1_concept_name    STRING,
  level2_concept_name    STRING,
  level3_concept_name    STRING,
  level4_concept_name    STRING
);

/***********************************************************/
/***** Populate the hierarchy lookup table per treemap *****/
/***********************************************************/
TRUNCATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy;

/********** CONDITION/CONDITION_ERA **********/
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy
	(concept_id, concept_name, treemap, concept_hierarchy_type, level1_concept_name, level2_concept_name, level3_concept_name, level4_concept_name)
SELECT
	snomed.concept_id,
  snomed.concept_name AS concept_name,
	CAST('Condition' AS STRING) AS treemap,
	CAST(NULL AS STRING) as concept_hierarchy_type,
	pt_to_hlt.pt_concept_name as level1_concept_name,
	hlt_to_hlgt.hlt_concept_name as level2_concept_name,
	hlgt_to_soc.hlgt_concept_name as level3_concept_name,
	soc.concept_name AS level4_concept_name
FROM (
	SELECT
		concept_id,
		concept_name
	FROM ${VOCAB_SCHEMA}.concept
	WHERE domain_id = 'Condition'
) snomed
LEFT JOIN (
	SELECT
		c1.concept_id      AS snomed_concept_id,
		max(c2.concept_id) AS pt_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.domain_id = 'Condition'
		AND ca1.min_levels_of_separation = 1
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'MedDRA'
	GROUP BY c1.concept_id
) snomed_to_pt ON snomed.concept_id = snomed_to_pt.snomed_concept_id
LEFT JOIN (
	SELECT
		c1.concept_id      AS pt_concept_id,
		c1.concept_name    AS pt_concept_name,
		max(c2.concept_id) AS hlt_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.vocabulary_id = 'MedDRA'
		AND ca1.min_levels_of_separation = 1
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'MedDRA'
	GROUP BY c1.concept_id, c1.concept_name
) pt_to_hlt ON snomed_to_pt.pt_concept_id = pt_to_hlt.pt_concept_id
LEFT JOIN (
	SELECT
		c1.concept_id      AS hlt_concept_id,
		c1.concept_name    AS hlt_concept_name,
		max(c2.concept_id) AS hlgt_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.vocabulary_id = 'MedDRA'
		AND ca1.min_levels_of_separation = 1
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'MedDRA'
	GROUP BY c1.concept_id, c1.concept_name
) hlt_to_hlgt ON pt_to_hlt.hlt_concept_id = hlt_to_hlgt.hlt_concept_id
LEFT JOIN (
	SELECT
		c1.concept_id      AS hlgt_concept_id,
		c1.concept_name    AS hlgt_concept_name,
		max(c2.concept_id) AS soc_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.vocabulary_id = 'MedDRA'
		AND ca1.min_levels_of_separation = 1
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'MedDRA'
	GROUP BY c1.concept_id, c1.concept_name
) hlgt_to_soc ON hlt_to_hlgt.hlgt_concept_id = hlgt_to_soc.hlgt_concept_id
LEFT JOIN ${VOCAB_SCHEMA}.concept soc ON hlgt_to_soc.soc_concept_id = soc.concept_id;

/********** DRUG **********/
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy
	(concept_id, concept_name, treemap, concept_hierarchy_type, level1_concept_name, level2_concept_name, level3_concept_name, level4_concept_name)
SELECT
	rxnorm.concept_id,
	rxnorm.concept_name AS concept_name,
	CAST('Drug' AS STRING) AS treemap,
	CAST(NULL AS STRING) as concept_hierarchy_type,
	rxnorm.rxnorm_ingredient_concept_name as level1_concept_name,
	atc5_to_atc3.atc5_concept_name as level2_concept_name,
	atc3_to_atc1.atc3_concept_name as level3_concept_name,
	atc1.concept_name AS level4_concept_name
FROM (
	SELECT
		c1.concept_id,
		c1.concept_name,
		c2.concept_id   AS rxnorm_ingredient_concept_id,
		c2.concept_name AS RxNorm_ingredient_concept_name
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.domain_id = 'Drug'
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.domain_id = 'Drug'
		AND c2.concept_class_id = 'Ingredient'
) rxnorm
LEFT JOIN (
	SELECT
		c1.concept_id      AS rxnorm_ingredient_concept_id,
		max(c2.concept_id) AS atc5_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.domain_id = 'Drug'
		AND c1.concept_class_id = 'Ingredient'
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'ATC'
		AND c2.concept_class_id = 'ATC 4th'
	GROUP BY c1.concept_id
) rxnorm_to_atc5 ON rxnorm.rxnorm_ingredient_concept_id = rxnorm_to_atc5.rxnorm_ingredient_concept_id
LEFT JOIN (
	SELECT
		c1.concept_id      AS atc5_concept_id,
		c1.concept_name    AS atc5_concept_name,
		max(c2.concept_id) AS atc3_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.vocabulary_id = 'ATC'
		AND c1.concept_class_id = 'ATC 4th'
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'ATC'
		AND c2.concept_class_id = 'ATC 2nd'
	GROUP BY c1.concept_id, c1.concept_name
) atc5_to_atc3 ON rxnorm_to_atc5.atc5_concept_id = atc5_to_atc3.atc5_concept_id
LEFT JOIN (
	SELECT
		c1.concept_id      AS atc3_concept_id,
		c1.concept_name    AS atc3_concept_name,
		max(c2.concept_id) AS atc1_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.vocabulary_id = 'ATC'
		AND c1.concept_class_id = 'ATC 2nd'
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'ATC'
		AND c2.concept_class_id = 'ATC 1st'
	GROUP BY c1.concept_id, c1.concept_name
) atc3_to_atc1 ON atc5_to_atc3.atc3_concept_id = atc3_to_atc1.atc3_concept_id
LEFT JOIN ${VOCAB_SCHEMA}.concept atc1 ON atc3_to_atc1.atc1_concept_id = atc1.concept_id;

/********** DRUG_ERA **********/
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy
	(concept_id, concept_name, treemap, concept_hierarchy_type, level1_concept_name, level2_concept_name, level3_concept_name, level4_concept_name)
SELECT
	rxnorm.rxnorm_ingredient_concept_id as concept_id,
	rxnorm.rxnorm_ingredient_concept_name as concept_name,
	CAST('Drug Era' AS STRING) AS treemap,
	CAST(NULL AS STRING) as concept_hierarchy_type,
	atc5_to_atc3.atc5_concept_name as level1_concept_name,
	atc3_to_atc1.atc3_concept_name as level2_concept_name,
	atc1.concept_name AS level3_concept_name,
	CAST(NULL AS STRING) as level4_concept_name
FROM (
	SELECT
		c2.concept_id   AS rxnorm_ingredient_concept_id,
		c2.concept_name AS RxNorm_ingredient_concept_name
	FROM ${VOCAB_SCHEMA}.concept c2
	WHERE c2.domain_id = 'Drug'
		AND c2.concept_class_id = 'Ingredient'
) rxnorm
LEFT JOIN (
	SELECT
		c1.concept_id      AS rxnorm_ingredient_concept_id,
		max(c2.concept_id) AS atc5_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.domain_id = 'Drug'
		AND c1.concept_class_id = 'Ingredient'
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'ATC'
		AND c2.concept_class_id = 'ATC 4th'
	GROUP BY c1.concept_id
) rxnorm_to_atc5 ON rxnorm.rxnorm_ingredient_concept_id = rxnorm_to_atc5.rxnorm_ingredient_concept_id
LEFT JOIN (
	SELECT
		c1.concept_id      AS atc5_concept_id,
		c1.concept_name    AS atc5_concept_name,
		max(c2.concept_id) AS atc3_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.vocabulary_id = 'ATC'
		AND c1.concept_class_id = 'ATC 4th'
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'ATC'
		AND c2.concept_class_id = 'ATC 2nd'
	GROUP BY c1.concept_id, c1.concept_name
) atc5_to_atc3 ON rxnorm_to_atc5.atc5_concept_id = atc5_to_atc3.atc5_concept_id
LEFT JOIN (
	SELECT
		c1.concept_id      AS atc3_concept_id,
		c1.concept_name    AS atc3_concept_name,
		max(c2.concept_id) AS atc1_concept_id
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON c1.concept_id = ca1.descendant_concept_id
		AND c1.vocabulary_id = 'ATC'
		AND c1.concept_class_id = 'ATC 2nd'
	INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca1.ancestor_concept_id = c2.concept_id
		AND c2.vocabulary_id = 'ATC'
		AND c2.concept_class_id = 'ATC 1st'
	GROUP BY c1.concept_id, c1.concept_name
) atc3_to_atc1 ON atc5_to_atc3.atc3_concept_id = atc3_to_atc1.atc3_concept_id
LEFT JOIN ${VOCAB_SCHEMA}.concept atc1 ON atc3_to_atc1.atc1_concept_id = atc1.concept_id;

/********** MEASUREMENT **********/
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy
	(concept_id, concept_name, treemap, concept_hierarchy_type, level1_concept_name, level2_concept_name, level3_concept_name, level4_concept_name)
SELECT
	m.concept_id,
	m.concept_name AS concept_name,
	CAST('Measurement' AS STRING) AS treemap,
	CAST(NULL AS STRING) as concept_hierarchy_type,
	CAST(max(c1.concept_name) AS STRING) AS level1_concept_name,
	CAST(max(c2.concept_name) AS STRING) AS level2_concept_name,
	CAST(max(c3.concept_name) AS STRING) AS level3_concept_name,
	CAST(NULL AS STRING) as level4_concept_name
FROM (
	SELECT DISTINCT
		concept_id,
		concept_name
	FROM ${VOCAB_SCHEMA}.concept c
	WHERE domain_id = 'Measurement'
) m
LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON M.concept_id = ca1.DESCENDANT_CONCEPT_ID AND ca1.min_levels_of_separation = 1
LEFT JOIN ${VOCAB_SCHEMA}.concept c1 ON ca1.ANCESTOR_CONCEPT_ID = c1.concept_id
LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca2 ON c1.concept_id = ca2.DESCENDANT_CONCEPT_ID AND ca2.min_levels_of_separation = 1
LEFT JOIN ${VOCAB_SCHEMA}.concept c2 ON ca2.ANCESTOR_CONCEPT_ID = c2.concept_id
LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca3 ON c2.concept_id = ca3.DESCENDANT_CONCEPT_ID AND ca3.min_levels_of_separation = 1
LEFT JOIN ${VOCAB_SCHEMA}.concept c3 ON ca3.ANCESTOR_CONCEPT_ID = c3.concept_id
GROUP BY M.concept_id, M.concept_name;

/********** OBSERVATION **********/
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy
	(concept_id, concept_name, treemap, concept_hierarchy_type, level1_concept_name, level2_concept_name, level3_concept_name, level4_concept_name)
SELECT
	obs.concept_id,
	obs.concept_name AS concept_name,
	CAST('Observation' AS STRING) AS treemap,
	CAST(NULL AS STRING) as concept_hierarchy_type,
	CAST(max(c1.concept_name) AS STRING) AS level1_concept_name,
	CAST(max(c2.concept_name) AS STRING) AS level2_concept_name,
	CAST(max(c3.concept_name) AS STRING) AS level3_concept_name,
	CAST(NULL AS STRING) as level4_concept_name
FROM (
	SELECT
		concept_id,
		concept_name
	FROM ${VOCAB_SCHEMA}.concept
	WHERE domain_id = 'Observation'
) obs
LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca1 ON obs.concept_id = ca1.DESCENDANT_CONCEPT_ID AND ca1.min_levels_of_separation = 1
LEFT JOIN ${VOCAB_SCHEMA}.concept c1 ON ca1.ANCESTOR_CONCEPT_ID = c1.concept_id
LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca2 ON c1.concept_id = ca2.DESCENDANT_CONCEPT_ID AND ca2.min_levels_of_separation = 1
LEFT JOIN ${VOCAB_SCHEMA}.concept c2 ON ca2.ANCESTOR_CONCEPT_ID = c2.concept_id
LEFT JOIN ${VOCAB_SCHEMA}.concept_ancestor ca3 ON c2.concept_id = ca3.DESCENDANT_CONCEPT_ID AND ca3.min_levels_of_separation = 1
LEFT JOIN ${VOCAB_SCHEMA}.concept c3 ON ca3.ANCESTOR_CONCEPT_ID = c3.concept_id
GROUP BY obs.concept_id, obs.concept_name;

/********** PROCEDURE **********/
INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.concept_hierarchy
	(concept_id, concept_name, treemap, concept_hierarchy_type, level1_concept_name, level2_concept_name, level3_concept_name, level4_concept_name)
SELECT
	procs.concept_id,
	CAST(procs.proc_concept_name AS STRING) AS concept_name,
	CAST('Procedure' AS STRING) AS treemap,
	CAST(NULL AS STRING) as concept_hierarchy_type,
	CAST(max(proc_hierarchy.os3_concept_name) AS STRING) AS level1_concept_name,
	CAST(max(proc_hierarchy.os2_concept_name) AS STRING) AS level2_concept_name,
	CAST(max(proc_hierarchy.os1_concept_name) AS STRING) AS level3_concept_name,
	CAST(NULL AS STRING) as level4_concept_name
FROM
(
	SELECT
		c1.concept_id,
		CONCAT(v1.vocabulary_name, ' ', c1.concept_code, ': ', c1.concept_name) AS proc_concept_name
	FROM ${VOCAB_SCHEMA}.concept c1
	INNER JOIN ${VOCAB_SCHEMA}.vocabulary v1 ON c1.vocabulary_id = v1.vocabulary_id
	WHERE c1.domain_id = 'Procedure'
) procs
LEFT JOIN (
	SELECT
		ca0.DESCENDANT_CONCEPT_ID,
		max(ca0.ancestor_concept_id) AS ancestor_concept_id
	FROM ${VOCAB_SCHEMA}.concept_ancestor ca0
	INNER JOIN (
		SELECT DISTINCT c2.concept_id AS os3_concept_id
		FROM ${VOCAB_SCHEMA}.concept_ancestor ca1
		INNER JOIN ${VOCAB_SCHEMA}.concept c1 ON ca1.DESCENDANT_CONCEPT_ID = c1.concept_id
		INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca2 ON c1.concept_id = ca2.ANCESTOR_CONCEPT_ID
		INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca2.DESCENDANT_CONCEPT_ID = c2.concept_id
		WHERE ca1.ancestor_concept_id = 4040390
			AND ca1.Min_LEVELS_OF_SEPARATION = 2
			AND ca2.MIN_LEVELS_OF_SEPARATION = 1
	) t1 ON ca0.ANCESTOR_CONCEPT_ID = t1.os3_concept_id
	GROUP BY ca0.descendant_concept_id
) ca1 ON procs.concept_id = ca1.DESCENDANT_CONCEPT_ID
LEFT JOIN (
	SELECT
		proc_by_os1.os1_concept_name,
		proc_by_os2.os2_concept_name,
		proc_by_os3.os3_concept_name,
		proc_by_os3.os3_concept_id
	FROM (
		SELECT
			DESCENDANT_CONCEPT_ID AS os1_concept_id,
			concept_name          AS os1_concept_name
		FROM ${VOCAB_SCHEMA}.concept_ancestor ca1
		INNER JOIN ${VOCAB_SCHEMA}.concept c1 ON ca1.DESCENDANT_CONCEPT_ID = c1.concept_id
		WHERE ancestor_concept_id = 4040390
			AND Min_LEVELS_OF_SEPARATION = 1
	) proc_by_os1
	INNER JOIN (
		SELECT
			max(c1.CONCEPT_ID) AS os1_concept_id,
			c2.concept_id      AS os2_concept_id,
			c2.concept_name    AS os2_concept_name
		FROM ${VOCAB_SCHEMA}.concept_ancestor ca1
		INNER JOIN ${VOCAB_SCHEMA}.concept c1 ON ca1.DESCENDANT_CONCEPT_ID = c1.concept_id
		INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca2 ON c1.concept_id = ca2.ANCESTOR_CONCEPT_ID
		INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca2.DESCENDANT_CONCEPT_ID = c2.concept_id
		WHERE ca1.ancestor_concept_id = 4040390
			AND ca1.Min_LEVELS_OF_SEPARATION = 1
			AND ca2.MIN_LEVELS_OF_SEPARATION = 1
		GROUP BY c2.concept_id, c2.concept_name
	) proc_by_os2 ON proc_by_os1.os1_concept_id = proc_by_os2.os1_concept_id
	INNER JOIN (
		SELECT
			max(c1.CONCEPT_ID) AS os2_concept_id,
			c2.concept_id      AS os3_concept_id,
			c2.concept_name    AS os3_concept_name
		FROM ${VOCAB_SCHEMA}.concept_ancestor ca1
		INNER JOIN ${VOCAB_SCHEMA}.concept c1 ON ca1.DESCENDANT_CONCEPT_ID = c1.concept_id
		INNER JOIN ${VOCAB_SCHEMA}.concept_ancestor ca2 ON c1.concept_id = ca2.ANCESTOR_CONCEPT_ID
		INNER JOIN ${VOCAB_SCHEMA}.concept c2 ON ca2.DESCENDANT_CONCEPT_ID = c2.concept_id
		WHERE ca1.ancestor_concept_id = 4040390
			AND ca1.Min_LEVELS_OF_SEPARATION = 2
			AND ca2.MIN_LEVELS_OF_SEPARATION = 1
		GROUP BY c2.concept_id, c2.concept_name
	) proc_by_os3 ON proc_by_os2.os2_concept_id = proc_by_os3.os2_concept_id
) proc_hierarchy ON ca1.ancestor_concept_id = proc_hierarchy.os3_concept_id
GROUP BY procs.concept_id, procs.proc_concept_name;

-- init heracles_analysis
TRUNCATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.heracles_analysis;

insert into ${DATA_CHARACTERIZATION_SCHEMA}.heracles_analysis
(analysis_id,analysis_name,stratum_1_name,stratum_2_name,stratum_3_name,stratum_4_name,stratum_5_name,analysis_type)
select    0 as analysis_id,
CAST('Source name' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    1 as analysis_id,
CAST('Number of persons' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    2 as analysis_id,
CAST('Number of persons by gender' as STRING) as analysis_name,
CAST('gender_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    3 as analysis_id,
CAST('Number of persons by year of birth' as STRING) as analysis_name,
CAST('year_of_birth' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    4 as analysis_id,
CAST('Number of persons by race' as STRING) as analysis_name,
CAST('race_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    5 as analysis_id,
CAST('Number of persons by ethnicity' as STRING) as analysis_name,
CAST('ethnicity_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    7 as analysis_id,
CAST('Number of persons with invalid provider_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    8 as analysis_id,
CAST('Number of persons with invalid location_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select    9 as analysis_id,
CAST('Number of persons with invalid care_site_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PERSON' as STRING) as analysis_type
union all
select  101 as analysis_id,
CAST('Number of persons by age, with age at first observation period' as STRING) as analysis_name,
CAST('age' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  102 as analysis_id,
CAST('Number of persons by gender by age, with age at first observation period' as STRING) as analysis_name,
CAST('gender_concept_id' as STRING) as stratum_1_name,
CAST('age' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  103 as analysis_id,
CAST('Distribution of age at first observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  104 as analysis_id,
CAST('Distribution of age at first observation period by gender' as STRING) as analysis_name,
CAST('gender_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  105 as analysis_id,
CAST('Length of observation (days) of first observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  106 as analysis_id,
CAST('Length of observation (days) of first observation period by gender' as STRING) as analysis_name,
CAST('gender_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  107 as analysis_id,
CAST('Length of observation (days) of first observation period by age decile' as STRING) as analysis_name,
CAST('age decile' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  108 as analysis_id,
CAST('Number of persons by length of first observation period, in 30d increments' as STRING) as analysis_name,
CAST('Observation period length 30d increments' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  109 as analysis_id,
CAST('Number of persons with continuous observation in each year' as STRING) as analysis_name,
CAST('calendar year' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  110 as analysis_id,
CAST('Number of persons with continuous observation in each month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  111 as analysis_id,
CAST('Number of persons by observation period start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  112 as analysis_id,
CAST('Number of persons by observation period end month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  113 as analysis_id,
CAST('Number of persons by number of observation periods' as STRING) as analysis_name,
CAST('number of observation periods' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  114 as analysis_id,
CAST('Number of persons with observation period before year-of-birth' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  115 as analysis_id,
CAST('Number of persons with observation period end < observation period start' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  116 as analysis_id,
CAST('Number of persons with at least one day of observation in each year by gender and age decile' as STRING) as analysis_name,
CAST('calendar year' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST('age decile' as STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  117 as analysis_id,
CAST('Number of persons with at least one day of observation in each month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  200 as analysis_id,
CAST('Number of persons with at least one visit occurrence, by visit_concept_id' as STRING) as analysis_name,
CAST('visit_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  201 as analysis_id,
CAST('Number of visit occurrence records, by visit_concept_id' as STRING) as analysis_name,
CAST('visit_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  202 as analysis_id,
CAST('Number of persons by visit occurrence start month, by visit_concept_id' as STRING) as analysis_name,
CAST('visit_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  203 as analysis_id,
CAST('Number of distinct visit occurrence concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  204 as analysis_id,
CAST('Number of persons with at least one visit occurrence, by visit_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('visit_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  206 as analysis_id,
CAST('Distribution of age by visit_concept_id' as STRING) as analysis_name,
CAST('visit_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  207 as analysis_id,
CAST('Number of visit records with invalid person_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  208 as analysis_id,
CAST('Number of visit records outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  209 as analysis_id,
CAST('Number of visit records with end date < start date' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  210 as analysis_id,
CAST('Number of visit records with invalid care_site_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  211 as analysis_id,
CAST('Distribution of length of stay by visit_concept_id' as STRING) as analysis_name,
CAST('visit_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  220 as analysis_id,
CAST('Number of visit occurrence records by visit occurrence start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('VISITS' as STRING) as analysis_type
union all
select  400 as analysis_id,
CAST('Number of persons with at least one condition occurrence, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  401 as analysis_id,
CAST('Number of condition occurrence records, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  402 as analysis_id,
CAST('Number of persons by condition occurrence start month, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  403 as analysis_id,
CAST('Number of distinct condition occurrence concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  404 as analysis_id,
CAST('Number of persons with at least one condition occurrence, by condition_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  405 as analysis_id,
CAST('Number of condition occurrence records, by condition_concept_id by condition_type_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('condition_type_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  406 as analysis_id,
CAST('Distribution of age by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  409 as analysis_id,
CAST('Number of condition occurrence records with invalid person_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  410 as analysis_id,
CAST('Number of condition occurrence records outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  411 as analysis_id,
CAST('Number of condition occurrence records with end date < start date' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  412 as analysis_id,
CAST('Number of condition occurrence records with invalid provider_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  413 as analysis_id,
CAST('Number of condition occurrence records with invalid visit_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  420 as analysis_id,
CAST('Number of condition occurrence records by condition occurrence start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION' as STRING) as analysis_type
union all
select  500 as analysis_id,
CAST('Number of persons with death, by cause_of_death_concept_id' as STRING) as analysis_name,
CAST('cause_of_death_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  501 as analysis_id,
CAST('Number of records of death, by cause_of_death_concept_id' as STRING) as analysis_name,
CAST('cause_of_death_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  502 as analysis_id,
CAST('Number of persons by death month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  504 as analysis_id,
CAST('Number of persons with a death, by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('calendar year' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST('age decile' as STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  505 as analysis_id,
CAST('Number of death records, by death_type_concept_id' as STRING) as analysis_name,
CAST('death_type_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  506 as analysis_id,
CAST('Distribution of age at death by gender' as STRING) as analysis_name,
CAST('gender_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  509 as analysis_id,
CAST('Number of death records with invalid person_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  510 as analysis_id,
CAST('Number of death records outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  511 as analysis_id,
CAST('Distribution of time from death to last condition' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  512 as analysis_id,
CAST('Distribution of time from death to last drug' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  513 as analysis_id,
CAST('Distribution of time from death to last visit' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  514 as analysis_id,
CAST('Distribution of time from death to last procedure' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  515 as analysis_id,
CAST('Distribution of time from death to last observation' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DEATH' as STRING) as analysis_type
union all
select  600 as analysis_id,
CAST('Number of persons with at least one procedure occurrence, by procedure_concept_id' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  601 as analysis_id,
CAST('Number of procedure occurrence records, by procedure_concept_id' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  602 as analysis_id,
CAST('Number of persons by procedure occurrence start month, by procedure_concept_id' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  603 as analysis_id,
CAST('Number of distinct procedure occurrence concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  604 as analysis_id,
CAST('Number of persons with at least one procedure occurrence, by procedure_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  605 as analysis_id,
CAST('Number of procedure occurrence records, by procedure_concept_id by procedure_type_concept_id' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST('procedure_type_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  606 as analysis_id,
CAST('Distribution of age by procedure_concept_id' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  609 as analysis_id,
CAST('Number of procedure occurrence records with invalid person_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  610 as analysis_id,
CAST('Number of procedure occurrence records outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  612 as analysis_id,
CAST('Number of procedure occurrence records with invalid provider_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  613 as analysis_id,
CAST('Number of procedure occurrence records with invalid visit_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  620 as analysis_id,
CAST('Number of procedure occurrence records  by procedure occurrence start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('PROCEDURE' as STRING) as analysis_type
union all
select  700 as analysis_id,
CAST('Number of persons with at least one drug exposure, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  701 as analysis_id,
CAST('Number of drug exposure records, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  702 as analysis_id,
CAST('Number of persons by drug exposure start month, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  703 as analysis_id,
CAST('Number of distinct drug exposure concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  704 as analysis_id,
CAST('Number of persons with at least one drug exposure, by drug_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  705 as analysis_id,
CAST('Number of drug exposure records, by drug_concept_id by drug_type_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('drug_type_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  706 as analysis_id,
CAST('Distribution of age by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  709 as analysis_id,
CAST('Number of drug exposure records with invalid person_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  710 as analysis_id,
CAST('Number of drug exposure records outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  711 as analysis_id,
CAST('Number of drug exposure records with end date < start date' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  712 as analysis_id,
CAST('Number of drug exposure records with invalid provider_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  713 as analysis_id,
CAST('Number of drug exposure records with invalid visit_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  715 as analysis_id,
CAST('Distribution of days_supply by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  716 as analysis_id,
CAST('Distribution of refills by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  717 as analysis_id,
CAST('Distribution of quantity by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  720 as analysis_id,
CAST('Number of drug exposure records  by drug exposure start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG' as STRING) as analysis_type
union all
select  800 as analysis_id,
CAST('Number of persons with at least one observation occurrence, by observation_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  801 as analysis_id,
CAST('Number of observation occurrence records, by observation_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  802 as analysis_id,
CAST('Number of persons by observation occurrence start month, by observation_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  803 as analysis_id,
CAST('Number of distinct observation occurrence concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  804 as analysis_id,
CAST('Number of persons with at least one observation occurrence, by observation_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  805 as analysis_id,
CAST('Number of observation occurrence records, by observation_concept_id by observation_type_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST('observation_type_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  806 as analysis_id,
CAST('Distribution of age by observation_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  807 as analysis_id,
CAST('Number of observation occurrence records, by observation_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST('unit_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  809 as analysis_id,
CAST('Number of observation records with invalid person_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  810 as analysis_id,
CAST('Number of observation records outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  812 as analysis_id,
CAST('Number of observation records with invalid provider_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  813 as analysis_id,
CAST('Number of observation records with invalid visit_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  814 as analysis_id,
CAST('Number of observation records with no value (numeric, string, or concept)' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  815 as analysis_id,
CAST('Distribution of numeric values, by observation_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  816 as analysis_id,
CAST('Distribution of low range, by observation_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  817 as analysis_id,
CAST('Distribution of high range, by observation_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  818 as analysis_id,
CAST('Number of observation records below/within/above normal range, by observation_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  820 as analysis_id,
CAST('Number of observation records  by observation start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('OBSERVATION' as STRING) as analysis_type
union all
select  900 as analysis_id,
CAST('Number of persons with at least one drug era, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  901 as analysis_id,
CAST('Number of drug era records, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  902 as analysis_id,
CAST('Number of persons by drug era start month, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  903 as analysis_id,
CAST('Number of distinct drug era concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  904 as analysis_id,
CAST('Number of persons with at least one drug era, by drug_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  906 as analysis_id,
CAST('Distribution of age by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  907 as analysis_id,
CAST('Distribution of drug era length, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  908 as analysis_id,
CAST('Number of drug eras without valid person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  909 as analysis_id,
CAST('Number of drug eras outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  910 as analysis_id,
CAST('Number of drug eras with end date < start date' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select  920 as analysis_id,
CAST('Number of drug era records  by drug era start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('DRUG_ERA' as STRING) as analysis_type
union all
select 1000 as analysis_id,
CAST('Number of persons with at least one condition era, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1001 as analysis_id,
CAST('Number of condition era records, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1002 as analysis_id,
CAST('Number of persons by condition era start month, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1003 as analysis_id,
CAST('Number of distinct condition era concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1004 as analysis_id,
CAST('Number of persons with at least one condition era, by condition_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1006 as analysis_id,
CAST('Distribution of age by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1007 as analysis_id,
CAST('Distribution of condition era length, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1008 as analysis_id,
CAST('Number of condition eras without valid person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1009 as analysis_id,
CAST('Number of condition eras outside valid observation period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1010 as analysis_id,
CAST('Number of condition eras with end date < start date' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1020 as analysis_id,
CAST('Number of condition era records by condition era start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CONDITION_ERA' as STRING) as analysis_type
union all
select 1100 as analysis_id,
CAST('Number of persons by location 3-digit zip' as STRING) as analysis_name,
CAST('3-digit zip' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('LOCATION' as STRING) as analysis_type
union all
select 1101 as analysis_id,
CAST('Number of persons by location state' as STRING) as analysis_name,
CAST('state' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('LOCATION' as STRING) as analysis_type
union all
select 1200 as analysis_id,
CAST('Number of persons by place of service' as STRING) as analysis_name,
CAST('place_of_service_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CARE_SITE' as STRING) as analysis_type
union all
select 1201 as analysis_id,
CAST('Number of visits by place of service' as STRING) as analysis_name,
CAST('place_of_service_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('CARE_SITE' as STRING) as analysis_type
union all
select 1300 as analysis_id,
CAST('Number of persons with at least one measurement occurrence, by measurement_concept_id' as STRING) as analysis_name,
CAST('measurement_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1301 as analysis_id,
CAST('Number of measurement occurrence records, by measurement_concept_id' as STRING) as analysis_name,
CAST('measurement_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1302 as analysis_id,
CAST('Number of persons by measurement occurrence start month, by measurement_concept_id' as STRING) as analysis_name,
CAST('measurement_concept_id' as STRING) as stratum_1_name,
CAST('calendar month' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1303 as analysis_id,
CAST('Number of distinct measurement occurrence concepts per person' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1304 as analysis_id,
CAST('Number of persons with at least one measurement occurrence, by measurement_concept_id by calendar year by gender by age decile' as STRING) as analysis_name,
CAST('measurement_concept_id' as STRING) as stratum_1_name,
CAST('calendar year' as STRING) as stratum_2_name,
CAST('gender_concept_id' as STRING) as stratum_3_name,
CAST('age decile' as STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1305 as analysis_id,
CAST('Number of measurement occurrence records, by measurement_concept_id by measurement_type_concept_id' as STRING) as analysis_name,
CAST('measurement_concept_id' as STRING) as stratum_1_name,
CAST('measurement_type_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1306 as analysis_id,
CAST('Distribution of age by measurement_concept_id' as STRING) as analysis_name,
CAST('measurement_concept_id' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1307 as analysis_id,
CAST('Number of measurement occurrence records, by measurement_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST('measurement_concept_id' as STRING) as stratum_1_name,
CAST('unit_concept_id' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1309 as analysis_id,
CAST('Number of measurement records with invalid person_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1310 as analysis_id,
CAST('Number of measurement records outside valid measurement period' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1312 as analysis_id,
CAST('Number of measurement records with invalid provider_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1313 as analysis_id,
CAST('Number of measurement records with invalid visit_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1314 as analysis_id,
CAST('Number of measurement records with no value (numeric, string, or concept)' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1315 as analysis_id,
CAST('Distribution of numeric values, by measurement_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1316 as analysis_id,
CAST('Distribution of low range, by measurement_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1317 as analysis_id,
CAST('Distribution of high range, by measurement_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1318 as analysis_id,
CAST('Number of measurement records below/within/above normal range, by measurement_concept_id and unit_concept_id' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1320 as analysis_id,
CAST('Number of measurement records  by measurement start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('MEASUREMENT' as STRING) as analysis_type
union all
select 1700 as analysis_id,
CAST('Number of records by cohort_definition_id' as STRING) as analysis_name,
CAST('cohort_definition_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT' as STRING) as analysis_type
union all
select 1701 as analysis_id,
CAST('Number of records with cohort end date < cohort start date' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT' as STRING) as analysis_type
union all
select 1800 as analysis_id,
CAST('Number of persons by age, with age at cohort start' as STRING) as analysis_name,
CAST('age' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1801 as analysis_id,
CAST('Distribution of age at cohort start' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1802 as analysis_id,
CAST('Distribution of age at cohort start by gender' as STRING) as analysis_name,
CAST('gender_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1803 as analysis_id,
CAST('Distribution of age at cohort start by cohort start year' as STRING) as analysis_name,
CAST('calendar year' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1804 as analysis_id,
CAST('Number of persons by duration from cohort start to cohort end, in 30d increments' as STRING) as analysis_name,
CAST('Cohort period length 30d increments' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1805 as analysis_id,
CAST('Number of persons by duration from observation start to cohort start, in 30d increments' as STRING) as analysis_name,
CAST('Baseline period length 30d increments' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1806 as analysis_id,
CAST('Number of persons by duration from cohort start to observation end, in 30d increments' as STRING) as analysis_name,
CAST('Follow-up period length 30d increments' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1807 as analysis_id,
CAST('Number of persons by duration from cohort end to observation end, in 30d increments' as STRING) as analysis_name,
CAST('Post-cohort period length 30d increments' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1808 as analysis_id,
CAST('Distribution of duration (days) from cohort start to cohort end' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1809 as analysis_id,
CAST('Distribution of duration (days) from cohort start to cohort end, by gender' as STRING) as analysis_name,
CAST('gender_concept_id' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1810 as analysis_id,
CAST('Distribution of duration (days) from cohort start to cohort end, by age decile' as STRING) as analysis_name,
CAST('age decile' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1811 as analysis_id,
CAST('Distribution of duration (days) from observation start to cohort start' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1812 as analysis_id,
CAST('Distribution of duration (days) from cohort start to observation end' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1813 as analysis_id,
CAST('Distribution of duration (days) from cohort end to observation end' as STRING) as analysis_name,
CAST(NULL AS STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1814 as analysis_id,
CAST('Number of persons by cohort start year by gender by age decile' as STRING) as analysis_name,
CAST('calendar year' as STRING) as stratum_1_name,
CAST('gender_concept_id' as STRING) as stratum_2_name,
CAST('age decile' as STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1815 as analysis_id,
CAST('Number of persons by cohort start month' as STRING) as analysis_name,
CAST('calendar month' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1816 as analysis_id,
CAST('Number of persons by number of cohort periods' as STRING) as analysis_name,
CAST('number of cohort periods' as STRING) as stratum_1_name,
CAST(NULL AS STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1820 as analysis_id,
CAST('Number of persons by duration from cohort start to first occurrence of condition occurrence, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1821 as analysis_id,
CAST('Number of events by duration from cohort start to all occurrences of condition occurrence, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1830 as analysis_id,
CAST('Number of persons by duration from cohort start to first occurrence of procedure occurrence, by procedure_concept_id' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1831 as analysis_id,
CAST('Number of events by duration from cohort start to all occurrences of procedure occurrence, by procedure_concept_id' as STRING) as analysis_name,
CAST('procedure_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1840 as analysis_id,
CAST('Number of persons by duration from cohort start to first occurrence of drug exposure, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1841 as analysis_id,
CAST('Number of events by duration from cohort start to all occurrences of drug exposure, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1850 as analysis_id,
CAST('Number of persons by duration from cohort start to first occurrence of observation, by observation_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1851 as analysis_id,
CAST('Number of events by duration from cohort start to all occurrences of observation, by observation_concept_id' as STRING) as analysis_name,
CAST('observation_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1860 as analysis_id,
CAST('Number of persons by duration from cohort start to first occurrence of condition era, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1861 as analysis_id,
CAST('Number of events by duration from cohort start to all occurrences of condition era, by condition_concept_id' as STRING) as analysis_name,
CAST('condition_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1870 as analysis_id,
CAST('Number of persons by duration from cohort start to first occurrence of drug era, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 1871 as analysis_id,
CAST('Number of events by duration from cohort start to all occurrences of drug era, by drug_concept_id' as STRING) as analysis_name,
CAST('drug_concept_id' as STRING) as stratum_1_name,
CAST('time-to-event 30d increments' as STRING) as stratum_2_name,
CAST(NULL AS STRING) as stratum_3_name,
CAST(NULL AS STRING) as stratum_4_name,
CAST(NULL AS STRING) as stratum_5_name,
CAST('COHORT_SPECIFIC_ANALYSES' as STRING) as analysis_type
union all
select 4000 as analysis_id,
CAST('Distribution of observation period days by period_id in the 365 days prior to first cohort_start_date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4001 as analysis_id,
CAST('Number of subjects with visits by period_id, by visit_concept_id, by visit_type_concept_id in the 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4002 as analysis_id,
CAST('Distribution of number of visit occurrence records per subject by period_id, by visit_concept_id, by visit_type_concept_id in 365d prior to cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4003 as analysis_id,
CAST('Distribution of number of visit dates per subject by period_id, by visit_concept_id, by visit_type_concept_id in 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4003 as analysis_id,
CAST('Distribution of number of visit dates per subject by period_id, by visit_concept_id, by visit_type_concept_id in 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4004 as analysis_id,
CAST('Distribution of number of care_site+visit dates per subject by period_id, by visit_concept_id, by visit_type_concept_id in 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4005 as analysis_id,
CAST('Distribution of length of stay for inpatient visits per subject by period_id, by visit_concept_id, by visit_type_concept_id in the 365 days prior to first cohort_start_date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4006 as analysis_id,
CAST('Distribution of observation period days per subject, by period_id during cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4007 as analysis_id,
CAST('Number of subjects with visits by period_id, by visit_concept_id, by visit_type_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4008 as analysis_id,
CAST('Distribution of number of visit occurrence records per subject by period_id, by visit_concept_id, by visit_type_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4009 as analysis_id,
CAST('Distribution of number of visit dates per subject by period_id, by visit_concept_id, by visit_type_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4010 as analysis_id,
CAST('Distribution of number of care_site+visit dates per subject by period_id, by visit_concept_id, by visit_type_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4011 as analysis_id,
CAST('Distribution of length of stay for inpatient visits per subject by period_id, by visit_concept_id, by visit_type_concept_id during cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4012 as analysis_id,
CAST('Number of subjects with Drug Exposure by period_id, by drug_concept_id, by drug_type_concept_id in the 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4013 as analysis_id,
CAST('Distribution of number of Drug Exposure records per subject, by period_id, by drug_concept_id in 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4014 as analysis_id,
CAST('Distribution of greater than 0 drug day supply per subject by period_id, by drug_concept_id in the 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4015 as analysis_id,
CAST('Distribution of greater than 0 drug quantity per subject by period_id, by drug_concept_id in the 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4016 as analysis_id,
CAST('Number of subjects with Drug Exposure by period_id, by drug_concept_id, by drug_type_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4017 as analysis_id,
CAST('Distribution of number of Drug Exposure records per subject, by period_id, by drug_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4018 as analysis_id,
CAST('Distribution of greater than 0 drug day supply per subject by period_id, by drug_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4019 as analysis_id,
CAST('Distribution of greater than 0 drug quantity per subject by period_id, by drug_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4020 as analysis_id,
CAST('Distribution of greater than 0 US$ cost per subject by period_id, by visit_concept_id, by visit_type_concept_id, by cost_concept_id, by cost_type_concept_id in the 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4021 as analysis_id,
CAST('Distribution of greater than 0 US$ cost per subject by period_id, by visit_concept_id, by visit_type_concept_id, by cost_concept_id, by cost_type_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4022 as analysis_id,
CAST('Distribution of greater than 0 US$ cost per subject by period_id, by drug_concept_id, by drug_type_concept_id, by cost_concept_id, by cost_type_concept_id in the 365d prior to first cohort start date' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
union all
select 4023 as analysis_id,
CAST('Distribution of greater than 0 US$ cost per subject by period_id, by drug_concept_id, by drug_type_concept_id, by cost_concept_id, by cost_type_concept_id, by cost_type_concept_id during the cohort period' as STRING) as analysis_name,
NULL as stratum_1_name,
NULL as stratum_2_name,
NULL as stratum_3_name,
NULL as stratum_4_name,
NULL as stratum_5_name,
CAST('HEALTHCARE_UTILIZATION' as STRING) as analysis_type
;

/*****************************************************************/
/***** Generate the heracles reporting periods (BigQuery)     *****/
/***** Working tables are permanent scratch tables: BigQuery  *****/
/***** has no temp tables that survive across statements.     *****/
/*****************************************************************/
CREATE OR REPLACE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits
AS
SELECT n FROM UNNEST([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) AS n;

CREATE OR REPLACE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_generate_dates
AS
SELECT
y1.n + (10*y10.n) + (100*y100.n) + (1000*y1000.n) AS d_years,
	mths.n as d_months
FROM
${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits y1,
${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits y10,
(select 0 as n union all select 1 union all select 9) y100,
(select 1 as n union all select 2) y1000,
(select 1 as n union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9 union all select 10 union all select 11 union all select 12) mths
	where y1.n + (10*y10.n) + (100*y100.n) + (1000*y1000.n) >= 1900 and y1.n + (10*y10.n) + (100*y100.n) + (1000*y1000.n) < 2100
;

CREATE OR REPLACE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_yearly_dates
AS
SELECT
DATE(d_years, d_months, 1) as generated_date
FROM
${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_generate_dates
where d_months = 1
;

CREATE OR REPLACE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_monthly_dates
AS
SELECT
DATE(d_years, d_months, 1) as generated_date
FROM
${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_generate_dates
;

CREATE OR REPLACE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_weekly_dates
AS
SELECT
DATE_ADD(DATE '1900-01-07', INTERVAL (7 * seq.rn) DAY) as generated_date -- first sunday in 1900
FROM
(
	select  d1.n + (10 * d10.n) + (100 * d100.n) + (1000 * d1000.n) as rn
	from ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits d1, ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits d10, ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits d100, ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits d1000
) seq;

CREATE OR REPLACE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_quarterly_dates
AS
SELECT
DATE(d_years, d_months, 1) as generated_date
FROM
${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_generate_dates
	where d_months in (1,4,7,10)
;

-- monthly dates
CREATE OR REPLACE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_temp_period
AS
SELECT
*
FROM
(
select CAST('Monthly' AS STRING) as period_name
  , 1 as period_order
  , CAST( 'mm' AS STRING) as period_type
  , md.generated_date as period_start_date
  , DATE_ADD(md.generated_date, INTERVAL 1 MONTH) as period_end_date
from ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_monthly_dates md
UNION ALL
select CAST('Weekly' AS STRING) as period_name
  , 2 as period_order
  , CAST('ww' AS STRING) as period_type
  , wd.generated_date as period_start_date
  , DATE_ADD(wd.generated_date, INTERVAL 7 DAY) as period_end_date
from ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_weekly_dates wd
where wd.generated_date >= DATE '1900-01-01' and wd.generated_date < DATE '2100-01-01'
UNION ALL
select CAST('Quarterly' AS STRING) as period_name
  , 3 as period_order
  , CAST('qq' AS STRING) as period_type
  , qd.generated_date as period_start_date
  , DATE_ADD(qd.generated_date, INTERVAL 3 MONTH) as period_end_date
from ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_quarterly_dates qd
UNION ALL
select CAST('Yearly' AS STRING) as period_name
  , 4 as period_order
  , CAST('yy' AS STRING) as period_type
  , yd.generated_date as period_start_date
  , DATE_ADD(yd.generated_date, INTERVAL 1 YEAR) as period_end_date
from ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_yearly_dates yd
-- ADD UNION ALLs for additional period definitions
) monthlyDates;

TRUNCATE TABLE ${DATA_CHARACTERIZATION_SCHEMA}.heracles_periods;

INSERT INTO ${DATA_CHARACTERIZATION_SCHEMA}.heracles_periods (period_id, period_name, period_order, period_type, period_start_date, period_end_date)
select CAST(row_number() over (order by period_order, period_start_date) AS INT64) as period_id
			, period_name, period_order, period_type, period_start_date, period_end_date
from ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_temp_period;

DROP TABLE IF EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_temp_period;

DROP TABLE IF EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_quarterly_dates;

DROP TABLE IF EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_weekly_dates;

DROP TABLE IF EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_monthly_dates;

DROP TABLE IF EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_yearly_dates;

DROP TABLE IF EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_generate_dates;

-- The postgres/trex variants create secondary indexes on heracles_results,
-- heracles_results_dist, heracles_heel_results, heracles_periods,
-- cohort_sample_element and pathway_analysis_events here. BigQuery has no
-- secondary indexes (it prunes via partitioning/clustering instead), so those
-- statements are intentionally omitted. Note the script must not end with a
-- trailing comment: the flow splits the script on the statement separator and
-- would ship a comment-only chunk to BigQuery as a statement, so this note sits
-- before the final DROP.
DROP TABLE IF EXISTS ${DATA_CHARACTERIZATION_SCHEMA}.dc_tmp_digits;
