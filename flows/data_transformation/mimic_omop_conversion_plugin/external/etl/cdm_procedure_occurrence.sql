-- -------------------------------------------------------------------
-- cdm_procedure_occurrence
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_procedure_occurrence;
CREATE TABLE mimic_etl.cdm_procedure_occurrence
(
    procedure_occurrence_id     bigint     not null ,
    person_id                   bigint     not null ,
    procedure_concept_id        bigint     not null ,
    procedure_date              DATE      not null ,
    procedure_datetime          timestamp           ,
    procedure_type_concept_id   bigint     not null ,
    modifier_concept_id         bigint              ,
    quantity                    bigint              ,
    provider_id                 bigint              ,
    visit_occurrence_id         bigint              ,
    visit_detail_id             bigint              ,
    procedure_source_value      text             ,
    procedure_source_concept_id bigint              ,
    modifier_source_value      text              ,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

-- -------------------------------------------------------------------
-- Rules 1-4
-- lk_procedure_mapped
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_procedure_occurrence
SELECT nextval('id_sequence') AS procedure_occurrence_id, t.*
FROM (SELECT
    per.person_id                               AS person_id,
    src.target_concept_id                       AS procedure_concept_id,
    CAST(src.start_datetime AS DATE)            AS procedure_date,
    src.start_datetime                          AS procedure_datetime,
    src.type_concept_id                         AS procedure_type_concept_id,
    0                                           AS modifier_concept_id,
    CAST(src.quantity AS bigint)                 AS quantity,
    CAST(NULL AS bigint)                         AS provider_id,
    vis.visit_occurrence_id                     AS visit_occurrence_id,
    CAST(NULL AS bigint)                         AS visit_detail_id,
    src.source_code                             AS procedure_source_value,
    src.source_concept_id                       AS procedure_source_concept_id,
    CAST(NULL AS text)                        AS modifier_source_value,
    -- 
    CONCAT('procedure.', src.unit_id)           AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_procedure_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE
    src.target_domain_id = 'Procedure') t
;

-- -------------------------------------------------------------------
-- Rule 5
-- lk_observation_mapped, possible DRG codes
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_procedure_occurrence
SELECT nextval('id_sequence') AS procedure_occurrence_id, t.*
FROM (SELECT
    per.person_id                               AS person_id,
    src.target_concept_id                       AS procedure_concept_id,
    CAST(src.start_datetime AS DATE)            AS procedure_date,
    src.start_datetime                          AS procedure_datetime,
    src.type_concept_id                         AS procedure_type_concept_id,
    0                                           AS modifier_concept_id,
    CAST(NULL AS bigint)                         AS quantity,
    CAST(NULL AS bigint)                         AS provider_id,
    vis.visit_occurrence_id                     AS visit_occurrence_id,
    CAST(NULL AS bigint)                         AS visit_detail_id,
    src.source_code                             AS procedure_source_value,
    src.source_concept_id                       AS procedure_source_concept_id,
    CAST(NULL AS text)                        AS modifier_source_value,
    -- 
    CONCAT('procedure.', src.unit_id)           AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_observation_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE
    src.target_domain_id = 'Procedure') t
;

-- -------------------------------------------------------------------
-- Rule 6
-- lk_specimen_mapped, small part of specimen is mapped to Procedure
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_procedure_occurrence
SELECT nextval('id_sequence') AS procedure_occurrence_id, t.*
FROM (SELECT
    per.person_id                               AS person_id,
    src.target_concept_id                       AS procedure_concept_id,
    CAST(src.start_datetime AS DATE)            AS procedure_date,
    src.start_datetime                          AS procedure_datetime,
    src.type_concept_id                         AS procedure_type_concept_id,
    0                                           AS modifier_concept_id,
    CAST(NULL AS bigint)                         AS quantity,
    CAST(NULL AS bigint)                         AS provider_id,
    vis.visit_occurrence_id                     AS visit_occurrence_id,
    CAST(NULL AS bigint)                         AS visit_detail_id,
    src.source_code                             AS procedure_source_value,
    src.source_concept_id                       AS procedure_source_concept_id,
    CAST(NULL AS text)                        AS modifier_source_value,
    -- 
    CONCAT('procedure.', src.unit_id)           AS unit_id,
    src.load_table_id               AS load_table_id,
    src.load_row_id                 AS load_row_id,
    src.trace_id                    AS trace_id
FROM
    mimic_etl.lk_specimen_mapped src
INNER JOIN
    mimic_etl.cdm_person per
        ON CAST(src.subject_id AS text) = per.person_source_value
INNER JOIN
    mimic_etl.cdm_visit_occurrence vis
        ON  vis.visit_source_value = 
            CONCAT(CAST(src.subject_id AS text), '|',
                COALESCE(CAST(src.hadm_id AS text), CAST(src.date_id AS text)))
WHERE
    src.target_domain_id = 'Procedure') t
;


-- -------------------------------------------------------------------
-- Rule 7
-- lk_chartevents_mapped, a part of chartevents table is mapped to Procedure
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_procedure_occurrence
SELECT nextval('id_sequence') AS procedure_occurrence_id, t.*
FROM (SELECT
    per.person_id                               AS person_id,
    src.target_concept_id                       AS procedure_concept_id,
    CAST(src.start_datetime AS DATE)            AS procedure_date,
    src.start_datetime                          AS procedure_datetime,
    src.type_concept_id                         AS procedure_type_concept_id,
    0                                           AS modifier_concept_id,
    CAST(NULL AS bigint)                         AS quantity,
    CAST(NULL AS bigint)                         AS provider_id,
    vis.visit_occurrence_id                     AS visit_occurrence_id,
    CAST(NULL AS bigint)                         AS visit_detail_id,
    src.source_code                             AS procedure_source_value,
    src.source_concept_id                       AS procedure_source_concept_id,
    CAST(NULL AS text)                        AS modifier_source_value,
    -- 
    CONCAT('procedure.', src.unit_id)           AS unit_id,
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
    src.target_domain_id = 'Procedure') t
;

