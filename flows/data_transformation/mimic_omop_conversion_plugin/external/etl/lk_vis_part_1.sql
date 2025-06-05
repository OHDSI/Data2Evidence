-- -------------------------------------------------------------------
-- lk_admissions_clean
--
-- All to visit_occurrence, to create visits with hadm_id
-- Then there will be added visits without hadm_id
-- ER admissions to visit_detail too
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_admissions_clean;
CREATE TABLE mimic_etl.lk_admissions_clean AS
SELECT src.subject_id                                             AS subject_id,
       src.hadm_id                                                AS hadm_id,
       (CASE
            WHEN src.edregtime < src.admittime THEN src.edregtime
            ELSE src.admittime END)                               AS start_datetime,     -- the earliest of
       src.dischtime                                              AS end_datetime,
       src.admission_type                                         AS admission_type,     -- current location
       src.admission_location                                     AS admission_location, -- to hospital
       src.discharge_location                                     AS discharge_location, -- from hospital
       (CASE WHEN src.edregtime IS NULL THEN FALSE ELSE TRUE END) AS is_er_admission,    -- create visit_detail if TRUE
       --
       'admissions'                                               AS unit_id,
       src.load_table_id                                          AS load_table_id,
       src.load_row_id                                            AS load_row_id,
       src.trace_id                                               AS trace_id
FROM mimic_etl.src_admissions src -- adm
;

-- -------------------------------------------------------------------
-- lk_transfers_clean
--
-- Rule 1. 
-- from transfers without discharges to visit_detail
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_transfers_clean;
CREATE TABLE mimic_etl.lk_transfers_clean AS
SELECT src.subject_id                     AS subject_id,
       COALESCE(src.hadm_id, vis.hadm_id) AS hadm_id,
       CAST(src.intime AS DATE)           AS date_id,
       src.transfer_id                    AS transfer_id,
       src.intime                         AS start_datetime,
       src.outtime                        AS end_datetime,
       src.careunit                       AS current_location, -- find prev and next for adm and disch location
       --
       'transfers'                        AS unit_id,
       src.load_table_id                  AS load_table_id,
       src.load_row_id                    AS load_row_id,
       src.trace_id                       AS trace_id
FROM mimic_etl.src_transfers src
         LEFT JOIN
     mimic_etl.lk_admissions_clean vis -- associate transfers with admissions according to
     ON vis.subject_id = src.subject_id
         AND src.intime BETWEEN vis.start_datetime AND vis.end_datetime
         AND src.hadm_id IS NULL
WHERE src.eventtype != 'discharge' -- these are not useful
;

-- -------------------------------------------------------------------
-- lk_services_clean
--
-- Rule 3.
-- SERVICES information
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_services_duplicated;
CREATE TABLE mimic_etl.lk_services_duplicated AS
SELECT trace_id,
       COUNT(*) AS row_count
FROM mimic_etl.src_services src
GROUP BY src.trace_id
HAVING COUNT(*) > 1
;


DROP TABLE IF EXISTS mimic_etl.lk_services_clean;
CREATE TABLE mimic_etl.lk_services_clean AS
SELECT src.subject_id    AS subject_id,
       src.hadm_id       AS hadm_id,
       src.transfertime  AS start_datetime,
       LEAD(src.transfertime) OVER (
           PARTITION BY src.subject_id, src.hadm_id
           ORDER BY src.transfertime
           )             AS end_datetime,
       src.curr_service  AS curr_service,
       src.prev_service  AS prev_service,
       LAG(src.curr_service) OVER (
           PARTITION BY src.subject_id, src.hadm_id
           ORDER BY src.transfertime
           )             AS lag_service,
       -- to double-check that the services sequence is still consistent
       --
       'services'        AS unit_id,
       src.load_table_id AS load_table_id,
       src.load_row_id   AS load_row_id,
       src.trace_id      AS trace_id
FROM mimic_etl.src_services src
         LEFT JOIN
     mimic_etl.lk_services_duplicated sd
     ON src.trace_id = sd.trace_id
WHERE sd.trace_id IS NULL -- remove duplicates with the exact same time of transferring
;
