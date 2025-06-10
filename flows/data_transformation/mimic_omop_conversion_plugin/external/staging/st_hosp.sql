-- -------------------------------------------------------------------
-- src_diagnoses_icd
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_diagnoses_icd;

CREATE TABLE mimic_etl.src_diagnoses_icd AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                    AS subject_id,
             hadm_id                                       AS hadm_id,
             seq_num                                       AS seq_num,
             icd_code                                      AS icd_code,
             icd_version                                   AS icd_version,
             --
             'diagnoses_icd'                               AS load_table_id,
             (SELECT  main.sha1(hadm_id::text || seq_num::text)) AS trace_id
      FROM mimiciv_hosp.diagnoses_icd) t
;

-- -------------------------------------------------------------------
-- for Measurement
-- -------------------------------------------------------------------

-- -------------------------------------------------------------------
-- src_services
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_services;

CREATE TABLE mimic_etl.src_services AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                                             AS subject_id,
             hadm_id                                                                AS hadm_id,
             transfertime                                                           AS transfertime,
             prev_service                                                           AS prev_service,
             curr_service                                                           AS curr_service,
             --
             'services'                                                             AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || transfertime::text)) AS trace_id
      FROM mimiciv_hosp.services) t
;

-- -------------------------------------------------------------------
-- src_labevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_labevents;

CREATE TABLE mimic_etl.src_labevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT labevent_id                      AS labevent_id,
             subject_id                       AS subject_id,
             charttime                        AS charttime,
             hadm_id                          AS hadm_id,
             itemid                           AS itemid,
             valueuom                         AS valueuom,
             value                            AS value,
             flag                             AS flag,
             ref_range_lower                  AS ref_range_lower,
             ref_range_upper                  AS ref_range_upper,
             --
             'labevents'                      AS load_table_id,
             (SELECT  main.sha1(labevent_id::text)) AS trace_id
      FROM mimiciv_hosp.labevents) t
;

-- -------------------------------------------------------------------
-- src_d_labitems
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_d_labitems;

CREATE TABLE mimic_etl.src_d_labitems AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT itemid                      AS itemid,
             label                       AS label,
             fluid                       AS fluid,
             category                    AS category,
             CAST(NULL AS TEXT)          AS loinc_code, -- MIMIC IV 2.0 change, the field is removed
             --
             'd_labitems'                AS load_table_id,
             (SELECT  main.sha1(itemid::text)) AS trace_id
      FROM mimiciv_hosp.d_labitems) t
;


-- -------------------------------------------------------------------
-- for Procedure
-- -------------------------------------------------------------------

-- -------------------------------------------------------------------
-- src_procedures_icd
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_procedures_icd;

CREATE TABLE mimic_etl.src_procedures_icd AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                                                              AS subject_id,
             hadm_id                                                                                 AS hadm_id,
             icd_code                                                                                AS icd_code,
             icd_version                                                                             AS icd_version,
             --
             'procedures_icd'                                                                        AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || icd_code::text || icd_version::text)) AS trace_id
      FROM mimiciv_hosp.procedures_icd) t
;

-- -------------------------------------------------------------------
-- src_hcpcsevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_hcpcsevents;

CREATE TABLE mimic_etl.src_hcpcsevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT hadm_id                                                                             AS hadm_id,
             subject_id                                                                          AS subject_id,
             hcpcs_cd                                                                            AS hcpcs_cd,
             seq_num                                                                             AS seq_num,
             short_description                                                                   AS short_description,
             --
             'hcpcsevents'                                                                       AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || hcpcs_cd::text || seq_num::text)) AS trace_id
      FROM mimiciv_hosp.hcpcsevents) t
;


-- -------------------------------------------------------------------
-- src_drgcodes
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_drgcodes;

CREATE TABLE mimic_etl.src_drgcodes AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT hadm_id                                                                          AS hadm_id,
             subject_id                                                                       AS subject_id,
             drg_code                                                                         AS drg_code,
             description                                                                      AS description,
             --
             'drgcodes'                                                                       AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || COALESCE(drg_code::text, ''))) AS trace_id
      FROM mimiciv_hosp.drgcodes) t
;

-- -------------------------------------------------------------------
-- src_prescriptions
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_prescriptions;

CREATE TABLE mimic_etl.src_prescriptions AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT hadm_id                                                                                  AS hadm_id,
             subject_id                                                                               AS subject_id,
             pharmacy_id                                                                              AS pharmacy_id,
             starttime                                                                                AS starttime,
             stoptime                                                                                 AS stoptime,
             drug_type                                                                                AS drug_type,
             drug                                                                                     AS drug,
             gsn                                                                                      AS gsn,
             ndc                                                                                      AS ndc,
             prod_strength                                                                            AS prod_strength,
             form_rx                                                                                  AS form_rx,
             dose_val_rx                                                                              AS dose_val_rx,
             dose_unit_rx                                                                             AS dose_unit_rx,
             form_val_disp                                                                            AS form_val_disp,
             form_unit_disp                                                                           AS form_unit_disp,
             doses_per_24_hrs                                                                         AS doses_per_24_hrs,
             route                                                                                    AS route,
             --
             'prescriptions'                                                                          AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || pharmacy_id::text || starttime::text)) AS trace_id
      FROM mimiciv_hosp.prescriptions) t
;


-- -------------------------------------------------------------------
-- src_microbiologyevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_microbiologyevents;

CREATE TABLE mimic_etl.src_microbiologyevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT microevent_id                                                           AS microevent_id,
             subject_id                                                              AS subject_id,
             hadm_id                                                                 AS hadm_id,
             chartdate                                                               AS chartdate,
             charttime                                                               AS charttime,           -- usage: COALESCE(charttime, chartdate)
             spec_itemid                                                             AS spec_itemid,         -- d_micro, type of specimen taken. If no grouth, then all other fields is null
             spec_type_desc                                                          AS spec_type_desc,      -- for reference
             test_itemid                                                             AS test_itemid,         -- d_micro, what test is taken, goes to measurement
             test_name                                                               AS test_name,           -- for reference
             org_itemid                                                              AS org_itemid,          -- d_micro, what bacteria have grown
             org_name                                                                AS org_name,            -- for reference
             ab_itemid                                                               AS ab_itemid,           -- d_micro, antibiotic tested on the bacteria
             ab_name                                                                 AS ab_name,             -- for reference
             dilution_comparison                                                     AS dilution_comparison, -- operator sign
             dilution_value                                                          AS dilution_value,      -- numeric value
             interpretation                                                          AS interpretation,      -- bacteria's degree of resistance to the antibiotic
             --
             'microbiologyevents'                                                    AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || microevent_id::text)) AS trace_id
      FROM mimiciv_hosp.microbiologyevents) t
;

-- -------------------------------------------------------------------
-- src_d_micro
-- raw d_micro is no longer available both in mimic_hosp and mimiciv_hosp
-- -------------------------------------------------------------------

-- DROP TABLE IF EXISTS mimic_etl.src_d_micro;
--
-- CREATE TABLE mimic_etl.src_d_micro AS
-- SELECT
--     itemid                      AS itemid, -- numeric ID
--     label                       AS label, -- source_code for custom mapping
--     category                    AS category, 
--     --
--     'd_micro'                   AS load_table_id,
--     (SELECT nextval('id_sequence'))   AS load_row_id,
--     TO_JSON_STRING(STRUCT(
--         itemid AS itemid
--     ))                                  AS trace_id
-- FROM
--     mimiciv_hosp.d_micro
-- ;

-- -------------------------------------------------------------------
-- src_d_micro
-- MIMIC IV 2.0: generate src_d_micro from microbiologyevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_d_micro;

CREATE TABLE mimic_etl.src_d_micro AS
WITH d_micro AS (SELECT DISTINCT ab_itemid                                     AS itemid, -- numeric ID
                                 ab_name                                       AS label,  -- source_code for custom mapping
                                 'ANTIBIOTIC'                                  AS category,
                                 --
                                 (SELECT  main.sha1('ab_itemid' || ab_itemid::text)) AS trace_id
                 FROM mimiciv_hosp.microbiologyevents
                 WHERE ab_itemid IS NOT NULL
                 UNION ALL
                 SELECT DISTINCT test_itemid                                       AS itemid, -- numeric ID
                                 test_name                                         AS label,  -- source_code for custom mapping
                                 'MICROTEST'                                       AS category,
                                 --
                                 (SELECT  main.sha1('test_itemid' || test_itemid::text)) AS trace_id
                 FROM mimiciv_hosp.microbiologyevents
                 WHERE test_itemid IS NOT NULL
                 UNION ALL
                 SELECT DISTINCT org_itemid                                      AS itemid, -- numeric ID
                                 org_name                                        AS label,  -- source_code for custom mapping
                                 'ORGANISM'                                      AS category,
                                 --
                                 (SELECT  main.sha1('org_itemid' || org_itemid::text)) AS trace_id
                 FROM mimiciv_hosp.microbiologyevents
                 WHERE org_itemid IS NOT NULL
                 UNION ALL
                 SELECT DISTINCT spec_itemid                                       AS itemid, -- numeric ID
                                 spec_type_desc                                    AS label,  -- source_code for custom mapping
                                 'SPECIMEN'                                        AS category,
                                 --
                                 (SELECT  main.sha1('spec_itemid' || spec_itemid::text)) AS trace_id
                 FROM mimiciv_hosp.microbiologyevents
                 WHERE spec_itemid IS NOT NULL)
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT itemid               AS itemid, -- numeric ID
             label                AS label,  -- source_code for custom mapping
             category             AS category,
             --
             'microbiologyevents' AS load_table_id,
             trace_id             AS trace_id
      FROM d_micro) t
;

-- -------------------------------------------------------------------
-- src_pharmacy
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_pharmacy;

CREATE TABLE mimic_etl.src_pharmacy AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT pharmacy_id                      AS pharmacy_id,
             medication                       AS medication,
             -- hadm_id                             AS hadm_id,
             -- subject_id                          AS subject_id,
             -- starttime                           AS starttime,
             -- stoptime                            AS stoptime,
             -- route                               AS route,
             --
             'pharmacy'                       AS load_table_id,
             (SELECT  main.sha1(pharmacy_id::text)) AS trace_id
      FROM mimiciv_hosp.pharmacy) t
;

