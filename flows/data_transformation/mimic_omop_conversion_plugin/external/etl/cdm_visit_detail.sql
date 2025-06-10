-- -------------------------------------------------------------------
-- cdm_visit_detail
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_visit_detail;
CREATE TABLE mimic_etl.cdm_visit_detail
(
    visit_detail_id                bigint not null,
    person_id                      bigint not null,
    visit_detail_concept_id        bigint not null,
    visit_detail_start_date        DATE   not null,
    visit_detail_start_datetime    timestamp,
    visit_detail_end_date          DATE   not null,
    visit_detail_end_datetime      timestamp,
    visit_detail_type_concept_id   bigint not null, -- detail! -- this typo still exists in v.5.3.1(???)
    provider_id                    bigint,
    care_site_id                   bigint,
    admitting_source_concept_id    bigint,
    discharge_to_concept_id        bigint,
    preceding_visit_detail_id      bigint,
    visit_detail_source_value      text,
    visit_detail_source_concept_id bigint,          -- detail! -- this typo still exists in v.5.3.1(???)
    admitting_source_value         text,
    discharge_to_source_value      text,
    visit_detail_parent_id         bigint,
    visit_occurrence_id            bigint not null,
    -- 
    unit_id                        text,
    load_table_id                  text,
    load_row_id                    bigint,
    trace_id                       text
)
;

-- -------------------------------------------------------------------
-- Rule 1. transfers
-- Rule 2. services
-- -------------------------------------------------------------------


INSERT INTO mimic_etl.cdm_visit_detail
SELECT src.visit_detail_id                                  AS visit_detail_id,
       per.person_id                                        AS person_id,
       COALESCE(vdc.target_concept_id, 0)                   AS visit_detail_concept_id,
       -- see source value in care_site.care_site_source_value
       CAST(src.start_datetime AS DATE)                     AS visit_start_date,
       src.start_datetime                                   AS visit_start_datetime,
       CAST(src.end_datetime AS DATE)                       AS visit_end_date,
       src.end_datetime                                     AS visit_end_datetime,
       32817                                                AS visit_detail_type_concept_id, -- EHR   Type Concept    Standard
       CAST(NULL AS bigint)                                 AS provider_id,
       cs.care_site_id                                      AS care_site_id,

       (CASE
            WHEN src.admission_location IS NOT NULL
                THEN COALESCE(la.target_concept_id, 0) END) AS admitting_source_concept_id,
       (CASE
            WHEN src.discharge_location IS NOT NULL THEN
                COALESCE(ld.target_concept_id, 0) END)      AS discharge_to_concept_id,
       src.preceding_visit_detail_id                        AS preceding_visit_detail_id,
       src.source_value                                     AS visit_detail_source_value,
       COALESCE(vdc.source_concept_id, 0)                   AS visit_detail_source_concept_id,
       src.admission_location                               AS admitting_source_value,
       src.discharge_location                               AS discharge_to_source_value,
       CAST(NULL AS bigint)                                 AS visit_detail_parent_id,
       vis.visit_occurrence_id                              AS visit_occurrence_id,
       --
       CONCAT('visit_detail.', src.unit_id)                 AS unit_id,
       src.load_table_id                                    AS load_table_id,
       src.load_row_id                                      AS load_row_id,
       src.trace_id                                         AS trace_id
FROM mimic_etl.lk_visit_detail_prev_next src
         INNER JOIN
     mimic_etl.cdm_person per
     ON CAST(src.subject_id AS text) = per.person_source_value
         INNER JOIN
     mimic_etl.cdm_visit_occurrence vis
     ON vis.visit_source_value =
        CONCAT(CAST(src.subject_id AS text), '|',
               COALESCE(CAST(src.hadm_id AS text), CAST(src.date_id AS text)))
         LEFT JOIN
     mimic_etl.cdm_care_site cs
     ON cs.care_site_source_value = src.current_location
         LEFT JOIN
     mimic_etl.lk_visit_concept vdc
     ON vdc.source_code = src.current_location
         LEFT JOIN
     mimic_etl.lk_visit_concept la
     ON la.source_code = src.admission_location
         LEFT JOIN
     mimic_etl.lk_visit_concept ld
     ON ld.source_code = src.discharge_location
;
