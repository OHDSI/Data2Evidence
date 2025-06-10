-- -------------------------------------------------------------------
-- src_procedureevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_procedureevents;
CREATE TABLE mimic_etl.src_procedureevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT hadm_id                                                             AS hadm_id,
             subject_id                                                          AS subject_id,
             stay_id                                                             AS stay_id,
             itemid                                                              AS itemid,
             starttime                                                           AS starttime,
             value                                                               AS value,
             CAST(0 AS bigint)                                                   AS cancelreason, -- MIMIC IV 2.0 change, the field is removed
             --
             'procedureevents'                                                   AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || starttime::text)) AS trace_id
      FROM mimiciv_icu.procedureevents) t
;

-- -------------------------------------------------------------------
-- src_d_items
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_d_items;
CREATE TABLE mimic_etl.src_d_items AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT itemid                                       AS itemid,
             label                                        AS label,
             linksto                                      AS linksto,
             -- abbreviation 
             -- category
             -- unitname
             -- param_type
             -- lownormalvalue
             -- highnormalvalue
             --
             'd_items'                                    AS load_table_id,
             (SELECT  main.sha1(itemid::text || linksto::text)) AS trace_id
      FROM mimiciv_icu.d_items) t
;

-- -------------------------------------------------------------------
-- src_datetimeevents
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.src_datetimeevents;
CREATE TABLE mimic_etl.src_datetimeevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                                              AS subject_id,
             hadm_id                                                                 AS hadm_id,
             stay_id                                                                 AS stay_id,
             itemid                                                                  AS itemid,
             charttime                                                               AS charttime,
             value                                                                   AS value,
             --
             'datetimeevents'                                                        AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || stay_id::text || charttime::text)) AS trace_id
      FROM mimiciv_icu.datetimeevents) t
;


DROP TABLE IF EXISTS mimic_etl.src_chartevents;
CREATE TABLE mimic_etl.src_chartevents AS
SELECT t.*, nextval('id_sequence') AS load_row_id
FROM (SELECT subject_id                                                              AS subject_id,
             hadm_id                                                                 AS hadm_id,
             stay_id                                                                 AS stay_id,
             itemid                                                                  AS itemid,
             charttime                                                               AS charttime,
             value                                                                   AS value,
             valuenum                                                                AS valuenum,
             valueuom                                                                AS valueuom,
             --
             'chartevents'                                                           AS load_table_id,
             (SELECT  main.sha1(subject_id::text || hadm_id::text || stay_id::text || charttime::text)) AS trace_id
      FROM mimiciv_icu.chartevents) t
;
