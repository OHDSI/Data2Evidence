--liquibase formatted sql
--changeset alp:V1.0.0.1.3__alter_research_subject_base_view

CREATE OR REPLACE VIEW "VIEW::GDM.RESEARCH_SUBJECT_BASE" AS (
    SELECT 
        "RS".alp_id AS "ALP_ID",
        "RS".person_id AS "PERSON_ID",
        "RS".status AS "STATUS",
        "RS".period_start AS "PERIOD_START",
        "RS".period_end AS "PERIOD_END",
        "RS".study_reference AS "STUDY_REFERENCE",
        "RS".study_type AS "STUDY_TYPE",
        "RS".study_identifier_use AS "STUDY_IDENTIFIER_USE",
        "RS".study_identifier_type AS "STUDY_IDENTIFIER_TYPE",
        "RS".study_identifier_system AS "STUDY_IDENTIFIER_SYSTEM",
        "RS".study_identifier_value AS "STUDY_IDENTIFIER_VALUE",
        "RS".study_identifier_period_start AS "STUDY_IDENTIFIER_PERIOD_START",
        "RS".study_identifier_period_end AS "STUDY_IDENTIFIER_PERIOD_END",
        "RS".study_display AS "STUDY_DISPLAY",
        "RS".individual_reference AS "INDIVIDUAL_REFERENCE",
        "RS".individual_type AS "INDIVIDUAL_TYPE",
        "RS".individual_identifier_use AS "INDIVIDUAL_IDENTIFIER_USE",
        "RS".individual_identifier_type AS "INDIVIDUAL_IDENTIFIER_TYPE",
        "RS".individual_identifier_system AS "INDIVIDUAL_IDENTIFIER_SYSTEM",
        "RS".individual_identifier_value AS "INDIVIDUAL_IDENTIFIER_VALUE",
        "RS".individual_identifier_period_start AS "INDIVIDUAL_IDENTIFIER_PERIOD_START",
        "RS".individual_identifier_period_end AS "INDIVIDUAL_IDENTIFIER_PERIOD_END",
        "RS".individual_display AS "INDIVIDUAL_DISPLAY",
        "RS".assigned_arm AS "ASSIGNED_ARM",
        "RS".actual_arm AS "ACTUAL_ARM",	
        "QR"."MAX_DATETIME" AS "LAST_DONATION_DATETIME",	 
        TO_DATE('9999-12-31', 'YYYY-MM-DD') AS "DUMMY_DATE_OF_BIRTH",
        "RS".extension_url AS "EXTENSION_URL",
        "RS".extension_valuestring AS "EXTENSION_VALUESTRING",
        "RS".source_individual_identifier_value AS "SOURCE_INDIVIDUAL_IDENTIFIER_VALUE"
    FROM gdm_research_subject AS "RS"
    LEFT JOIN 
    (
        SELECT 
            "PERSON_ID",
            MAX("DATETIME") AS "MAX_DATETIME" 
        FROM (
                SELECT 
                    person_id AS "PERSON_ID", 
                    authored AS "DATETIME" 
                FROM gdm_questionnaire_response

                UNION ALL

                SELECT 
                    person_id AS "PERSON_ID", 
                    observation_date AS "DATETIME"
                FROM observation
            ) AS "O_PID" GROUP BY "PERSON_ID"
    ) AS "QR"
    ON "RS".person_id = "QR"."PERSON_ID"
);
