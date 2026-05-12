--liquibase formatted sql
--changeset alp:V1.0.0.0.8__create_participant_token_table

CREATE TABLE "GDM.PARTICIPANT_TOKEN" (
  "ID"	                            VARCHAR(50)		  NOT NULL,
  "STUDY_ID"	                    VARCHAR(50)	    NOT NULL,
  "EXTERNAL_ID"				              VARCHAR(255)	    NULL,
  "TOKEN"		                        VARCHAR(255)	  NULL,
  "CREATED_BY"              		  VARCHAR(255)	  NULL,
  "CREATED_DATE"                    SECONDDATE	    DEFAULT CURRENT_UTCTIMESTAMP,
  "MODIFIED_BY"              		  VARCHAR(255)	  NULL,
  "MODIFIED_DATE"                    SECONDDATE	    NULL,
  "STATUS"      		          VARCHAR(255)	  NULL,
  "LAST_DONATION_DATE"              SECONDDATE,
  "VALIDATION_DATE"                 SECONDDATE,
  PRIMARY KEY ("ID")
);

--rollback DROP TABLE "GDM.PARTICIPANT_TOKEN";
