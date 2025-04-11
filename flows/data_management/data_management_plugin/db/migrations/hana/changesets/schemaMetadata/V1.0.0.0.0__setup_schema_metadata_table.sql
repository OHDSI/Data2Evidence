--liquibase formatted sql
--changeset alp:V1.0.0.0.0__setup_schema_metadata_table
CREATE TABLE "SCHEMA.METADATA" (
  "STUDY_NAME"                      VARCHAR(255)	NOT NULL,
  "CREATED_AT"			                SECONDDATE	  DEFAULT CURRENT_UTCTIMESTAMP,
  "UPDATED_AT"			                SECONDDATE	  NULL,
  PRIMARY KEY ("STUDY_NAME")
);

--rollback DROP TABLE "SCHEMA.METADATA";
