--liquibase formatted sql
--changeset alp:V1.0.0.0.1__alter_questionnaire_response_table
ALTER TABLE "GDM.QUESTIONNAIRE_RESPONSE"
ADD(RECORD_ID VARCHAR(1000) NULL);

--rollback ALTER TABLE "GDM.QUESTIONNAIRE_RESPONSE" DROP(RECORD_ID);