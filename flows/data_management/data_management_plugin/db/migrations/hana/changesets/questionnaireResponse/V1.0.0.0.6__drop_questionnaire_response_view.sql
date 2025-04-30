--liquibase formatted sql
--changeset alp:V1.0.0.0.6__drop_questionnaire_response_view

DROP VIEW "VIEW::GDM.QUESTIONNAIRE_RESPONSE_LATEST";