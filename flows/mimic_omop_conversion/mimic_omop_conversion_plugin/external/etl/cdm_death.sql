-- -------------------------------------------------------------------
-- lk_death_adm_mapped
-- Rule 1, admissionss
-- -------------------------------------------------------------------

DROP TABLE IF EXISTS mimic_etl.lk_death_adm_mapped;
CREATE TABLE mimic_etl.lk_death_adm_mapped AS
SELECT DISTINCT src.subject_id,
                FIRST_VALUE(src.deathtime) OVER (
                    PARTITION BY src.subject_id
                    ORDER BY src.admittime ASC
                    )             AS deathtime,
                FIRST_VALUE(src.dischtime) OVER (
                    PARTITION BY src.subject_id
                    ORDER BY src.admittime ASC
                    )             AS dischtime,
                32817             AS type_concept_id, -- OMOP4976890 EHR
                --
                'admissions'      AS unit_id,
                src.load_table_id AS load_table_id,
                FIRST_VALUE(src.load_row_id) OVER (
                    PARTITION BY src.subject_id
                    ORDER BY src.admittime ASC
                    )             AS load_row_id,
                FIRST_VALUE(src.trace_id) OVER (
                    PARTITION BY src.subject_id
                    ORDER BY src.admittime ASC
                    )             AS trace_id
FROM mimic_etl.src_admissions src -- adm
WHERE src.deathtime IS NOT NULL
;

-- -------------------------------------------------------------------
-- cdm_death
-- -------------------------------------------------------------------

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_death;
CREATE TABLE mimic_etl.cdm_death
(
    person_id               bigint not null,
    death_date              DATE   not null,
    death_datetime          timestamp,
    death_type_concept_id   bigint not null,
    cause_concept_id        bigint,
    cause_source_value      text,
    cause_source_concept_id bigint,
    -- 
    unit_id                 text,
    load_table_id           text,
    load_row_id             bigint,
    trace_id                text
)
;

INSERT INTO mimic_etl.cdm_death
SELECT per.person_id                 AS person_id,
       CAST((CASE
                 WHEN src.deathtime <= src.dischtime THEN src.deathtime
                 ELSE src.dischtime
           END
           ) AS DATE)                AS death_date,
       CASE
           WHEN src.deathtime <= src.dischtime THEN src.deathtime
           ELSE src.dischtime
           END                       AS death_datetime,
       src.type_concept_id           AS death_type_concept_id,
       0                             AS cause_concept_id,
       CAST(NULL AS text)            AS cause_source_value,
       0                             AS cause_source_concept_id,
       --
       CONCAT('death.', src.unit_id) AS unit_id,
       src.load_table_id             AS load_table_id,
       src.load_row_id               AS load_row_id,
       src.trace_id                  AS trace_id
FROM mimic_etl.lk_death_adm_mapped src
         INNER JOIN
     mimic_etl.cdm_person per
     ON CAST(src.subject_id AS text) = per.person_source_value
;