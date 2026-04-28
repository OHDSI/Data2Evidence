-- -------------------------------------------------------------------
-- cdm_condition_occurrence
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_condition_occurrence;
CREATE TABLE mimic_etl.cdm_condition_occurrence
(
    condition_occurrence_id       bigint     not null ,
    person_id                     bigint     not null ,
    condition_concept_id          bigint     not null ,
    condition_start_date          DATE      not null ,
    condition_start_datetime      timestamp           ,
    condition_end_date            DATE               ,
    condition_end_datetime        timestamp           ,
    condition_type_concept_id     bigint     not null ,
    stop_reason                   text             ,
    provider_id                   bigint              ,
    visit_occurrence_id           bigint              ,
    visit_detail_id               bigint              ,
    condition_source_value        text             ,
    condition_source_concept_id   bigint              ,
    condition_status_source_value text             ,
    condition_status_concept_id   bigint              ,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

-- -------------------------------------------------------------------
-- Rule 1
-- diagnoses
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_condition_occurrence
SELECT nextval('id_sequence') AS condition_occurrence_id, t.*
FROM (SELECT
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS condition_concept_id,
    CAST(src.start_datetime AS DATE)        AS condition_start_date,
    src.start_datetime                      AS condition_start_datetime,
    CAST(src.end_datetime AS DATE)          AS condition_end_date,
    src.end_datetime                        AS condition_end_datetime,
    src.type_concept_id                     AS condition_type_concept_id,
    CAST(NULL AS text)                    AS stop_reason,
    CAST(NULL AS bigint)                     AS provider_id,
    vis.visit_occurrence_id                 AS visit_occurrence_id,
    CAST(NULL AS bigint)                     AS visit_detail_id,
    src.source_code                         AS condition_source_value,
    COALESCE(src.source_concept_id, 0)      AS condition_source_concept_id,
    CAST(NULL AS text)                    AS condition_status_source_value,
    CAST(NULL AS bigint)                     AS condition_status_concept_id,
    --
    CONCAT('condition.', src.unit_id) AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_diagnoses_icd_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE
    src.target_domain_id = 'Condition') t
;

-- -------------------------------------------------------------------
-- rule 2
-- Chartevents.value
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_condition_occurrence
SELECT nextval('id_sequence') AS condition_occurrence_id, t.*
FROM (SELECT
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS condition_concept_id,
    CAST(src.start_datetime AS DATE)        AS condition_start_date,
    src.start_datetime                      AS condition_start_datetime,
    CAST(src.start_datetime AS DATE)        AS condition_end_date,
    src.start_datetime                      AS condition_end_datetime,
    32817                                   AS condition_type_concept_id, -- EHR  Type Concept    Type Concept
    CAST(NULL AS text)                    AS stop_reason,
    CAST(NULL AS bigint)                     AS provider_id,
    vis.visit_occurrence_id                 AS visit_occurrence_id,
    CAST(NULL AS bigint)                     AS visit_detail_id,
    src.source_code                         AS condition_source_value,
    COALESCE(src.source_concept_id, 0)      AS condition_source_concept_id,
    CAST(NULL AS text)                    AS condition_status_source_value,
    CAST(NULL AS bigint)                     AS condition_status_concept_id,
    --
    CONCAT('condition.', src.unit_id) AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_chartevents_condition_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE
    src.target_domain_id = 'Condition') t
;



-- -------------------------------------------------------------------
-- rule 3
-- Chartevents
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_condition_occurrence
SELECT nextval('id_sequence') AS condition_occurrence_id, t.*
FROM (SELECT
    per.person_id                           AS person_id,
    COALESCE(src.target_concept_id, 0)      AS condition_concept_id,
    CAST(src.start_datetime AS DATE)        AS condition_start_date,
    src.start_datetime                      AS condition_start_datetime,
    CAST(src.start_datetime AS DATE)        AS condition_end_date,
    src.start_datetime                      AS condition_end_datetime,
    src.type_concept_id                     AS condition_type_concept_id,
    CAST(NULL AS text)                    AS stop_reason,
    CAST(NULL AS bigint)                     AS provider_id,
    vis.visit_occurrence_id                 AS visit_occurrence_id,
    CAST(NULL AS bigint)                     AS visit_detail_id,
    src.source_code                         AS condition_source_value,
    COALESCE(src.source_concept_id, 0)      AS condition_source_concept_id,
    CAST(NULL AS text)                    AS condition_status_source_value,
    CAST(NULL AS bigint)                     AS condition_status_concept_id,
    --
    CONCAT('condition.', src.unit_id) AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_chartevents_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE
    src.target_domain_id = 'Condition') t
;


