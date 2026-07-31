--liquibase formatted sql
--changeset alp:V1.0.0.0.0__create_waveform_tables


CREATE TABLE waveform_occurrence(
  waveform_occurrence_id integer NOT NULL,
  waveform_occurrence_concept_id integer NOT NULL,
  person_id integer NOT NULL,
  waveform_occurrence_start_datetime timestamp NOT NULL,
  waveform_occurrence_end_datetime timestamp NOT NULL,
  visit_occurrence_id integer NOT NULL,
  visit_detail_id integer,
  preceding_waveform_occurrence_id integer,
  waveform_format_concept_id integer,
  waveform_occurrence_source_value varchar(255),
  num_of_files integer,
  waveform_format_source_value varchar(50)
);


CREATE TABLE waveform_registry(
  waveform_registry_id integer NOT NULL,
  waveform_occurrence_id integer NOT NULL,
  waveform_feature_id integer,
  person_id integer NOT NULL,
  waveform_file_start_datetime timestamp NOT NULL,
  waveform_file_end_datetime timestamp NOT NULL,
  visit_occurrence_id integer NOT NULL,
  visit_detail_id integer,
  file_extension_concept_id integer,
  file_extension_source_value varchar(50) NOT NULL,
  waveform_source_file_uri varchar(10000),
  waveform_target_file_uri varchar(10000) NOT NULL
);


CREATE TABLE waveform_channel_metadata(
  waveform_channel_metadata_id integer NOT NULL,
  waveform_registry_id integer NOT NULL,
  procedure_occurrence_id integer,
  device_exposure_id integer,
  waveform_channel_source_value varchar(50),
  channel_concept_id integer NOT NULL,
  metadata_source_value varchar(50) NOT NULL,
  metadata_concept_id integer NOT NULL,
  value_as_number numeric,
  value_as_concept_id integer,
  value_as_string varchar(255),
  unit_concept_id integer,
  unit_source_value varchar(50)
);


CREATE TABLE waveform_feature(
  waveform_feature_id integer NOT NULL,
  waveform_occurrence_id integer NOT NULL,
  waveform_registry_id integer NOT NULL,
  waveform_channel_metadata_id integer NOT NULL,
  measurement_id integer,
  observation_id integer,
  algorithm_concept_id integer NOT NULL,
  algorithm_source_value varchar(255),
  anatomic_site_concept_id integer,
  waveform_feature_start_timestamp time,
  waveform_feature_end_timestamp time,
  is_feature_overflow boolean,
  value_as_number numeric,
  value_as_concept_id integer,
  value_as_string varchar(255),
  value_is_a_registry_file boolean,
  unit_concept_id integer,
  unit_source_value varchar(50)
);


--rollback DROP TABLE waveform_occurrence;
--rollback DROP TABLE waveform_registry;
--rollback DROP TABLE waveform_channel_metadata;
--rollback DROP TABLE waveform_feature;
