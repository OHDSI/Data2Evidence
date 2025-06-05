-- -------------------------------------------------------------------
-- lk_trans_careunit_clean
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_trans_careunit_clean;
CREATE TABLE mimic_etl.lk_trans_careunit_clean AS
SELECT src.careunit      AS source_code,
       src.load_table_id AS load_table_id,
       0                 AS load_row_id,
       MIN(src.trace_id) AS trace_id
FROM mimic_etl.src_transfers src
WHERE src.careunit IS NOT NULL
GROUP BY careunit,
         load_table_id
;



-- -------------------------------------------------------------------
-- cdm_care_site
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.cdm_care_site;
CREATE TABLE mimic_etl.cdm_care_site
(
    care_site_id                  bigint not null,
    care_site_name                text,
    place_of_service_concept_id   bigint,
    location_id                   bigint,
    care_site_source_value        text,
    place_of_service_source_value text,
    -- 
    unit_id                       text,
    load_table_id                 text,
    load_row_id                   bigint,
    trace_id                      text
)
;

INSERT INTO mimic_etl.cdm_care_site
SELECT nextval('id_sequence') AS care_site_id, t.*
FROM (SELECT src.source_code       AS care_site_name,
             vc2.concept_id        AS place_of_service_concept_id,
             1                     AS location_id, -- hard-coded BIDMC
             src.source_code       AS care_site_source_value,
             src.source_code       AS place_of_service_source_value,
             'care_site.transfers' AS unit_id,
             src.load_table_id     AS load_table_id,
             src.load_row_id       AS load_row_id,
             src.trace_id          AS trace_id
      FROM mimic_etl.lk_trans_careunit_clean src
               LEFT JOIN
           mimic_etl.voc_concept vc
           ON vc.concept_code = src.source_code
               AND vc.vocabulary_id = 'mimiciv_cs_place_of_service' -- gcpt_care_site
               LEFT JOIN
           mimic_etl.voc_concept_relationship vcr
           ON vc.concept_id = vcr.concept_id_1
               AND vcr.relationship_id = 'Maps to'
               LEFT JOIN
           mimic_etl.voc_concept vc2
           ON vc2.concept_id = vcr.concept_id_2
               AND vc2.standard_concept = 'S'
               AND vc2.invalid_reason IS NULL) t
;

