-- -------------------------------------------------------------------
-- tmp_subject_ethnicity
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.tmp_subject_ethnicity;
CREATE TABLE mimic_etl.tmp_subject_ethnicity AS
SELECT DISTINCT
    src.subject_id                      AS subject_id,
    FIRST_VALUE(src.ethnicity) OVER (
        PARTITION BY src.subject_id 
        ORDER BY src.admittime ASC)     AS ethnicity_first
FROM
    mimic_etl.src_admissions src
;

-- -------------------------------------------------------------------
-- lk_pat_ethnicity_concept
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_pat_ethnicity_concept;
CREATE TABLE mimic_etl.lk_pat_ethnicity_concept AS
SELECT DISTINCT
    src.ethnicity_first     AS source_code,
    vc.concept_id           AS source_concept_id,
    vc.vocabulary_id        AS source_vocabulary_id,
    vc1.concept_id          AS target_concept_id,
    vc1.vocabulary_id       AS target_vocabulary_id -- look here to distinguish Race and Ethnicity
FROM
    mimic_etl.tmp_subject_ethnicity src
LEFT JOIN
    -- gcpt_ethnicity_to_concept -> mimiciv_per_ethnicity
    mimic_etl.voc_concept vc
        ON UPPER(vc.concept_code) = UPPER(src.ethnicity_first) -- do the custom mapping
        AND vc.domain_id IN ('Race', 'Ethnicity')
LEFT JOIN
    mimic_etl.voc_concept_relationship cr1
        ON  cr1.concept_id_1 = vc.concept_id
        AND cr1.relationship_id = 'Maps to'
LEFT JOIN
    mimic_etl.voc_concept vc1
        ON  cr1.concept_id_2 = vc1.concept_id
        AND vc1.invalid_reason IS NULL
        AND vc1.standard_concept = 'S'
;

-- -------------------------------------------------------------------
-- cdm_person
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_person;
CREATE TABLE mimic_etl.cdm_person
(
    person_id                   bigint     not null ,
    gender_concept_id           bigint     not null ,
    year_of_birth               bigint     not null ,
    month_of_birth              bigint              ,
    day_of_birth                bigint              ,
    birth_datetime              timestamp           ,
    race_concept_id             bigint     not null,
    ethnicity_concept_id        bigint     not null,
    location_id                 bigint              ,
    provider_id                 bigint              ,
    care_site_id                bigint              ,
    person_source_value         text             ,
    gender_source_value         text             ,
    gender_source_concept_id    bigint              ,
    race_source_value           text             ,
    race_source_concept_id      bigint              ,
    ethnicity_source_value      text             ,
    ethnicity_source_concept_id bigint              ,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

INSERT INTO mimic_etl.cdm_person
SELECT nextval('id_sequence') AS person_id, t.*
FROM (SELECT
    CASE 
        WHEN p.gender = 'F' THEN 8532 -- FEMALE
        WHEN p.gender = 'M' THEN 8507 -- MALE
        ELSE 0 
    END                             AS gender_concept_id,
    p.anchor_year                   AS year_of_birth,
    CAST(NULL AS bigint)             AS month_of_birth,
    CAST(NULL AS bigint)             AS day_of_birth,
    CAST(NULL AS timestamp)          AS birth_datetime,
    COALESCE(
        CASE
            WHEN map_eth.target_vocabulary_id <> 'Ethnicity'
                THEN map_eth.target_concept_id
            ELSE NULL
        END, 0)                               AS race_concept_id,
    COALESCE(
        CASE
            WHEN map_eth.target_vocabulary_id = 'Ethnicity'
                THEN map_eth.target_concept_id
            ELSE NULL
        END, 0)                     AS ethnicity_concept_id,
    CAST(NULL AS bigint)             AS location_id,
    CAST(NULL AS bigint)             AS provider_id,
    CAST(NULL AS bigint)             AS care_site_id,
    CAST(p.subject_id AS text)    AS person_source_value,
    p.gender                        AS gender_source_value,
    0                               AS gender_source_concept_id,
    CASE
        WHEN map_eth.target_vocabulary_id <> 'Ethnicity'
            THEN eth.ethnicity_first
        ELSE NULL
    END                             AS race_source_value,
    COALESCE(
        CASE
            WHEN map_eth.target_vocabulary_id <> 'Ethnicity'
                THEN map_eth.source_concept_id
            ELSE NULL
        END, 0)                        AS race_source_concept_id,
    CASE
        WHEN map_eth.target_vocabulary_id = 'Ethnicity'
            THEN eth.ethnicity_first
        ELSE NULL
    END                             AS ethnicity_source_value,
    COALESCE(
        CASE
            WHEN map_eth.target_vocabulary_id = 'Ethnicity'
                THEN map_eth.source_concept_id
            ELSE NULL
        END, 0)                     AS ethnicity_source_concept_id,
    -- 
    'person.patients'               AS unit_id,
    p.load_table_id                 AS load_table_id,
    p.load_row_id                   AS load_row_id,
    p.trace_id                      AS trace_id
FROM 
    mimic_etl.src_patients p
LEFT JOIN 
    mimic_etl.tmp_subject_ethnicity eth
        ON  p.subject_id = eth.subject_id
LEFT JOIN
    mimic_etl.lk_pat_ethnicity_concept map_eth
        ON  eth.ethnicity_first = map_eth.source_code) t
;


-- -------------------------------------------------------------------
-- cleanup
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.tmp_subject_ethnicity;
