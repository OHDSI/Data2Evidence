--liquibase formatted sql
--changeset alp:V5.3.1.1.2__addsurvey

CREATE TABLE survey_conduct 
(
  survey_conduct_id					INTEGER			NOT NULL ,
  person_id						    BIGINT			NOT NULL ,
  survey_concept_id			  		INTEGER			NOT NULL ,
  survey_start_date				    DATE			NULL ,
  survey_start_datetime				TIMESTAMP		NULL ,
  survey_end_date					DATE			NULL ,
  survey_end_datetime				TIMESTAMP		NOT NULL ,
  provider_id						BIGINT			NULL ,
  assisted_concept_id	  			INTEGER			NOT NULL ,
  respondent_type_concept_id		INTEGER			NOT NULL ,
  timing_concept_id					INTEGER			NOT NULL ,
  collection_method_concept_id		INTEGER			NOT NULL ,
  assisted_source_value		  		VARCHAR(50)		NULL ,
  respondent_type_source_value		VARCHAR(100)  	NULL ,
  timing_source_value				VARCHAR(100)	NULL ,
  collection_method_source_value	VARCHAR(100)	NULL ,
  survey_source_value				VARCHAR(100)	NULL ,
  survey_source_concept_id			INTEGER			NOT NULL ,
  survey_source_identifier			VARCHAR(200)	NULL ,
  validated_survey_concept_id		INTEGER			NOT NULL ,
  validated_survey_source_value		VARCHAR(100)	NULL ,
  survey_version_number				VARCHAR(20)		NULL ,
  visit_occurrence_id				BIGINT			NULL ,
  visit_detail_id					BIGINT			NULL ,
  response_visit_occurrence_id	BIGINT			NULL
);

ALTER TABLE observation ADD (observation_event_id INTEGER NULL);
ALTER TABLE observation ADD (value_as_datetime INTEGER NULL);


