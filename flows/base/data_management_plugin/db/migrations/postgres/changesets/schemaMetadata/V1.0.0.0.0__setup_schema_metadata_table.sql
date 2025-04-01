--liquibase formatted sql
--changeset alp:V1.0.0.0.0__setup_schema_metadata_table
CREATE TABLE "SCHEMA.METADATA" (
  "STUDY_NAME"                      VARCHAR(255)	NOT NULL,
  "CREATED_AT"			                TIMESTAMP	  DEFAULT (now() AT TIME ZONE 'UTC'),
  "UPDATED_AT"			                TIMESTAMP	  NULL,
  PRIMARY KEY ("STUDY_NAME")
);

--rollback DROP TABLE "SCHEMA.METADATA";
