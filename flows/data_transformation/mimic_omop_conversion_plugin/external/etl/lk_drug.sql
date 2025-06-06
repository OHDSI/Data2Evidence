-- -------------------------------------------------------------------
-- lk_prescriptions_clean 
-- Rule 1
-- -------------------------------------------------------------------
DROP TABLE IF EXISTS mimic_etl.lk_prescriptions_clean;
CREATE TABLE mimic_etl.lk_prescriptions_clean AS
SELECT
    -- -- 'drug:['                || COALESCE(drug, drug_name_poe, drug_name_generic,'') || ']'||
    -- 'drug:['                || COALESCE(drug,'') || ']'||
    -- 'prod_strength:['       || COALESCE(prod_strength,'') || ']'||
    -- 'drug_type:['           || COALESCE(drug_type,'') || ']'||
    -- -- 'formulary_drug_cd:['   || COALESCE(formulary_drug_cd,'') || ']' ||
    --  'dose_unit_rx:['       || COALESCE(dose_unit_rx,'') || ']' 
    --                                                                     AS concept_name,
    src.subject_id                                                                       AS subject_id,
    src.hadm_id                                                                          AS hadm_id,
    src.dose_val_rx                                                                      AS dose_val_rx,
    src.starttime                                                                        AS start_datetime,
    COALESCE(src.stoptime, src.starttime)                                                AS end_datetime,
    src.route                                                                            AS route_source_code,      --TODO: add route AS local concept,
    'mimiciv_drug_route'                                                                 AS route_source_vocabulary,
    src.form_unit_disp                                                                   AS dose_unit_source_code,  --TODO: add unit AS local concept,
    CAST(src.ndc AS text)                                                                AS ndc_source_code,        -- ndc was used for automatic/manual mapping,
    'NDC'                                                                                AS ndc_source_vocabulary,
    src.form_val_disp                                                                    AS form_val_disp,
    CAST(NULLIF(regexp_extract(src.form_val_disp, '[-]?[\d]+[.]?[\d]*', 0),'') AS DOUBLE)           AS quantity,
    -- COALESCE(
    --     -- src.drug, src.drug_name_poe, src.drug_name_generic,'')
    --     src.drug, '')
    --     || ' ' || COALESCE(src.prod_strength, '')               
    TRIM(COALESCE(
                 (CASE
                      WHEN src.drug IN ('Bag', 'Vial', 'Syringe', 'Syringe.',
                                        'Syringe (Neonatal)', 'Syringe (Chemo)', 'Soln', 'Soln.',
                                        'Sodium Chloride 0.9%  Flush') THEN pharm.medication
                      ELSE src.drug END), '') ||
         ' ' ||
         COALESCE(src.prod_strength, ''))                                                AS gcpt_source_code,       -- medication/drug + prod_strength
    'mimiciv_drug_ndc'                                                                   AS gcpt_source_vocabulary, -- source_code = label
    src.pharmacy_id                                                                      AS pharmacy_id,
    -- 
    'prescriptions'                                                                      AS unit_id,
    src.load_table_id                                                                    AS load_table_id,
    src.load_row_id                                                                      AS load_row_id,
    src.trace_id                                                                         AS trace_id

FROM mimic_etl.src_prescriptions src -- pr
         LEFT JOIN
     mimic_etl.src_pharmacy pharm
     ON src.pharmacy_id = pharm.pharmacy_id
WHERE src.starttime IS NOT NULL
  AND src.drug IS NOT NULL
;

-- -------------------------------------------------------------------
-- lk_pr_ndc_concept
-- Rule 1
-- mapping is 85% done from gsn coding
-- -------------------------------------------------------------------
DROP TABLE IF EXISTS mimic_etl.lk_pr_ndc_concept;
CREATE TABLE mimic_etl.lk_pr_ndc_concept AS
SELECT DISTINCT src.ndc_source_code AS source_code,
                vc.domain_id        AS source_domain_id,
                vc.concept_id       AS source_concept_id,
                vc2.domain_id       AS target_domain_id,
                vc2.concept_id      AS target_concept_id
FROM mimic_etl.lk_prescriptions_clean src -- pr
         LEFT JOIN
     mimic_etl.voc_concept vc
     ON vc.concept_code = src.ndc_source_code --this covers 85% of direct mapping but no standard
         AND vc.vocabulary_id = src.ndc_source_vocabulary -- NDC
         LEFT JOIN
     mimic_etl.voc_concept_relationship vcr
     ON vc.concept_id = vcr.concept_id_1
         and vcr.relationship_id = 'Maps to'
         LEFT JOIN
     mimic_etl.voc_concept vc2
     ON vc2.concept_id = vcr.concept_id_2
         AND vc2.standard_concept = 'S'
         AND vc2.invalid_reason IS NULL --covers 71% of rxnorm standards concepts
;

-- -------------------------------------------------------------------
-- lk_pr_gcpt_concept
-- Rule 1
-- -------------------------------------------------------------------
DROP TABLE IF EXISTS mimic_etl.lk_pr_gcpt_concept;
CREATE TABLE mimic_etl.lk_pr_gcpt_concept AS
SELECT DISTINCT src.gcpt_source_code AS source_code,
                vc.domain_id         AS source_domain_id,
                vc.concept_id        AS source_concept_id,
                vc2.domain_id        AS target_domain_id,
                vc2.concept_id       AS target_concept_id
FROM mimic_etl.lk_prescriptions_clean src -- pr
         LEFT JOIN
     mimic_etl.voc_concept vc
     ON vc.concept_code = src.gcpt_source_code
         AND vc.vocabulary_id = src.gcpt_source_vocabulary -- mimiciv_drug_ndc
         LEFT JOIN
     mimic_etl.voc_concept_relationship vcr
     ON vc.concept_id = vcr.concept_id_1
         and vcr.relationship_id = 'Maps to'
         LEFT JOIN
     mimic_etl.voc_concept vc2
     ON vc2.concept_id = vcr.concept_id_2
         AND vc2.standard_concept = 'S'
         AND vc2.invalid_reason IS NULL --covers 71% of rxnorm standards concepts
;

-- -------------------------------------------------------------------
-- lk_pr_route_concept
-- Rule 1
-- -------------------------------------------------------------------
DROP TABLE IF EXISTS mimic_etl.lk_pr_route_concept;
CREATE TABLE mimic_etl.lk_pr_route_concept AS
SELECT DISTINCT src.route_source_code AS source_code,
                vc.domain_id          AS source_domain_id,
                vc.concept_id         AS source_concept_id,
                vc2.domain_id         AS target_domain_id,
                vc2.concept_id        AS target_concept_id
FROM mimic_etl.lk_prescriptions_clean src -- pr
         LEFT JOIN
     mimic_etl.voc_concept vc
     ON vc.concept_code = src.route_source_code
         AND vc.vocabulary_id = src.route_source_vocabulary
         LEFT JOIN
     mimic_etl.voc_concept_relationship vcr
     ON vc.concept_id = vcr.concept_id_1
         and vcr.relationship_id = 'Maps to'
         LEFT JOIN
     mimic_etl.voc_concept vc2
     ON vc2.concept_id = vcr.concept_id_2
         AND vc2.standard_concept = 'S'
         AND vc2.invalid_reason IS NULL --covers 71% of rxnorm standards concepts
;

-- -------------------------------------------------------------------
-- lk_drug_mapped
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_drug_mapped;
CREATE TABLE mimic_etl.lk_drug_mapped AS
SELECT src.hadm_id                                                             AS hadm_id,
       src.subject_id                                                          AS subject_id,
       COALESCE(vc_ndc.target_concept_id, vc_gcpt.target_concept_id, 0)        AS target_concept_id,
       COALESCE(vc_ndc.target_domain_id, vc_gcpt.target_domain_id, 'Drug')     AS target_domain_id,
       src.start_datetime                                                      AS start_datetime,
       CASE
           WHEN src.end_datetime < src.start_datetime THEN src.start_datetime
           ELSE src.end_datetime
           END                                                                 AS end_datetime,
       32838                                                                   AS type_concept_id, -- OMOP4976911 EHR prescription
       src.quantity                                                            AS quantity,
       COALESCE(vc_route.target_concept_id, 0)                                 AS route_concept_id,
       COALESCE(vc_ndc.source_code, vc_gcpt.source_code, src.gcpt_source_code) AS source_code,
       COALESCE(vc_ndc.source_concept_id, vc_gcpt.source_concept_id, 0)        AS source_concept_id,
       src.route_source_code                                                   AS route_source_code,
       src.dose_unit_source_code                                               AS dose_unit_source_code,
       src.form_val_disp                                                       AS quantity_source_value,
       src.pharmacy_id                                                         AS pharmacy_id,     -- to investigate pharmacy.medication
       --
       CONCAT('drug.', src.unit_id)                                            AS unit_id,
       src.load_table_id                                                       AS load_table_id,
       src.load_row_id                                                         AS load_row_id,
       src.trace_id                                                            AS trace_id
FROM mimic_etl.lk_prescriptions_clean src
         LEFT JOIN
     mimic_etl.lk_pr_ndc_concept vc_ndc
     ON src.ndc_source_code = vc_ndc.source_code
         AND vc_ndc.target_concept_id IS NOT NULL
         LEFT JOIN
     mimic_etl.lk_pr_gcpt_concept vc_gcpt
     ON src.gcpt_source_code = vc_gcpt.source_code
         AND vc_gcpt.target_concept_id IS NOT NULL
         LEFT JOIN
     mimic_etl.lk_pr_route_concept vc_route
     ON src.route_source_code = vc_route.source_code
         AND vc_route.target_concept_id IS NOT NULL
;
