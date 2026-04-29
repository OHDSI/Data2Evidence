-- ------------------------------------------------------------------------------
-- concept
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.concept;

CREATE TABLE mimic_staging.concept AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT
    concept_id,
    concept_name,
    domain_id,
    vocabulary_id,
    concept_class_id,
    standard_concept,
    concept_code,
    strptime(valid_start_date, '%Y%m%d')::date AS valid_start_date,
    strptime(valid_end_date, '%Y%m%d')::date AS valid_end_date,
    invalid_reason,
    'concept' AS load_table_id
FROM
    mimic_staging.tmp_concept) t
;

-- ------------------------------------------------------------------------------
-- concept_relationship
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.concept_relationship;

CREATE TABLE mimic_staging.concept_relationship AS
SELECT
    concept_id_1,
    concept_id_2,
    relationship_id,
    valid_start_date::date AS valid_start_date,
    valid_end_date::date AS valid_end_date,
    invalid_reason,
    'concept_relationship' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_concept_relationship
;

-- ------------------------------------------------------------------------------
-- vocabulary
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.vocabulary;

CREATE TABLE mimic_staging.vocabulary AS
SELECT
    *,
    'vocabulary' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_vocabulary
;

-- ------------------------------------------------------------------------------
-- tables which are NOT affected in generating custom concepts
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- drug_strength
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.drug_strength;

CREATE TABLE mimic_staging.drug_strength AS
SELECT
    drug_concept_id,
    ingredient_concept_id,
    amount_value,
    amount_unit_concept_id,
    numerator_value,
    numerator_unit_concept_id,
    denominator_value,
    denominator_unit_concept_id,
    box_size,
    valid_start_date::date AS valid_start_date,
    valid_end_date::date AS valid_end_date,
    invalid_reason,
    'drug_strength' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_drug_strength
;

-- ------------------------------------------------------------------------------
-- concept_class
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.concept_class;

CREATE TABLE mimic_staging.concept_class AS
SELECT
    *,
    'concept_class' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_concept_class
;

-- ------------------------------------------------------------------------------
-- concept_ancestor
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.concept_ancestor;

CREATE TABLE mimic_staging.concept_ancestor AS
SELECT
    *,
    'concept_ancestor' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_concept_ancestor
;

-- ------------------------------------------------------------------------------
-- concept_synonym
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.concept_synonym;

CREATE TABLE mimic_staging.concept_synonym AS
SELECT
    *,
    'concept_synonym' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_concept_synonym
;

-- ------------------------------------------------------------------------------
-- domain
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.domain;

CREATE TABLE mimic_staging.domain AS
SELECT
    *,
    'domain' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_domain
;

-- ------------------------------------------------------------------------------
-- relationship
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_staging.relationship;

CREATE TABLE mimic_staging.relationship AS
SELECT
    *,
    'relationship' AS load_table_id,
    0 AS load_row_id
FROM
    mimic_staging.tmp_relationship
;
