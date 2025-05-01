--liquibase formatted sql
--changeset alp:V1.0.0.1.3__create_omop_views_in_uppercase


CREATE OR REPLACE VIEW "VIEW::OMOP.CONCEPT" AS 
  (
      SELECT 
          concept_id as "CONCEPT_ID",
          concept_name as "CONCEPT_NAME",
          domain_id as "DOMAIN_ID",
          vocabulary_id as "VOCABULARY_ID",
          concept_class_id as "CONCEPT_CLASS_ID",
          standard_concept as "STANDARD_CONCEPT",
          concept_code as "CONCEPT_CODE",
          valid_start_date as "VALID_START_DATE",
          valid_end_date as "VALID_END_DATE",
          invalid_reason as "INVALID_REASON"
      FROM "cdmvocab".concept
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.PATIENT" (
  "PATIENT_ID",
  "BIRTH_DATE",
  "MONTH_OF_BIRTH",
  "YEAR_OF_BIRTH",
  "DEATH_DATE",
  "GENDER",
  "RACE",
  "ETHNICITY",
  "STATE",
  "COUNTY",
  "GENDER_CONCEPT_CODE",
  "RACE_CONCEPT_CODE",
  "ETHNICITY_CONCEPT_CODE",
  "GENDER_CONCEPT_ID",
  "RACE_CONCEPT_ID",
  "ETHNICITY_CONCEPT_ID"
  ) AS (
  SELECT
    "p_$0".person_id AS "PATIENT_ID",
    TO_DATE (
      (
        (TO_CHAR("p_$0".year_of_birth, '0000') || TO_CHAR("p_$0".month_of_birth, '00')) || 
        TO_CHAR("p_$0".day_of_birth, '00')
      ), 'yyyymmdd') AS "BIRTH_DATE",
    "p_$0".month_of_birth AS "MONTH_OF_BIRTH",
    "p_$0".year_of_birth AS "YEAR_OF_BIRTH_OF_BIRTH",
    COALESCE ("d_$1".death_date, NULL) AS "DEATH_DATE",
    "gender_c_$2"."CONCEPT_NAME" AS "GENDER",
    "race_c_$3"."CONCEPT_NAME" AS "RACE",
    "ethnicity_c_$4"."CONCEPT_NAME" AS "ETHNICITY",
    "l_$5".state AS "STATE",
    "l_$5".county AS "COUNTY",
    "gender_c_$2"."CONCEPT_CODE" AS "GENDER_CONCEPT_CODE",
    "race_c_$3"."CONCEPT_CODE" AS "RACE_CONCEPT_CODE",
    "ethnicity_c_$4"."CONCEPT_CODE" AS "ETHNICITY_CONCEPT_CODE",
    "gender_c_$2"."CONCEPT_ID" AS "GENDER_CONCEPT_ID",
    "race_c_$3"."CONCEPT_ID" AS "RACE_CONCEPT_ID",
    "ethnicity_c_$4"."CONCEPT_ID" AS "ETHNICITY_CONCEPT_ID"
  FROM
    (
      (
        (
          (
            (
              person AS "p_$0"
              LEFT OUTER JOIN death AS "d_$1" ON("d_$1".person_id = "p_$0".person_id)
            )
            LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "gender_c_$2" ON(
              "gender_c_$2"."CONCEPT_ID" = "p_$0".gender_concept_id
            )
          )
          LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "race_c_$3" ON(
            "race_c_$3"."CONCEPT_ID" = "p_$0".race_concept_id
          )
        )
        LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "ethnicity_c_$4" ON(
            "ethnicity_c_$4"."CONCEPT_ID" = "p_$0".ethnicity_concept_id
        )
      )
      LEFT OUTER JOIN location AS "l_$5" ON ("l_$5".location_id = "p_$0".location_id)
    )
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.OBS" (
    "OBSERVATION_ID",
    "PATIENT_ID",
    "OBSERVATION_CONCEPT_ID",
    "OBSERVATION_NAME",
    "OBSERVATION_DATE",
    "OBSERVATION_DATETIME",
    "OBSERVATION_TYPE_CONCEPT_ID",
    "OBSERVATION_TYPE_NAME",
    "VALUE_AS_NUMBER",
    "VALUE_AS_STRING",
    "VALUE_AS_CONCEPT_ID",
    "VALUE_NAME",
    "QUALIFIER_CONCEPT_ID",
    "QUALIFIER_NAME",
    "UNIT_CONCEPT_ID",
    "UNIT_NAME",
    "PROVIDER_ID",
    "VISIT_OCCURRENCE_ID",
    "OBSERVATION_SOURCE_VALUE",
    "OBSERVATION_SOURCE_CONCEPT_ID",
    "UNIT_SOURCE_VALUE",
    "QUALIFIER_SOURCE_VALUE",
    "OBSERVATION_CONCEPT_CODE",
    "OBSERVATION_TYPE_CONCEPT_CODE",
    "VALUE_AS_CONCEPT_CODE",
    "QUALIFIER_CONCEPT_CODE",
    "UNIT_CONCEPT_CODE",
    "OBSERVATION_EVENT_ID",
    "OBS_EVENT_FIELD_CONCEPT_ID"
  ) AS (
  SELECT
    "o_$0".observation_id AS "OBSERVATION_ID",
    "o_$0".person_id AS "PATIENT_ID",
    "o_$0".observation_concept_id AS "OBSERVATION_CONCEPT_ID",
    "c_$1"."CONCEPT_NAME" AS "OBSERVATION_NAME",
    "o_$0".observation_date AS "OBSERVATION_DATE",
    "o_$0".observation_datetime AS "OBSERVATION_DATETIME",
    "o_$0".observation_type_concept_id AS "OBSERVATION_TYPE_CONCEPT_ID",
    "t_$2"."CONCEPT_NAME" AS "OBSERVATION_TYPE_NAME",
    "o_$0".value_as_number AS "VALUE_AS_NUMBER",
    "o_$0".value_as_string AS "VALUE_AS_STRING",
    "o_$0".value_as_concept_id AS "VALUE_AS_CONCEPT_ID",
    "v_$3"."CONCEPT_NAME" AS "VALUE_NAME",
    "o_$0".qualifier_concept_id AS "QUALIFIER_CONCEPT_ID",
    "q_$4"."CONCEPT_NAME" AS "QUALIFIER_NAME",
    "o_$0".unit_concept_id AS "UNIT_CONCEPT_ID",
    "u_$5"."CONCEPT_NAME" AS "UNIT_NAME",
    "o_$0".provider_id AS "PROVIDER_ID",
    "o_$0".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
    "o_$0".observation_source_value AS "OBSERVATION_SOURCE_VALUE",
    "o_$0".observation_source_concept_id AS "OBSERVATION_SOURCE_CONCEPT_ID",
    "o_$0".unit_source_value AS "UNIT_SOURCE_VALUE",
    "o_$0".qualifier_source_value AS "QUALIFIER_SOURCE_VALUE",
    "c_$1"."CONCEPT_CODE" AS "OBSERVATION_CONCEPT_CODE",
    "t_$2"."CONCEPT_CODE" AS "OBSERVATION_TYPE_CONCEPT_CODE",
    "v_$3"."CONCEPT_CODE" AS "VALUE_AS_CONCEPT_CODE",
    "q_$4"."CONCEPT_CODE" AS "QUALIFIER_CONCEPT_CODE",
    "u_$5"."CONCEPT_CODE" AS "UNIT_CONCEPT_CODE",
    "o_$0".observation_event_id AS "OBSERVATION_EVENT_ID",
    "o_$0".obs_event_field_concept_id AS "OBS_EVENT_FIELD_CONCEPT_ID"
  FROM
    (
      (
        (
          (
            (
              observation AS "o_$0"
              LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "c_$1" ON (
                "c_$1"."CONCEPT_ID" = "o_$0".observation_concept_id
              )
            )
            LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "t_$2" ON (
              "t_$2"."CONCEPT_ID" = "o_$0".observation_type_concept_id
            )
          )
          LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "v_$3" ON (
            "v_$3"."CONCEPT_ID" = "o_$0".value_as_concept_id
          )
        )
        LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "q_$4" ON (
          "q_$4"."CONCEPT_ID" = "o_$0".qualifier_concept_id
        )
      )
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "u_$5" ON ("u_$5"."CONCEPT_ID" = "o_$0".unit_concept_id)
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.PROC" (
    "PROCEDURE_OCCURRENCE_ID",
    "PATIENT_ID",
    "PROCEDURE_CONCEPT_ID",
    "PROCEDURE_NAME",
    "PROCEDURE_DATE",
    "PROCEDURE_DATETIME",
    "PROCEDURE_TYPE_CONCEPT_ID",
    "PROCEDURE_TYPE_NAME",
    "MODIFIER_CONCEPT_ID",
    "MODIFIER_NAME",
    "QUANTITY",
    "PROVIDER_ID",
    "VISIT_OCCURRENCE_ID",
    "PROCEDURE_SOURCE_VALUE",
    "PROCEDURE_SOURCE_CONCEPT_ID",
    "MODIFIER_SOURCE_VALUE",
    "PROCEDURE_CONCEPT_CODE",
    "PROCEDURE_TYPE_CONCEPT_CODE",
    "MODIFIER_CONCEPT_CODE"
  ) AS (
  SELECT
    "p_$0".procedure_occurrence_id AS "PROCEDURE_OCCURRENCE_ID",
    "p_$0".person_id AS "PATIENT_ID",
    "p_$0".procedure_concept_id AS "PROCEDURE_CONCEPT_ID",
    "c_$1"."CONCEPT_NAME" AS "PROCEDURE_NAME",
    "p_$0".procedure_date AS "PROCEDURE_DATE",
    "p_$0".procedure_datetime AS "PROCEDURE_DATETIME",
    "p_$0".procedure_type_concept_id AS "PROCEDURE_TYPE_CONCEPT_ID",
    "t_$2"."CONCEPT_NAME" AS "PROCEDURE_TYPE_NAME",
    "p_$0".modifier_concept_id AS "MODIFIER_CONCEPT_ID",
    "m_$3"."CONCEPT_NAME" AS "MODIFIER_NAME",
    "p_$0".quantity AS "QUANTITY",
    "p_$0".provider_id AS "PROVIDER_ID",
    "p_$0".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
    "p_$0".procedure_source_value AS "PROCEDURE_SOURCE_VALUE",
    "p_$0".procedure_source_concept_id AS "PROCEDURE_SOURCE_CONCEPT_ID",
    "p_$0".modifier_source_value AS "MODIFIER_SOURCE_VALUE",
    "c_$1"."CONCEPT_CODE" AS "PROCEDURE_CONCEPT_CODE",
    "t_$2"."CONCEPT_CODE" AS "PROCEDURE_TYPE_CONCEPT_CODE",
    "m_$3"."CONCEPT_CODE" AS "MODIFIER_CONCEPT_CODE"
  FROM
    (
      (
        (
          procedure_occurrence AS "p_$0"
          LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "c_$1" ON (
            "c_$1"."CONCEPT_ID" = "p_$0".procedure_concept_id
          )
        )
        LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "t_$2" ON (
          "t_$2"."CONCEPT_ID" = "p_$0".procedure_type_concept_id
        )
      )
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "m_$3" ON (
        "m_$3"."CONCEPT_ID" = "p_$0".modifier_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.DRUG_EXP" (
    "DRUG_EXPOSURE_ID",
    "PATIENT_ID",
    "DRUG_CONCEPT_ID",
    "DRUG_NAME",
    "DRUG_EXPOSURE_START_DATE",
    "DRUG_EXPOSURE_END_DATE",
    "DRUG_EXPOSURE_START_DATETIME",
    "DRUG_EXPOSURE_END_DATETIME",
    "VERBATIM_END_DATE",
    "DRUG_TYPE_CONCEPT_ID",
    "DRUG_TYPE_NAME",
    "STOP_REASON",
    "REFILLS",
    "DAYS_SUPPLY",
    "SIG",
    "ROUTE_CONCEPT_ID",
    "ROUTE_NAME",
    "LOT_NUMBER",
    "PROVIDER_ID",
    "VISIT_OCCURRENCE_ID",
    "DRUG_CONCEPT_CODE",
    "DRUG_TYPE_CONCEPT_CODE",
    "ROUTE_CONCEPT_CODE"
  ) AS (
  SELECT
    "de_$0".drug_exposure_id AS "DRUG_EXPOSURE_ID",
    "p_$1"."PATIENT_ID",
    "de_$0".drug_concept_id AS "DRUG_CONCEPT_ID",
    "c_$2"."CONCEPT_NAME" AS "DRUG_NAME",
    "de_$0".drug_exposure_start_date AS "DRUG_EXPOSURE_START_DATE",
    "de_$0".drug_exposure_end_date AS "DRUG_EXPOSURE_END_DATE",
    "de_$0".drug_exposure_start_datetime AS "DRUG_EXPOSURE_START_DATETIME",
    "de_$0".drug_exposure_end_datetime AS "DRUG_EXPOSURE_END_DATETIME",
    "de_$0".verbatim_end_date AS "VERBATIM_END_DATE",
    "de_$0".drug_type_concept_id AS "DRUG_TYPE_CONCEPT_ID",
    "ct_$3"."CONCEPT_NAME" AS "DRUG_TYPE_NAME",
    "de_$0".stop_reason AS "STOP_REASON",
    "de_$0".refills AS "REFILLS",
    "de_$0".days_supply AS "DAYS_SUPPLY",
    "de_$0".sig AS "SIG",
    "de_$0".route_concept_id AS "ROUTE_CONCEPT_ID",
    "r_$4"."CONCEPT_NAME" AS "ROUTE_NAME",
    "de_$0".lot_number AS "LOT_NUMBER",
    "de_$0".provider_id AS "PROVIDER_ID",
    "de_$0".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
    "c_$2"."CONCEPT_CODE" AS "DRUG_CONCEPT_CODE",
    "ct_$3"."CONCEPT_CODE" AS "DRUG_TYPE_CONCEPT_CODE",
    "r_$4"."CONCEPT_CODE" AS "ROUTE_CONCEPT_CODE"
  FROM
    (
      (
        (
          (
            drug_exposure AS "de_$0"
            INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("de_$0".person_id = "p_$1"."PATIENT_ID")
          )
          LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
            "c_$2"."CONCEPT_ID" = "de_$0".drug_concept_id
          )
        )
        LEFT JOIN "VIEW::OMOP.CONCEPT" AS "ct_$3" ON (
          "ct_$3"."CONCEPT_ID" = "de_$0".drug_type_concept_id
        )
      )
      LEFT JOIN "VIEW::OMOP.CONCEPT" AS "r_$4" ON (
        "r_$4"."CONCEPT_ID" = "de_$0".route_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.COND" (
    "CONDITION_OCCURRENCE_ID",
    "CONDITION_CONCEPT_ID",
    "CONDITION_NAME",
    "CONDITION_TYPE_NAME",
    "CONDITION_SOURCE_NAME",
    "CONDITION_STATUS_NAME",
    "PATIENT_ID",
    "CONDITION_START_DATE",
    "CONDITION_END_DATE",
    "VISIT_OCCURRENCE_ID",
    "CONDITION_SOURCE_VALUE",
    "CONDITION_CONCEPT_CODE",
    "CONDITION_TYPE_CONCEPT_CODE",
    "CONDITION_SOURCE_CONCEPT_CODE",
    "CONDITION_STATUS_CONCEPT_CODE"
  ) AS (
  SELECT
    "co_$0".condition_occurrence_id AS "CONDITION_OCCURRENCE_ID",
    "co_$0".condition_concept_id AS "CONDITION_CONCEPT_ID",
    "c_$2"."CONCEPT_NAME" AS "CONDITION_NAME",
    "t_$3"."CONCEPT_NAME" AS "CONDITION_TYPE_NAME",
    "s_$4"."CONCEPT_NAME" AS "CONDITION_SOURCE_NAME",
    "cs_$5"."CONCEPT_NAME" AS "CONDITION_STATUS_NAME",
    "p_$1"."PATIENT_ID",
    "co_$0".condition_start_date AS "CONDITION_START_DATE",
    "co_$0".condition_end_date AS "CONDITION_END_DATE",
    "co_$0".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
    "co_$0".condition_source_value AS "CONDITION_SOURCE_VALUE",
    "c_$2"."CONCEPT_CODE" AS "CONDITION_CONCEPT_CODE",
    "t_$3"."CONCEPT_CODE" AS "CONDITION_TYPE_CONCEPT_CODE",
    "s_$4"."CONCEPT_CODE" AS "CONDITION_SOURCE_CONCEPT_CODE",
    "cs_$5"."CONCEPT_CODE" AS "CONDITION_STATUS_CONCEPT_CODE"
  FROM
    (
      (
        (
          (
            (
              condition_occurrence AS "co_$0"
              INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("co_$0".person_id = "p_$1"."PATIENT_ID")
            )
            LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
              "c_$2"."CONCEPT_ID" = "co_$0".condition_concept_id
            )
          )
          LEFT JOIN "VIEW::OMOP.CONCEPT" AS "t_$3" ON (
            "t_$3"."CONCEPT_ID" = "co_$0".condition_type_concept_id
          )
        )
        LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "s_$4" ON (
          "s_$4"."CONCEPT_ID" = "co_$0".condition_source_concept_id
        )
      )
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "cs_$5" ON (
        "cs_$5"."CONCEPT_ID" = "co_$0".condition_status_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.COND_ERA" (
    "CONDITION_ERA_ID",
    "CONDITION_CONCEPT_ID",
    "CONDITION_NAME",
    "PATIENT_ID",
    "CONDITION_ERA_START_DATE",
    "CONDITION_ERA_END_DATE",
    "CONDITION_OCCURRENCE_COUNT",
    "CONDITION_CONCEPT_CODE"
  ) AS (
  SELECT
      "ce_$0".condition_era_id AS "CONDITION_ERA_ID",
      "ce_$0".condition_concept_id AS "CONDITION_CONCEPT_ID",
      "c_$2"."CONCEPT_NAME" AS "CONDITION_NAME",
      "p_$1"."PATIENT_ID",
      "ce_$0".condition_era_start_date AS "CONDITION_ERA_START_DATE",
      "ce_$0".condition_era_end_date AS "CONDITION_ERA_END_DATE",
      "ce_$0".condition_occurrence_count AS "CONDITION_OCCURRENCE_COUNT",
      "c_$2"."CONCEPT_CODE" AS "CONDITION_CONCEPT_CODE"
    FROM
      (
        (
          condition_era AS "ce_$0"
          INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("ce_$0".person_id = "p_$1"."PATIENT_ID")
        )
        LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
          "c_$2"."CONCEPT_ID" = "ce_$0".condition_concept_id
        )
      ) 
    );


CREATE OR REPLACE VIEW "VIEW::OMOP.OBS_PER" (
    "OBSERVATION_PERIOD_ID",
    "PATIENT_ID",
    "OBSERVATION_PERIOD_START_DATE",
    "OBSERVATION_PERIOD_END_DATE",
    "PERIOD_TYPE_CONCEPT_ID",
    "PERIOD_TYPE_NAME",
    "PERIOD_TYPE_CONCEPT_CODE"
  ) AS (
  SELECT
    "o_$0".observation_period_id AS "OBSERVATION_PERIOD_ID",
    "o_$0".person_id AS "PATIENT_ID",
    "o_$0".observation_period_start_date AS "OBSERVATION_PERIOD_START_DATE",
    "o_$0".observation_period_end_date AS "OBSERVATION_PERIOD_END_DATE",
    "o_$0".period_type_concept_id AS "PERIOD_TYPE_CONCEPT_ID",
    "t_$1"."CONCEPT_NAME" AS "PERIOD_TYPE_NAME",
    "t_$1"."CONCEPT_CODE" AS "PERIOD_TYPE_CONCEPT_CODE"
  FROM
    (
      observation_period AS "o_$0"
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "t_$1" ON (
        "t_$1"."CONCEPT_ID" = "o_$0".period_type_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.SPEC" (
    "SPECIMEN_ID",
    "PATIENT_ID",
    "SPECIMEN_CONCEPT_ID",
    "SPECIMEN_NAME",
    "SPECIMEN_TYPE_CONCEPT_ID",
    "SPECIMEN_TYPE_NAME",
    "SPECIMEN_DATE",
    "SPECIMEN_DATETIME",
    "QUANTITY",
    "UNIT_CONCEPT_ID",
    "UNIT_NAME",
    "ANATOMIC_SITE_CONCEPT_ID",
    "ANATOMIC_SITE_NAME",
    "DISEASE_STATUS_CONCEPT_ID",
    "DISEASE_STATUS_NAME",
    "SPECIMEN_SOURCE_ID",
    "SPECIMEN_SOURCE_VALUE",
    "UNIT_SOURCE_VALUE",
    "ANATOMIC_SITE_SOURCE_VALUE",
    "DISEASE_STATUS_SOURCE_VALUE",
    "SPECIMEN_CONCEPT_CODE",
    "SPECIMEN_TYPE_CONCEPT_CODE",
    "UNIT_CONCEPT_CODE",
    "ANATOMIC_SITE_CONCEPT_CODE",
    "DISEASE_STATUS_CONCEPT_CODE"
  ) AS (
  SELECT
    "s_$0".specimen_id AS "SPECIMEN_ID",
    "s_$0".person_id AS "PATIENT_ID",
    "s_$0".specimen_concept_id AS "SPECIMEN_CONCEPT_ID",
    "c_$1"."CONCEPT_NAME" AS "SPECIMEN_NAME",
    "s_$0".specimen_type_concept_id AS "SPECIMEN_TYPE_CONCEPT_ID",
    "t_$2"."CONCEPT_NAME" AS "SPECIMEN_TYPE_NAME",
    "s_$0".specimen_date AS "SPECIMEN_DATE",
    "s_$0".specimen_datetime AS "SPECIMEN_DATETIME",
    "s_$0".quantity AS "QUANTITY",
    "s_$0".unit_concept_id AS "UNIT_CONCEPT_ID",
    "u_$3"."CONCEPT_NAME" AS "UNIT_NAME",
    "s_$0".anatomic_site_concept_id AS "ANATOMIC_SITE_CONCEPT_ID",
    "a_$4"."CONCEPT_NAME" AS "ANATOMIC_SITE_NAME",
    "s_$0".disease_status_concept_id AS "DISEASE_STATUS_CONCEPT_ID",
    "d_$5"."CONCEPT_NAME" AS "DISEASE_STATUS_NAME",
    "s_$0".specimen_source_id AS "SPECIMEN_SOURCE_ID",
    "s_$0".specimen_source_value AS "SPECIMEN_SOURCE_VALUE",
    "s_$0".unit_source_value AS "UNIT_SOURCE_VALUE",
    "s_$0".anatomic_site_source_value AS "ANATOMIC_SITE_SOURCE_VALUE",
    "s_$0".disease_status_source_value AS "DISEASE_STATUS_SOURCE_VALUE",
    "c_$1"."CONCEPT_CODE" AS "SPECIMEN_CONCEPT_CODE",
    "t_$2"."CONCEPT_CODE" AS "SPECIMEN_TYPE_CONCEPT_CODE",
    "u_$3"."CONCEPT_CODE" AS "UNIT_CONCEPT_CODE",
    "a_$4"."CONCEPT_CODE" AS "ANATOMIC_SITE_CONCEPT_CODE",
    "d_$5"."CONCEPT_CODE" AS "DISEASE_STATUS_CONCEPT_CODE"
  FROM
    (
      (
        (
          (
            (
              specimen AS "s_$0"
              LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "c_$1" ON (
                "c_$1"."CONCEPT_ID" = "s_$0".specimen_concept_id
              )
            )
            LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "t_$2" ON (
              "t_$2"."CONCEPT_ID" = "s_$0".specimen_type_concept_id
            )
          )
          LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "u_$3" ON ("u_$3"."CONCEPT_ID" = "s_$0".unit_concept_id)
        )
        LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "a_$4" ON (
          "a_$4"."CONCEPT_ID" = "s_$0".anatomic_site_concept_id
        )
      )
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "d_$5" ON (
        "d_$5"."CONCEPT_ID" = "s_$0".disease_status_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.VISIT" (
    "VISIT_OCCURRENCE_ID",
    "VISIT_CONCEPT_ID",
    "VISIT_NAME",
    "VISIT_TYPE_NAME",
    "PATIENT_ID",
    "VISIT_START_DATE",
    "PRECEDING_VISIT_OCCURRENCE_ID",
    "VISIT_END_DATE",
    "VISIT_CONCEPT_CODE",
    "VISIT_TYPE_CONCEPT_CODE"
  ) AS (
  SELECT
    "vo_$0".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
    "vo_$0".visit_concept_id AS "VISIT_CONCEPT_ID",
    "c_$2"."CONCEPT_NAME" AS "VISIT_NAME",
    "t_$3"."CONCEPT_NAME" AS "VISIT_TYPE_NAME",
    "p_$1"."PATIENT_ID",
    "vo_$0".visit_start_date AS "VISIT_START_DATE",
    "vo_$0".preceding_visit_occurrence_id AS "PRECEDING_VISIT_OCCURRENCE_ID",
    "vo_$0".visit_end_date AS "VISIT_END_DATE",
    "c_$2"."CONCEPT_CODE" AS "VISIT_CONCEPT_CODE",
    "t_$3"."CONCEPT_CODE" AS "VISIT_TYPE_CONCEPT_CODE"
  FROM
    (
      (
        (
          visit_occurrence AS "vo_$0"
          INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("vo_$0".person_id = "p_$1"."PATIENT_ID")
        )
        LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
          "c_$2"."CONCEPT_ID" = "vo_$0".visit_concept_id
        )
      )
      LEFT JOIN "VIEW::OMOP.CONCEPT" AS "t_$3" ON (
        "t_$3"."CONCEPT_ID" = "vo_$0".visit_type_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.MEAS" (
    "MEASUREMENT_ID",
    "MEASUREMENT_CONCEPT_ID",
    "MEASUREMENT_NAME",
    "MEASUREMENT_TYPE_NAME",
    "MEASUREMENT_VALUE_NAME",
    "PATIENT_ID",
    "MEASUREMENT_DATE",
    "VALUE_AS_NUMBER",
    "VISIT_OCCURRENCE_ID",
    "MEASUREMENT_CONCEPT_CODE",
    "MEASUREMENT_TYPE_CONCEPT_CODE",
    "VALUE_AS_CONCEPT_CODE",
    "UNIT_CONCEPT_CODE"
  ) AS (
  SELECT
    "m_$0".measurement_id AS "MEASUREMENT_ID",
    "m_$0".measurement_concept_id AS "MEASUREMENT_CONCEPT_ID",
    "c_$2"."CONCEPT_NAME" AS "MEASUREMENT_NAME",
    "t_$3"."CONCEPT_NAME" AS "MEASUREMENT_TYPE_NAME",
    "vt_$4"."CONCEPT_NAME" AS "MEASUREMENT_VALUE_NAME",
    "p_$1"."PATIENT_ID",
    "m_$0".measurement_date AS "MEASUREMENT_DATE",
    "m_$0".value_as_number AS "VALUE_AS_NUMBER",
    "m_$0".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
    "c_$2"."CONCEPT_CODE" AS "MEASUREMENT_CONCEPT_CODE",
    "t_$3"."CONCEPT_CODE" AS "MEASUREMENT_TYPE_CONCEPT_CODE",
    "vt_$4"."CONCEPT_CODE" AS "VALUE_AS_CONCEPT_CODE",
    "u_$5"."CONCEPT_CODE" AS "UNIT_CONCEPT_CODE"
  FROM
    (
      (
        (
          (
            (
              measurement AS "m_$0"
              INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("m_$0".person_id = "p_$1"."PATIENT_ID")
            )
            LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
              "c_$2"."CONCEPT_ID" = "m_$0".measurement_concept_id
            )
          )
          LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "t_$3" ON (
            "t_$3"."CONCEPT_ID" = "m_$0".measurement_type_concept_id
          )
        )
        LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "vt_$4" ON (
          "vt_$4"."CONCEPT_ID" = "m_$0".value_as_concept_id
        )
      )
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "u_$5" ON ("u_$5"."CONCEPT_ID" = "m_$0".unit_concept_id)
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.DRUG_ERA" (
    "DRUG_ERA_ID",
    "PATIENT_ID",
    "DRUG_NAME",
    "DRUG_ERA_START_DATE",
    "DRUG_ERA_END_DATE",
    "DRUG_EXPOSURE_COUNT",
    "GAP_DAYS",
    "DRUG_CONCEPT_CODE"
  ) AS (
  SELECT
    "de_$0".drug_era_id AS "DRUG_ERA_ID",
    "p_$1"."PATIENT_ID",
    "c_$2"."CONCEPT_NAME" AS "DRUG_NAME",
    "de_$0".drug_era_start_date AS "DRUG_ERA_START_DATE",
    "de_$0".drug_era_end_date AS "DRUG_ERA_END_DATE",
    "de_$0".drug_exposure_count AS "DRUG_EXPOSURE_COUNT",
    "de_$0".gap_days AS "GAP_DAYS",
    "c_$2"."CONCEPT_CODE" AS "DRUG_CONCEPT_CODE"
  FROM
    (
      (
        drug_era AS "de_$0"
        INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("de_$0".person_id = "p_$1"."PATIENT_ID")
      )
      LEFT OUTER JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
        "c_$2"."CONCEPT_ID" = "de_$0".drug_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.DOSE_ERA" (
    "DOSE_ERA_ID",
    "PATIENT_ID",
    "DRUG_NAME",
    "UNIT_NAME",
    "DOSE_VALUE",
    "DOSE_ERA_START_DATE",
    "DOSE_ERA_END_DATE",
    "DRUG_CONCEPT_CODE",
    "UNIT_CONCEPT_CODE"
  ) AS (
  SELECT
    "de_$0".dose_era_id AS "DOSE_ERA_ID",
    "p_$1"."PATIENT_ID",
    "c_$2"."CONCEPT_NAME" AS "DRUG_NAME",
    "u_$3"."CONCEPT_NAME" AS "UNIT_NAME",
    "de_$0".dose_value AS "DOSE_VALUE",
    "de_$0".dose_era_start_date AS "DOSE_ERA_START_DATE",
    "de_$0".dose_era_end_date AS "DOSE_ERA_END_DATE",
    "c_$2"."CONCEPT_CODE" AS "DRUG_CONCEPT_CODE",
    "u_$3"."CONCEPT_CODE" AS "UNIT_CONCEPT_CODE"
  FROM
    (
      (
        (
          dose_era AS "de_$0"
          INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("de_$0".person_id = "p_$1"."PATIENT_ID")
        )
        LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
          "c_$2"."CONCEPT_ID" = "de_$0".drug_concept_id
        )
      )
      LEFT JOIN "VIEW::OMOP.CONCEPT" AS "u_$3" ON (
        "u_$3"."CONCEPT_ID" = "de_$0".unit_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.DEVICE_EXPOSURE" (
    "DEVICE_EXPOSURE_ID",
    "PATIENT_ID",
    "DEVICE_NAME",
    "DEVICE_CONCEPT_ID",
    "DEVICE_EXPOSURE_START_DATE",
    "DEVICE_EXPOSURE_END_DATE",
    "DEVICE_TYPE_NAME",
    "VISIT_OCCURRENCE_ID",
    "DEVICE_CONCEPT_CODE",
    "DEVICE_TYPE_CONCEPT_CODE"
  ) AS (
  SELECT
    "de_$0".device_exposure_id AS "DEVICE_EXPOSURE_ID",
    "p_$1"."PATIENT_ID",
    "c_$2"."CONCEPT_NAME" AS "DEVICE_NAME",
    "de_$0".device_concept_id AS "DEVICE_CONCEPT_ID",
    "de_$0".device_exposure_start_date AS "DEVICE_EXPOSURE_START_DATE",
    "de_$0".device_exposure_end_date AS "DEVICE_EXPOSURE_END_DATE",
    "ct_$3"."CONCEPT_NAME" AS "DEVICE_TYPE_NAME",
    "de_$0".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
    "c_$2"."CONCEPT_CODE" AS "DEVICE_CONCEPT_CODE",
    "ct_$3"."CONCEPT_CODE" AS "DEVICE_TYPE_CONCEPT_CODE"
  FROM
    (
      (
        (
          device_exposure AS "de_$0"
          INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("de_$0".person_id = "p_$1"."PATIENT_ID")
        )
        LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
          "c_$2"."CONCEPT_ID" = "de_$0".device_concept_id
        )
      )
      LEFT JOIN "VIEW::OMOP.CONCEPT" AS "ct_$3" ON (
        "ct_$3"."CONCEPT_ID" = "de_$0".device_type_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.DEATH" (
    "PATIENT_ID",
    "DEATH_TYPE_NAME",
    "DEATH_DATE",
    "DEATH_DATETIME",
    "DEATH_TYPE_CONCEPT_CODE"
  ) AS (
  SELECT
    "p_$1"."PATIENT_ID",
    "c_$2"."CONCEPT_NAME" AS "DEATH_TYPE_NAME",
    "d_$0".death_date AS "DEATH_DATE",
    "d_$0".death_datetime AS "DEATH_DATETIME",
    "c_$2"."CONCEPT_CODE" AS "DEATH_TYPE_CONCEPT_CODE"
  FROM
    (
      (
        death AS "d_$0"
        INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" ON ("d_$0".person_id = "p_$1"."PATIENT_ID")
      )
      LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" ON (
        "c_$2"."CONCEPT_ID" = "d_$0".death_type_concept_id
      )
    ) 
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.COND_ICD10" AS (
  SELECT 
      "CONDITION".person_id AS "PATIENT_ID",
      "CONDITION".condition_occurrence_id AS "CONDITION_OCCURRENCE_ID",
      "CONDITION".condition_start_date AS "CONDITION_START_DATE",
      "CONDITION".condition_end_date AS "CONDITION_END_DATE",
      "CONDITION".visit_occurrence_id AS "VISIT_OCCURRENCE_ID",
      "CONDITION".condition_source_value AS "CONDITION_SOURCE_VALUE",
      "CONDITION".condition_type_concept_id AS "CONDITION_TYPE_CONCEPT_ID",
      "CONDITION".condition_status_concept_id AS "CONDITION_STATUS_CONCEPT_ID",
      "C1"."CONCEPT_NAME" AS "ICD10_CONDITION_SOURCE_VALUE_CONCEPT_NAME",
      "C2"."CONCEPT_NAME" AS "CONDITION_TYPE_CONCEPT_NAME",
      "C3"."CONCEPT_NAME" AS "CONDITION_STATUS_CONCEPT_NAME",
      "C1"."CONCEPT_CODE" AS "CONDITION_SOURCE_VALUE_CONCEPT_CODE",
      "C2"."CONCEPT_CODE" AS "CONDITION_TYPE_CONCEPT_CODE",
      "C3"."CONCEPT_CODE" AS "CONDITION_STATUS_CONCEPT_CODE"
  FROM condition_occurrence AS "CONDITION"
  LEFT JOIN "VIEW::OMOP.CONCEPT" AS "C1"
  ON "CONDITION".condition_source_value = "C1"."CONCEPT_CODE"
  AND "C1"."DOMAIN_ID" = 'Condition' AND "C1"."VOCABULARY_ID" = 'ICD10'
  LEFT JOIN "VIEW::OMOP.CONCEPT" AS "C2"
  ON "CONDITION".condition_type_concept_id = "C2"."CONCEPT_ID"
  LEFT JOIN "VIEW::OMOP.CONCEPT" AS "C3"
  ON "CONDITION".condition_status_concept_id = "C3"."CONCEPT_ID"
  );


CREATE OR REPLACE VIEW "VIEW::OMOP.PP_PER" (
    "PAYER_PLAN_PERIOD_ID",
    "PATIENT_ID",
    "PAYER_PLAN_PERIOD_START_DATE",
    "PAYER_PLAN_PERIOD_END_DATE",
    "PAYER_SOURCE_VALUE",
    "PLAN_SOURCE_VALUE",
    "FAMILY_SOURCE_VALUE"
  ) AS (
  SELECT
    "p_$0".payer_plan_period_id AS "PAYER_PLAN_PERIOD_ID",
    "p_$0".person_id AS "PATIENT_ID",
    "p_$0".payer_plan_period_start_date AS "PAYER_PLAN_PERIOD_START_DATE",
    "p_$0".payer_plan_period_end_date AS "PAYER_PLAN_PERIOD_END_DATE",
    "p_$0".payer_source_value AS "PAYER_SOURCE_VALUE",
    "p_$0".plan_source_value AS "PLAN_SOURCE_VALUE",
    "p_$0".family_source_value AS "FAMILY_SOURCE_VALUE"
  FROM
    payer_plan_period AS "p_$0"
  );


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
            "e_$0".episode_id AS "EPISODE_ID",
            "p_$1"."PATIENT_ID",
            "e_$0".episode_concept_id           AS "EPISODE_CONCEPT_ID",
            "c_$2"."CONCEPT_NAME"               AS "EPISODE_NAME",
            "e_$0".episode_type_concept_id      AS "EPISODE_TYPE_CONCEPT_ID",
            "ct_$3"."CONCEPT_NAME"              AS "EPISODE_TYPE_NAME",
            "e_$0".episode_object_concept_id    AS"EPISODE_OBJECT_CONCEPT_ID",
            "eo_$4"."CONCEPT_NAME"              AS "EPISODE_OBJECT_NAME",
            "e_$0".episode_start_date           AS "EPISODE_START_DATE",
            "e_$0".episode_end_date             AS "EPISODE_END_DATE",
            "e_$0".episode_start_datetime       AS "EPISODE_START_DATETIME",
            "e_$0".episode_end_datetime         AS "EPISODE_END_DATETIME",
            "e_$0".episode_parent_id            AS "EPISODE_PARENT_ID",
            "e_$0".episode_number               AS "EPISODE_NUMBER",
            "c_$2"."CONCEPT_CODE"               AS "EPISODE_CONCEPT_CODE",
            "ct_$3"."CONCEPT_CODE"              AS "EPISODE_TYPE_CONCEPT_CODE",
            "eo_$4"."CONCEPT_CODE"              AS "EPISODE_OBJECT_CONCEPT_CODE"

        FROM 
            (
            (
                (
                (
                episode AS "e_$0"
                INNER JOIN "VIEW::OMOP.PATIENT" AS "p_$1" 
                    ON ("e_$0".person_id = "p_$1"."PATIENT_ID")
                )
                LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" 
                    ON ("c_$2"."CONCEPT_ID" = "e_$0".episode_concept_id)
                )
                LEFT JOIN "VIEW::OMOP.CONCEPT" AS "ct_$3" 
                    ON ("ct_$3"."CONCEPT_ID" = "e_$0".episode_type_concept_id)
            )
            LEFT JOIN "VIEW::OMOP.CONCEPT" AS "eo_$4" 
                ON ("eo_$4"."CONCEPT_ID" = "e_$0".episode_object_concept_id)
            )
        );


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
          "ee_$0".event_id                            AS "EVENT_ID",
          "ee_$0".episode_id                          AS "EPISODE_ID",
          "ee_$0".episode_event_field_concept_id      AS "EPISODE_EVENT_FIELD_CONCEPT_ID",
          "c_$2"."CONCEPT_NAME"                       AS "EPISODE_EVENT_FIELD_NAME",
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
              episode_event AS "ee_$0"
              LEFT JOIN "VIEW::OMOP.EPISODE" AS "e_$1"
                  ON ("ee_$0".episode_id = "e_$1"."EPISODE_ID")
            )
          LEFT JOIN "VIEW::OMOP.CONCEPT" AS "c_$2" 
              ON ("c_$2"."CONCEPT_ID" = "ee_$0".episode_event_field_concept_id)
          )
      );