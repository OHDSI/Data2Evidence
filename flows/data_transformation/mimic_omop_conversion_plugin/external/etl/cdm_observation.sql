-- -------------------------------------------------------------------
-- cdm_observation
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_observation;
CREATE TABLE mimic_etl.cdm_observation
(
    observation_id                bigint not null,
    person_id                     bigint not null,
    observation_concept_id        bigint not null,
    observation_date              DATE   not null,
    observation_datetime          timestamp,
    observation_type_concept_id   bigint not null,
    value_as_number               double precision,
    value_as_string               text,
    value_as_concept_id           bigint,
    qualifier_concept_id          bigint,
    unit_concept_id               bigint,
    provider_id                   bigint,
    visit_occurrence_id           bigint,
    visit_detail_id               bigint,
    observation_source_value      text,
    observation_source_concept_id bigint,
    unit_source_value             text,
    qualifier_source_value        text,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

-- -------------------------------------------------------------------
-- Rules 1-4
-- lk_observation_mapped (demographics and DRG codes)
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_observation
SELECT nextval('id_sequence') AS observation_id, t.*
FROM (SELECT per.person_id                       AS person_id,
             src.target_concept_id               AS observation_concept_id,
             CAST(src.start_datetime AS DATE)    AS observation_date,
             src.start_datetime                  AS observation_datetime,
             src.type_concept_id                 AS observation_type_concept_id,
             CAST(NULL AS double precision)      AS value_as_number,
             src.value_as_string                 AS value_as_string,
             (CASE
                  WHEN src.value_as_string IS NOT NULL THEN COALESCE(src.value_as_concept_id, 0)
                 END)                            AS value_as_concept_id,
             CAST(NULL AS bigint)                AS qualifier_concept_id,
             CAST(NULL AS bigint)                AS unit_concept_id,
             CAST(NULL AS bigint)                AS provider_id,
             vis.visit_occurrence_id             AS visit_occurrence_id,
             CAST(NULL AS bigint)                AS visit_detail_id,
             src.source_code                     AS observation_source_value,
             src.source_concept_id               AS observation_source_concept_id,
             CAST(NULL AS text)                  AS unit_source_value,
             CAST(NULL AS text)                  AS qualifier_source_value,
             --
             CONCAT('observation.', src.unit_id) AS unit_id,
             src.load_table_id                   AS load_table_id,
             src.load_row_id                     AS load_row_id,
             src.trace_id                        AS trace_id
      FROM mimic_etl.lk_observation_mapped src
               INNER JOIN
           mimic_etl.cdm_person per
           ON CAST(src.subject_id AS text) = per.person_source_value
               INNER JOIN
           mimic_etl.cdm_visit_occurrence vis
           ON vis.visit_source_value =
              CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
      WHERE src.target_domain_id = 'Observation') t
;

-- -------------------------------------------------------------------
-- Rule 5
-- chartevents
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_observation
SELECT src.measurement_id                                      AS observation_id, -- id is generated already
       per.person_id                                           AS person_id,
       src.target_concept_id                                   AS observation_concept_id,
       CAST(src.start_datetime AS DATE)                        AS observation_date,
       src.start_datetime                                      AS observation_datetime,
       src.type_concept_id                                     AS observation_type_concept_id,
       src.value_as_number                                     AS value_as_number,
       src.value_source_value                                  AS value_as_string,
       (CASE
            WHEN src.value_source_value IS NOT NULL
                THEN COALESCE(src.value_as_concept_id, 0) END) AS value_as_concept_id,
       CAST(NULL AS bigint)                                    AS qualifier_concept_id,
       src.unit_concept_id                                     AS unit_concept_id,
       CAST(NULL AS bigint)                                    AS provider_id,
       vis.visit_occurrence_id                                 AS visit_occurrence_id,
       CAST(NULL AS bigint)                                    AS visit_detail_id,
       src.source_code                                         AS observation_source_value,
       src.source_concept_id                                   AS observation_source_concept_id,
       src.unit_source_value                                   AS unit_source_value,
       CAST(NULL AS text)                                      AS qualifier_source_value,
       --
       CONCAT('observation.', src.unit_id)                     AS unit_id,
       src.load_table_id                                       AS load_table_id,
       src.load_row_id                                         AS load_row_id,
       src.trace_id                                            AS trace_id
FROM mimic_etl.lk_chartevents_mapped src
         INNER JOIN
     mimic_etl.cdm_person per
     ON CAST(src.subject_id AS text) = per.person_source_value
         INNER JOIN
     mimic_etl.cdm_visit_occurrence vis
     ON vis.visit_source_value =
        CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE src.target_domain_id = 'Observation'
;

-- -------------------------------------------------------------------
-- Rule 6
-- lk_procedure_mapped
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_observation
SELECT nextval('id_sequence') AS observation_id, t.*
FROM (SELECT per.person_id                       AS person_id,
             src.target_concept_id               AS observation_concept_id,
             CAST(src.start_datetime AS DATE)    AS observation_date,
             src.start_datetime                  AS observation_datetime,
             src.type_concept_id                 AS observation_type_concept_id,
             CAST(NULL AS double precision)      AS value_as_number,
             CAST(NULL AS text)                  AS value_as_string,
             CAST(NULL AS bigint)                AS value_as_concept_id,
             CAST(NULL AS bigint)                AS qualifier_concept_id,
             CAST(NULL AS bigint)                AS unit_concept_id,
             CAST(NULL AS bigint)                AS provider_id,
             vis.visit_occurrence_id             AS visit_occurrence_id,
             CAST(NULL AS bigint)                AS visit_detail_id,
             src.source_code                     AS observation_source_value,
             src.source_concept_id               AS observation_source_concept_id,
             CAST(NULL AS text)                  AS unit_source_value,
             CAST(NULL AS text)                  AS qualifier_source_value,
             --
             CONCAT('observation.', src.unit_id) AS unit_id,
             src.load_table_id                   AS load_table_id,
             src.load_row_id                     AS load_row_id,
             src.trace_id                        AS trace_id
      FROM mimic_etl.lk_procedure_mapped src
               INNER JOIN
           mimic_etl.cdm_person per
           ON CAST(src.subject_id AS text) = per.person_source_value
               INNER JOIN
           mimic_etl.cdm_visit_occurrence vis
           ON vis.visit_source_value =
              CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
      WHERE src.target_domain_id = 'Observation') t
;

-- -------------------------------------------------------------------
-- Rule 7
-- diagnoses
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_observation
SELECT nextval('id_sequence') AS observation_id, t.*
FROM (SELECT per.person_id                       AS person_id,
             src.target_concept_id               AS observation_concept_id, -- to rename fields in *_mapped
             CAST(src.start_datetime AS DATE)    AS observation_date,
             src.start_datetime                  AS observation_datetime,
             src.type_concept_id                 AS observation_type_concept_id,
             CAST(NULL AS double precision)      AS value_as_number,
             CAST(NULL AS text)                  AS value_as_string,
             CAST(NULL AS bigint)                AS value_as_concept_id,
             CAST(NULL AS bigint)                AS qualifier_concept_id,
             CAST(NULL AS bigint)                AS unit_concept_id,
             CAST(NULL AS bigint)                AS provider_id,
             vis.visit_occurrence_id             AS visit_occurrence_id,
             CAST(NULL AS bigint)                AS visit_detail_id,
             src.source_code                     AS observation_source_value,
             src.source_concept_id               AS observation_source_concept_id,
             CAST(NULL AS text)                  AS unit_source_value,
             CAST(NULL AS text)                  AS qualifier_source_value,
             --
             CONCAT('observation.', src.unit_id) AS unit_id,
             src.load_table_id                   AS load_table_id,
             src.load_row_id                     AS load_row_id,
             src.trace_id                        AS trace_id
      FROM mimic_etl.lk_diagnoses_icd_mapped src
               INNER JOIN
           mimic_etl.cdm_person per
           ON CAST(src.subject_id AS text) = per.person_source_value
               INNER JOIN
           mimic_etl.cdm_visit_occurrence vis
           ON vis.visit_source_value =
              CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
      WHERE src.target_domain_id = 'Observation') t
;

-- -------------------------------------------------------------------
-- Rule 8
-- lk_specimen_mapped
-- -------------------------------------------------------------------

INSERT INTO mimic_etl.cdm_observation
SELECT nextval('id_sequence') AS observation_id, t.*
FROM (SELECT per.person_id                       AS person_id,
             src.target_concept_id               AS observation_concept_id,
             CAST(src.start_datetime AS DATE)    AS observation_date,
             src.start_datetime                  AS observation_datetime,
             src.type_concept_id                 AS observation_type_concept_id,
             CAST(NULL AS double precision)      AS value_as_number,
             CAST(NULL AS text)                  AS value_as_string,
             CAST(NULL AS bigint)                AS value_as_concept_id,
             CAST(NULL AS bigint)                AS qualifier_concept_id,
             CAST(NULL AS bigint)                AS unit_concept_id,
             CAST(NULL AS bigint)                AS provider_id,
             vis.visit_occurrence_id             AS visit_occurrence_id,
             CAST(NULL AS bigint)                AS visit_detail_id,
             src.source_code                     AS observation_source_value,
             src.source_concept_id               AS observation_source_concept_id,
             CAST(NULL AS text)                  AS unit_source_value,
             CAST(NULL AS text)                  AS qualifier_source_value,
             --
             CONCAT('observation.', src.unit_id) AS unit_id,
             src.load_table_id                   AS load_table_id,
             src.load_row_id                     AS load_row_id,
             src.trace_id                        AS trace_id
      FROM mimic_etl.lk_specimen_mapped src
               INNER JOIN
           mimic_etl.cdm_person per
           ON CAST(src.subject_id AS text) = per.person_source_value
               INNER JOIN
           mimic_etl.cdm_visit_occurrence vis
           ON vis.visit_source_value =
              CONCAT(CAST(src.subject_id AS text), '|',
                     COALESCE(CAST(src.hadm_id AS text), CAST(src.date_id AS text)))
      WHERE src.target_domain_id = 'Observation') t
;

