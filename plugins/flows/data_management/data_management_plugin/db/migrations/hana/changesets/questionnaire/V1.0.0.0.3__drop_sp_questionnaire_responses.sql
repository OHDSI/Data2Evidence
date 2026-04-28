--liquibase formatted sql
--changeset alp:V1.0.0.0.3__drop_sp_questionniare_responses.sql splitStatements:false

DROP PROCEDURE "SP::Questionnaire_Response";