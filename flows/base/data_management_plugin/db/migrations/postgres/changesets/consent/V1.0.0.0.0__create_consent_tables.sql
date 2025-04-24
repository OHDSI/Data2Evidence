--liquibase formatted sql
--changeset alp:V1.0.0.0.0__create_consent_tables
CREATE TABLE "GDM.CONSENT" (
  "ID"                                 VARCHAR(1000)		NOT NULL,
  "PERSON_ID"                          BIGINT		NOT NULL,
  "STATUS"				                      VARCHAR(50)	  NOT NULL,
  "CREATED_AT"		                      TIMESTAMP	  NOT NULL,
  "ETL_SOURCE_TABLE"			              VARCHAR(500)	NOT NULL,
  "ETL_SOURCE_TABLE_RECORD_ID"         BIGINT		    NOT NULL,
  "ETL_SOURCE_TABLE_RECORD_CREATED_AT" TIMESTAMP		NOT NULL,
  "ETL_SESSION_ID"			                VARCHAR(50)	  NOT NULL,
  "ETL_STARTED_AT"			                TIMESTAMP	  NOT NULL,
  "ETL_CREATED_AT"			                TIMESTAMP	  DEFAULT (now() AT TIME ZONE 'UTC'),
  "ETL_UPDATED_AT"			                TIMESTAMP	  NULL,
  PRIMARY KEY ("ID")
);



CREATE TABLE "GDM.CONSENT_DETAIL" (
  "ID"	                                      VARCHAR(50)		  NOT NULL,
  "GDM_CONSENT_ID"	                          VARCHAR(1000)	    NOT NULL,
  "PARENT_CONSENT_DETAIL_ID"				          VARCHAR(50)	    NULL,
  "TYPE"		                                  VARCHAR(50)	    NOT NULL,
  "ETL_STARTED_AT"			                      TIMESTAMP	    NOT NULL,
  "ETL_CREATED_AT"			                      TIMESTAMP	    DEFAULT (now() AT TIME ZONE 'UTC'),
  PRIMARY KEY ("ID"),
  FOREIGN KEY ("GDM_CONSENT_ID") REFERENCES "GDM.CONSENT" ("ID") ON DELETE CASCADE
);



CREATE TABLE "GDM.CONSENT_VALUE" (
  "GDM_CONSENT_DETAIL_ID"	          VARCHAR(50)	    NOT NULL,
  "ATTRIBUTE_GROUP_ID"				      VARCHAR(50)	    NULL,
  "ATTRIBUTE"		                    VARCHAR(100)	  NOT NULL,
  "VALUE"		                        VARCHAR(500)	  NOT NULL,
  "ETL_STARTED_AT"			            TIMESTAMP	    NOT NULL,
  "ETL_CREATED_AT"			            TIMESTAMP	    DEFAULT (now() AT TIME ZONE 'UTC'),
  FOREIGN KEY ("GDM_CONSENT_DETAIL_ID") REFERENCES "GDM.CONSENT_DETAIL" ("ID") ON DELETE CASCADE
);

--rollback DROP TABLE "GDM.CONSENT_VALUE";
--rollback DROP TABLE "GDM.CONSENT_DETAIL";
--rollback DROP TABLE "GDM.CONSENT";