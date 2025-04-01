--liquibase formatted sql
--changeset alp:V1.0.0.0.0__create_questionnaire_definition_table
CREATE TABLE "GDM.QUESTIONNAIRE" (
  "ID"                                        VARCHAR(1000)		NOT NULL,
  "IDENTIFIER"                                VARCHAR(500)	NOT NULL,
  "URI"                                       VARCHAR(500) NULL,
  "VERSION"                                   VARCHAR(50) NULL,
  "NAME"                                      VARCHAR(100) NULL,
  "TITLE"                                     VARCHAR(100) NULL,
  "DERIVEDFROM"                               VARCHAR(500) NULL, /*LIST OF STRINGS*/
  "STATUS"                                    VARCHAR(100) NOT NULL,
  "EXPERIMENTAL"                              VARCHAR(50) NULL,
  "SUBJECTTYPE"                               VARCHAR(100) NULL,
  "CONTACT"                                   VARCHAR(5000)	NOT NULL,
  "DATE"                                      VARCHAR(50) NULL,
  "PUBLISHER"                                 VARCHAR(500) NULL,
  "DESCRIPTION"                               VARCHAR(500) NULL,
  "USE_CONTEXT"                               VARCHAR(5000) NULL,
  "JURISDICTION"                              VARCHAR(5000) NULL,
  "PURPOSE"                                   VARCHAR(500) NULL,
  "COPYRIGHT"                                 VARCHAR(500) NULL,
  "COPYRIGHT_LABEL"                           VARCHAR(500) NULL,
  "APPROVAL_DATE"			                        VARCHAR(50) NULL,
  "LAST_REVIEW_DATE"			                    VARCHAR(50) NULL,
  "EFFECTIVE_PERIOD"			                    VARCHAR(500) NULL,
  "CODE"                                      VARCHAR(5000) NULL,
  "CREATED_AT"			                          TIMESTAMP	DEFAULT (now() AT TIME ZONE 'UTC'),
  PRIMARY KEY ("ID")
);

CREATE TABLE "GDM.ITEM_QUESTIONNAIRE" (
  "ID"                                  VARCHAR(1000)		NOT NULL,
  "GDM.QUESTIONNAIRE_ID"                VARCHAR(1000)	 NULL,
  "GDM.ITEM_QUESIONNAIRE_PARENT_ID"     VARCHAR(1000)	 NULL,
  "LINKID"                              VARCHAR(50)	  NOT NULL,
  "DEFINITION"                          VARCHAR(50)		NULL,
  "CODE"                                VARCHAR(5000)		NULL,
  "PREFIX"                              VARCHAR(50)		NULL,
  "TEXT"                                VARCHAR(500)	NULL,
  "TYPE"                                VARCHAR(500)	NOT NULL,
  "ENABLE_WHEN"                         VARCHAR(5000)	NOT NULL,
  "ENABLE_BEHAVIOR"                     VARCHAR(100)	NULL,
  "DISABLED_DISPLAY"                    VARCHAR(100)  NULL,
  "REQUIRED"                            VARCHAR(50)	  NULL,
  "REPEATS"                             VARCHAR(50)	  NULL,
  "READONLY"                            VARCHAR(50)	  NULL,
  "MAXLENGTH"                           INTEGER	NULL,
  "ANSWER_CONSTRAINT"                   VARCHAR(100) NULL,
  "ANSWER_OPTION"                       VARCHAR(5000) NULL,
  "ANSWER_VALUESET"                     VARCHAR(500) NULL,
  "INITIAL_VALUE"                       VARCHAR(5000)	NOT NULL,
  "CREATED_AT"                          TIMESTAMP	DEFAULT (now() AT TIME ZONE 'UTC'),
  PRIMARY KEY ("ID")
)