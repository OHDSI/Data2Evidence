-- http://ohdsi.github.io/CommonDataModel/cdm54Changes.html
-- PostgreSQL SQL references: 
--	https://www.postgresql.org/docs/current/sql-altertable.html
--
-- VISIT_OCCURRENCE
-- admitting_source_concept_id -> admitted_from_concept_id
-- admitting_source_value -> admitted_from_source_value
-- discharge_to_concept_id -> discharged_to_concept_id
-- discharge_to_source_value -> discharged_to_source_value

alter table visit_occurrence rename column admitting_source_concept_id to admitted_from_concept_id;
alter table visit_occurrence rename column admitting_source_value to admitted_from_source_value;
alter table visit_occurrence rename column discharge_to_concept_id to discharged_to_concept_id;
alter table visit_occurrence rename column discharge_to_source_value to discharged_to_source_value;

--
-- VISIT_DETAIL
-- admitting_source_concept_id -> admitted_from_concept_id
-- admitting_source_value -> admitted_from_source_value
-- discharge_to_concept_id -> discharged_to_concept_id
-- discharge_to_source_value -> discharged_to_source_value
-- visit_detail_parent_id -> parent_visit_detail_id

alter table visit_detail rename column admitting_source_concept_id to admitted_from_concept_id;
alter table visit_detail rename column admitting_source_value to admitted_from_source_value;
alter table visit_detail rename column discharge_to_concept_id to discharged_to_concept_id;
alter table visit_detail rename column discharge_to_source_value to discharged_to_source_value;
alter table visit_detail rename column visit_detail_parent_id to parent_visit_detail_id;

-- PROCEDURE_OCCURRENCE
-- + Procedure_end_date
-- + Procedure_end_datetime

alter table procedure_occurrence add column procedure_end_date date default null;
alter table procedure_occurrence add column procedure_end_datetime timestamp default null;

-- DEVICE_EXPOSURE
-- Unique_device_id -> Changed to varchar(255)
-- + Production_id
-- + Unit_concept_id
-- + Unit_source_value
-- + Unit_source_concept_id

alter table device_exposure alter column unique_device_id type varchar(300);
alter table device_exposure add column production_id integer default null;
alter table device_exposure add column unit_concept_id integer default null;
alter table device_exposure add column unit_source_value varchar(50) default null;
alter table device_exposure add column unit_source_concept_id integer default null;

-- MEASUREMENT
-- + Unit_source_concept_id
-- + Measurement_event_id
-- + Meas_event_field_concept_id

alter table measurement add column unit_source_concept_id integer default null;
alter table measurement add column measurement_event_id integer default null;
alter table measurement add column meas_event_field_concept_id integer default null;

-- OBSERVATION
-- + Value_source_value
-- + Observation_event_id
-- + Obs_event_field_concept_id

alter table observation add column value_source_value varchar(50) default null;
alter table observation add column observation_event_id integer default null;
alter table observation add column obs_event_field_concept_id integer default null;

-- NOTE
-- + Note_event_id
-- + Note_event_field_concept_id

alter table note add column note_event_id integer default null;
alter table note add column note_event_field_concept_id integer default null;

-- LOCATION
-- + Country_concept_id
-- + Country_source_value
-- + Latitude
-- + Longitude

alter table location add column country_concept_id integer default null;
alter table location add column country_source_value varchar(80) default null;
alter table location add column latitude numeric default null;
alter table location add column longitude numeric default null;


-- CONDITION_ERA

alter table condition_era alter column condition_era_start_date type date;
alter table condition_era alter column condition_era_end_date type date;

-- DOSE_ERA
alter table dose_era alter column dose_era_start_date type date;
alter table dose_era alter column dose_era_end_date type date;

-- DRUG_ERA
alter table drug_era alter column drug_era_start_date type date;
alter table drug_era alter column drug_era_end_date type date;



-- EPISODE
CREATE TABLE EPISODE  (
            episode_id integer NOT NULL,
			person_id integer NOT NULL,
			episode_concept_id integer NOT NULL,
			episode_start_date date NOT NULL,
			episode_start_datetime TIMESTAMP NULL,
			episode_end_date date NULL,
			episode_end_datetime TIMESTAMP NULL,
			episode_parent_id integer NULL,
			episode_number integer NULL,
			episode_object_concept_id integer NOT NULL,
			episode_type_concept_id integer NOT NULL,
			episode_source_value varchar(50) NULL,
			episode_source_concept_id integer NULL );

-- EPISODE_EVENT
CREATE TABLE EPISODE_EVENT  (
            episode_id integer NOT NULL,
			event_id integer NOT NULL,
			episode_event_field_concept_id integer NOT NULL );


-- METADATA
-- + Metadata_id
-- + Value_as_number

alter table metadata add column metadata_id integer default null;
alter table metadata add column value_as_number numeric default null;

-- CDM_SOURCE
-- Cdm_source_name -> Mandatory field
-- Cdm_source_abbreviation -> Mandatory field
-- Cdm_holder -> Mandatory field
-- Source_release_date -> Mandatory field
-- Cdm_release_date -> Mandatory field
-- + Cdm_version_concept_id

alter table cdm_source rename to cdm_source_v53;

CREATE TABLE cdm_source  (
            cdm_source_name varchar(255) NOT NULL,
			cdm_source_abbreviation varchar(25) NOT NULL,
			cdm_holder varchar(255) NOT NULL,
			source_description text NULL,
			source_documentation_reference varchar(255) NULL,
			cdm_etl_reference varchar(255) NULL,
			source_release_date date NOT NULL,
			cdm_release_date date NOT NULL,
			cdm_version varchar(10) NULL,
			cdm_version_concept_id integer NOT NULL,
			vocabulary_version varchar(20) NOT NULL );

insert into cdm_source 
select cdm_source_name,cdm_source_abbreviation,cdm_holder,
            source_description,source_documentation_reference,cdm_etl_reference,
			source_release_date,cdm_release_date,'5.4',
            798878,vocabulary_version
from cdm_source_v53;

-- VOCABULARY
-- Vocabulary_reference -> Non-mandatory field
-- Vocabulary_version -> Non-mandatory field
alter table vocabulary rename to vocabulary_v53;

CREATE TABLE vocabulary  (
            vocabulary_id varchar(20) NOT NULL,
			vocabulary_name varchar(255) NOT NULL,
			vocabulary_reference varchar(255) NULL,
			vocabulary_version varchar(255) NULL,
			vocabulary_concept_id integer NOT NULL );

insert into vocabulary 
select vocabulary_id,vocabulary_name,vocabulary_reference,
       vocabulary_version, vocabulary_concept_id
from vocabulary_v53;

			
-- ATTRIBUTE_DEFINITION
drop table attribute_definition;

-- COHORT
CREATE TABLE cohort  (
            cohort_definition_id integer NOT NULL,
			subject_id integer NOT NULL,
			cohort_start_date date NOT NULL,
			cohort_end_date date NOT NULL );



