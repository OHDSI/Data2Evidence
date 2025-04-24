--liquibase formatted sql
--changeset alp:V5.3.1.2.7__add_omop_observation_sequence

CREATE SEQUENCE "SEQ::OBSERVATION" START WITH 1 NO MAXVALUE;

--rollback DROP SEQUENCE "SEQ::OBSERVATION";
