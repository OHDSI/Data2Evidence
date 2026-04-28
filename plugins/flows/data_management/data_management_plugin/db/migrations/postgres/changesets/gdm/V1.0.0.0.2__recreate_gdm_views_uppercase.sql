--liquibase formatted sql
--changeset alp:V1.0.0.0.2__recreate_gdm_views_uppercase

--previously under consent changeset folder
CREATE OR REPLACE VIEW "VIEW::GDM.CONSENT_BASE" AS (
    SELECT 
            "C".id AS "ID",
            "C".person_id AS "PERSON_ID", 
            "C".status AS "STATUS", 
            "C".created_at "CREATED_AT", 
            "CD".id AS "CONSENT_DETAIL_ID", 
            "CD".parent_consent_detail_id AS "PARENT_CONSENT_DETAIL_ID",
            "CD".type AS "TYPE",
            "CV".attribute_group_id AS "ATTRIBUTE_GROUP_ID", 
            "CV".attribute AS "ATTRIBUTE", 
            "CV".value AS "VALUE" 
    FROM gdm_consent AS "C"
    INNER JOIN gdm_consent_detail AS "CD"
        ON "C".id = "CD".gdm_consent_id
    INNER JOIN gdm_consent_value AS "CV"
                ON "CV".gdm_consent_detail_id = "CD".id
    );

-- previously under researchSubject changeset folder
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
        "RS".extension_valuestring AS "EXTENSION_VALUESTRING"
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

-- previously under researchSubject changeset folder
CREATE OR REPLACE VIEW "VIEW::OMOP.GDM.PATIENT" AS 
    (
        SELECT "P".*, "RS".*
        FROM "VIEW::OMOP.PATIENT" AS "P"
        LEFT JOIN "VIEW::GDM.RESEARCH_SUBJECT_BASE" AS "RS"
        ON "P"."PATIENT_ID" = "RS"."PERSON_ID"
    );

-- previously under questionnaireResponse changeset folder
CREATE OR REPLACE VIEW "VIEW::GDM.QUESTIONNAIRE_RESPONSE_BASE" AS
    (
    SELECT 
        "QR".id AS "ID",
        "QR".person_id AS "PERSON_ID",
        "QR".language AS "LANGUAGE",
        "QR".questionnaire_reference AS "QUESTIONNAIRE_REFERENCE",
        "QR".questionnaire_version AS "QUESTIONNAIRE_VERSION",
        "QR".status AS "STATUS",
        "QR".authored AS "AUTHORED",
        "I".id AS "ITEM_ID",
        "I".link_id AS "LINK_ID",
        "I".text AS "TEXT",
        "I".definition AS "DEFINITION",
        "ANS".id AS "ANSWER_ID",
        "ANS".value_type AS "VALUE_TYPE",
        "ANS".value AS "VALUE",
        "ANS".valueattachment_contenttype AS "VALUEATTACHMENT_CONTENTTYPE",
        "ANS".valueattachment_language AS "VALUEATTACHMENT_LANGUAGE",
        "ANS".valueattachment_data AS "VALUEATTACHMENT_DATA",
        "ANS".valueattachment_url AS "VALUEATTACHMENT_URL",
        "ANS".valueattachment_size AS "VALUEATTACHMENT_SIZE",
        "ANS".valueattachment_hash AS "VALUEATTACHMENT_HASH",
        "ANS".valueattachment_title AS "VALUEATTACHMENT_TITLE",
        "ANS".valueattachment_creation AS "VALUEATTACHMENT_CREATION",
        "ANS".valuecoding_system AS "VALUECODING_SYSTEM",
        "ANS".valuecoding_version AS "VALUECODING_VERSION",
        "ANS".valuecoding_code AS "VALUECODING_CODE",
        "ANS".valuecoding_display AS "VALUECODING_DISPLAY",
        "ANS".valuecoding_userselected AS "VALUECODING_USERSELECTED",
        "ANS".valuequantity_value AS "VALUEQUANTITY_VALUE",
        "ANS".valuequantity_comparator AS "VALUEQUANTITY_COMPARATOR",
        "ANS".valuequantity_unit AS "VALUEQUANTITY_UNIT",
        "ANS".valuequantity_system AS "VALUEQUANTITY_SYSTEM",
        "ANS".valuequantity_code AS "VALUEQUANTITY_CODE",
        "ANS".valuereference_reference AS "VALUEREFERENCE_REFERENCE",
        "ANS".valuereference_type AS "VALUEREFERENCE_TYPE",
        "ANS".valuereference_identifier AS "VALUEREFERENCE_IDENTIFIER",
        "ANS".valuereference_display AS "VALUEREFERENCE_DISPLAY",
        "QR".extension_effective_date_url AS "EXTENSION_EFFECTIVE_DATE_URL",
        "QR".extension_valuedate AS "EXTENSION_VALUEDATE"
    FROM gdm_questionnaire_response AS "QR" 
    LEFT JOIN gdm_item AS "I" 
        ON "QR".id = "I".gdm_questionnaire_response_id
    LEFT JOIN gdm_answer AS "ANS" 
        ON "I".id = "ANS".gdm_item_id
    );


-- previously under views changeset folder
CREATE OR REPLACE VIEW "VIEW::OMOP.PARTICIPANT_TOKEN" AS
    (SELECT 
        P.id AS "ID", 
        P.study_id AS "STUDY_ID", 
        P.external_id AS "EXTERNAL_ID", 
        P.token AS "TOKEN", 
        P.created_by AS "CREATED_BY", 
        P.created_date AS "CREATED_DATE", 
        P.modified_by AS "MODIFIED_BY", 
        P.modified_date AS "MODIFIED_DATE", 
        P.status AS "STATUS", 
        P.last_donation_date AS "LAST_DONATION_DATE", 
        P.validation_date AS "VALIDATION_DATE",
        R."PERSON_ID"
    FROM gdm_participant_token AS P
    INNER JOIN "VIEW::GDM.RESEARCH_SUBJECT_BASE" AS R
    ON P.external_id = R."INDIVIDUAL_IDENTIFIER_VALUE"
    );
