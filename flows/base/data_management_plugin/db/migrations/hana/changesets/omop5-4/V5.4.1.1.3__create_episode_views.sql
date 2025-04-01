--liquibase formatted sql
--changeset alp:V5.4.1.1.3__create_episode_views

CREATE OR REPLACE VIEW "VIEW::OMOP.EPISODE"(
	"EPISODE_ID",
    "PATIENT_ID",
    "EPISODE_CONCEPT_ID",
    "EPISODE_NAME",
    "EPISODE_TYPE_CONCEPT_ID",
    "EPISODE_TYPE_NAME",
    "EPISODE_OBJECT_CONCEPT_ID",
    "EPISODE_OBJECT_NAME",
    "EPISODE_START_DATE",
    "EPISODE_END_DATE",
    "EPISODE_START_DATETIME",
    "EPISODE_END_DATETIME",
    "EPISODE_PARENT_ID",
    "EPISODE_NUMBER",
    "EPISODE_CONCEPT_CODE",
    "EPISODE_TYPE_CONCEPT_CODE",
    "EPISODE_OBJECT_CONCEPT_CODE"

) AS (
    SELECT 
        "e_$0"."EPISODE_ID",
        "p_$1"."PATIENT_ID",
        "e_$0"."EPISODE_CONCEPT_ID",
        "c_$2"."CONCEPT_NAME"               AS "EPISODE_NAME",
        "e_$0"."EPISODE_TYPE_CONCEPT_ID",
        "ct_$3"."CONCEPT_NAME"              AS "EPISODE_TYPE_NAME",
        "e_$0"."EPISODE_OBJECT_CONCEPT_ID",
        "eo_$4"."CONCEPT_NAME"              AS "EPISODE_OBJECT_NAME",
        "e_$0"."EPISODE_START_DATE",
        "e_$0"."EPISODE_END_DATE",
        "e_$0"."EPISODE_START_DATETIME",
        "e_$0"."EPISODE_END_DATETIME",
        "e_$0"."EPISODE_PARENT_ID",
        "e_$0"."EPISODE_NUMBER",
        "c_$2"."CONCEPT_CODE"               AS "EPISODE_CONCEPT_CODE",
        "ct_$3"."CONCEPT_CODE"              AS "EPISODE_TYPE_CONCEPT_CODE",
        "eo_$4"."CONCEPT_CODE"              AS "EPISODE_OBJECT_CONCEPT_CODE"

    FROM 
        (
          (
            (
              (
              "EPISODE" AS "e_$0"
              INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" 
                ON ("e_$0"."PERSON_ID" = "p_$1"."PATIENT_ID")
              )
            LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" 
                ON ("c_$2"."CONCEPT_ID" = "e_$0"."EPISODE_CONCEPT_ID")
            )
            LEFT JOIN "VIEW::OMOP.CONCEPT" AS "ct_$3" 
                ON ("ct_$3"."CONCEPT_ID" = "e_$0"."EPISODE_TYPE_CONCEPT_ID")
          )
        LEFT JOIN "VIEW::OMOP.CONCEPT" AS "eo_$4" 
            ON ("eo_$4"."CONCEPT_ID" = "e_$0"."EPISODE_OBJECT_CONCEPT_ID")
        )
        
    )
  WITH READ ONLY;

-- Depends on VIEW::OMOP.EPISODE
CREATE OR REPLACE VIEW "VIEW::OMOP.EPISODE_EVENT"(
    "EVENT_ID",
    "EPISODE_ID",
    "PATIENT_ID",
    "EPISODE_EVENT_FIELD_CONCEPT_ID",
    "EPISODE_EVENT_FIELD_NAME",
    "EPISODE_CONCEPT_ID",
    "EPISODE_NAME",
    "EPISODE_TYPE_CONCEPT_ID",
    "EPISODE_TYPE_NAME",
    "EPISODE_OBJECT_CONCEPT_ID",
    "EPISODE_OBJECT_NAME",
    "EPISODE_START_DATE",
    "EPISODE_END_DATE",
    "EPISODE_START_DATETIME",
    "EPISODE_END_DATETIME",
    "EPISODE_PARENT_ID",
    "EPISODE_NUMBER",
    "EPISODE_CONCEPT_CODE",
    "EPISODE_TYPE_CONCEPT_CODE",
    "EPISODE_OBJECT_CONCEPT_CODE",
    "EPISODE_EVENT_FIELD_CONCEPT_CODE"
) AS (
    SELECT
        "ee_$0"."EVENT_ID",
        "ee_$0"."EPISODE_ID",
        "ee_$0"."EPISODE_EVENT_FIELD_CONCEPT_ID",
        "c_$2"."CONCEPT_NAME"           AS "EPISODE_EVENT_FIELD_NAME",
        "c_$2"."CONCEPT_CODE"                       AS "EPISODE_EVENT_FIELD_CONCEPT_CODE",           
        "e_$1"."PATIENT_ID",
        "e_$1"."EPISODE_CONCEPT_ID",
        "e_$1"."EPISODE_NAME",
        "e_$1"."EPISODE_TYPE_CONCEPT_ID",
        "e_$1"."EPISODE_TYPE_NAME",
        "e_$1"."EPISODE_OBJECT_CONCEPT_ID",
        "e_$1"."EPISODE_OBJECT_NAME",
        "e_$1"."EPISODE_START_DATE",
        "e_$1"."EPISODE_END_DATE",
        "e_$1"."EPISODE_START_DATETIME",
        "e_$1"."EPISODE_END_DATETIME",
        "e_$1"."EPISODE_PARENT_ID",
        "e_$1"."EPISODE_NUMBER",
        "e_$1"."EPISODE_CONCEPT_CODE",
        "e_$1"."EPISODE_TYPE_CONCEPT_CODE",
        "e_$1"."EPISODE_OBJECT_CONCEPT_CODE"
    FROM 
        (
          (
            "EPISODE_EVENT" AS "ee_$0"
            LEFT JOIN "VIEW::OMOP.EPISODE" AS "e_$1"
                ON ("ee_$0"."EPISODE_ID" = "e_$1"."EPISODE_ID")
          )
        LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" 
            ON ("c_$2"."CONCEPT_ID" = "ee_$0"."EPISODE_EVENT_FIELD_CONCEPT_ID")
        )
    )
  WITH READ ONLY;


--rollback DROP VIEW IF EXISTS "VIEW::OMOP.EPISODE_EVENT";
--rollback DROP VIEW IF EXISTS "VIEW::OMOP.EPISODE";