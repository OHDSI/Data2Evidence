-- -------------------------------------------------------------------
-- cdm_device_exposure
-- Rule 1 lk_drug_mapped
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_device_exposure;
CREATE TABLE mimic_etl.cdm_device_exposure
(
    device_exposure_id             bigint not null,
    person_id                      bigint not null,
    device_concept_id              bigint not null,
    device_exposure_start_date     DATE   not null,
    device_exposure_start_datetime timestamp,
    device_exposure_end_date       DATE,
    device_exposure_end_datetime   timestamp,
    device_type_concept_id         bigint not null,
    unique_device_id               text,
    quantity                       bigint,
    provider_id                    bigint,
    visit_occurrence_id            bigint,
    visit_detail_id                bigint,
    device_source_value            text,
    device_source_concept_id       bigint,
    -- 
    unit_id                        text,
    load_table_id                  text,
    load_row_id                    bigint,
    trace_id                       text
)
;


INSERT INTO mimic_etl.cdm_device_exposure
SELECT nextval('id_sequence') AS device_exposure_id, t.*
FROM (SELECT
       per.person_id                     AS person_id,
       src.target_concept_id             AS device_concept_id,
       CAST(src.start_datetime AS DATE)  AS device_exposure_start_date,
       src.start_datetime                AS device_exposure_start_datetime,
       CAST(src.end_datetime AS DATE)    AS device_exposure_end_date,
       src.end_datetime                  AS device_exposure_end_datetime,
       src.type_concept_id               AS device_type_concept_id,
       CAST(NULL AS text)                AS unique_device_id,
       CAST(
               (CASE WHEN ROUND(src.quantity) = src.quantity THEN src.quantity END)
           AS bigint)                    AS quantity,
       CAST(NULL AS bigint)              AS provider_id,
       vis.visit_occurrence_id           AS visit_occurrence_id,
       CAST(NULL AS bigint)              AS visit_detail_id,
       src.source_code                   AS device_source_value,
       src.source_concept_id             AS device_source_concept_id,
       --
       CONCAT('device.', src.unit_id)    AS unit_id,
       src.load_table_id                 AS load_table_id,
       src.load_row_id                   AS load_row_id,
       src.trace_id                      AS trace_id
FROM mimic_etl.lk_drug_mapped src
         INNER JOIN
     mimic_etl.cdm_person per
     ON CAST(src.subject_id AS text) = per.person_source_value
         INNER JOIN
     mimic_etl.cdm_visit_occurrence vis
     ON vis.visit_source_value =
        CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE src.target_domain_id = 'Device') t
;


INSERT INTO mimic_etl.cdm_device_exposure
SELECT nextval('id_sequence') AS device_exposure_id, t.*
FROM (SELECT
       per.person_id                     AS person_id,
       src.target_concept_id             AS device_concept_id,
       CAST(src.start_datetime AS DATE)  AS device_exposure_start_date,
       src.start_datetime                AS device_exposure_start_datetime,
       CAST(src.start_datetime AS DATE)  AS device_exposure_end_date,
       src.start_datetime                AS device_exposure_end_datetime,
       src.type_concept_id               AS device_type_concept_id,
       CAST(NULL AS text)                AS unique_device_id,
       CAST(
               (CASE WHEN ROUND(src.value_as_number) = src.value_as_number THEN src.value_as_number END)
           AS bigint)                    AS quantity,
       CAST(NULL AS bigint)              AS provider_id,
       vis.visit_occurrence_id           AS visit_occurrence_id,
       CAST(NULL AS bigint)              AS visit_detail_id,
       src.source_code                   AS device_source_value,
       src.source_concept_id             AS device_source_concept_id,
       --
       CONCAT('device.', src.unit_id)    AS unit_id,
       src.load_table_id                 AS load_table_id,
       src.load_row_id                   AS load_row_id,
       src.trace_id                      AS trace_id
FROM mimic_etl.lk_chartevents_mapped src
         INNER JOIN
     mimic_etl.cdm_person per
     ON CAST(src.subject_id AS text) = per.person_source_value
         INNER JOIN
     mimic_etl.cdm_visit_occurrence vis
     ON vis.visit_source_value =
        CONCAT(CAST(src.subject_id AS text), '|', CAST(src.hadm_id AS text))
WHERE src.target_domain_id = 'Device') t
;
