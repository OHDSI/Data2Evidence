--liquibase formatted sql
--changeset alp:V1.0.0.0.0__create_monitor
CREATE TABLE "MONITOR" (
  "ALP_ID"			        VARCHAR(48)	  NOT NULL,
  "ACTIVITY_TYPE"       VARCHAR(48) NOT NULL,
  "CREATED_AT"			      SECONDDATE	  NOT NULL
);
--rollback DROP TABLE "MONITOR";