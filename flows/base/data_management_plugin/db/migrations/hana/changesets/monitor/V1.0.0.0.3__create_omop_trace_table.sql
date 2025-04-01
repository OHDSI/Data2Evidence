--liquibase formatted sql
--changeset alp:V1.0.0.0.3__create_omop_trace_table

------------------------------------------------------------------------------------------------------------------------
-- Notes:
-- OMOP_ENTITY_ID will be from the ID of the source omop entity table such as PERSON_ID, OBSERVATION_ID
-- OMOP_ENTITY_TYPE is to store values such as PERSON, OBSERVATION, CONDITION, VISIT_OCCURRENCE etc.
------------------------------------------------------------------------------------------------------------------------
CREATE TABLE "OMOP.TRACE" (
  "OMOP_ENTITY_ID"			                BIGINT	      NOT NULL,
  "OMOP_ENTITY_TYPE"			              VARCHAR(500)	NOT NULL, 
  "ETL_SOURCE_TABLE"			              VARCHAR(500)	NOT NULL,
  "ETL_SOURCE_TABLE_RECORD_ID"          BIGINT		    NOT NULL,
  "ETL_SOURCE_TABLE_RECORD_CREATED_AT"  SECONDDATE		NOT NULL,
  "ETL_SESSION_ID"			                VARCHAR(50)	  NOT NULL,
  "ETL_STARTED_AT"			                SECONDDATE	  NOT NULL,
  "ETL_CREATED_AT"			                SECONDDATE	  DEFAULT CURRENT_UTCTIMESTAMP
);

--rollback DROP TABLE "OMOP.TRACE";
