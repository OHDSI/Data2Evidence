-- -------------------------------------------------------------------
-- cdm_visit_occurrence
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_visit_occurrence;
CREATE TABLE mimic_etl.cdm_visit_occurrence
(
    visit_occurrence_id           bigint not null,
    person_id                     bigint not null,
    visit_concept_id              bigint not null,
    visit_start_date              DATE   not null,
    visit_start_datetime          timestamp,
    visit_end_date                DATE   not null,
    visit_end_datetime            timestamp,
    visit_type_concept_id         bigint not null,
    provider_id                   bigint,
    care_site_id                  bigint,
    visit_source_value            text,
    visit_source_concept_id       bigint,
    admitting_source_concept_id   bigint,
    admitting_source_value        text,
    discharge_to_concept_id       bigint,
    discharge_to_source_value     text,
    preceding_visit_occurrence_id bigint,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

INSERT INTO mimic_etl.cdm_visit_occurrence
SELECT src.visit_occurrence_id                                                                   AS visit_occurrence_id,
       per.person_id                                                                             AS person_id,
       COALESCE(lat.target_concept_id, 0)                                                        AS visit_concept_id,
       CAST(src.start_datetime AS DATE)                                                          AS visit_start_date,
       src.start_datetime                                                                        AS visit_start_datetime,
       CAST(src.end_datetime AS DATE)                                                            AS visit_end_date,
       src.end_datetime                                                                          AS visit_end_datetime,
       32817                                                                                     AS visit_type_concept_id,   -- EHR   Type Concept    Standard
       CAST(NULL AS bigint)                                                                      AS provider_id,
       cs.care_site_id                                                                           AS care_site_id,
       src.source_value                                                                          AS visit_source_value,      -- it should be an ID for visits
       COALESCE(lat.source_concept_id, 0)                                                        AS visit_source_concept_id, -- it is where visit_concept_id comes from
       (CASE
            WHEN src.admission_location IS NOT NULL
                THEN COALESCE(la.target_concept_id, 0) END)                                      AS admitting_source_concept_id,
       src.admission_location                                                                    AS admitting_source_value,
       (CASE
            WHEN src.discharge_location IS NOT NULL
                THEN COALESCE(ld.target_concept_id, 0) END)                                      AS discharge_to_concept_id,
       src.discharge_location                                                                    AS discharge_to_source_value,
       LAG(src.visit_occurrence_id) OVER (
           PARTITION BY subject_id, hadm_id
           ORDER BY start_datetime
           )                                                                                     AS preceding_visit_occurrence_id,
       --
       CONCAT('visit.', src.unit_id)                                                             AS unit_id,
       src.load_table_id                                                                         AS load_table_id,
       src.load_row_id                                                                           AS load_row_id,
       src.trace_id                                                                              AS trace_id
FROM mimic_etl.lk_visit_clean src
         INNER JOIN
     mimic_etl.cdm_person per
     ON CAST(src.subject_id AS text) = per.person_source_value
         LEFT JOIN
     mimic_etl.lk_visit_concept lat
     ON lat.source_code = src.admission_type
         LEFT JOIN
     mimic_etl.lk_visit_concept la
     ON la.source_code = src.admission_location
         LEFT JOIN
     mimic_etl.lk_visit_concept ld
     ON ld.source_code = src.discharge_location
         LEFT JOIN
     mimic_etl.cdm_care_site cs
     ON care_site_name = 'BIDMC' -- Beth Israel hospital for all
;
