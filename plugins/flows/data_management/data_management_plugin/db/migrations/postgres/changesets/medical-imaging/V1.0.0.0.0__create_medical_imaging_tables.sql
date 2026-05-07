--liquibase formatted sql
--changeset alp:V1.0.0.0.0__create_medical_imaging_tables


CREATE TABLE image_occurrence(
  image_occurrence_id integer NOT NULL,
  person_id integer NOT NULL,
  procedure_occurrence_id integer NOT NULL,
  visit_occurrence_id integer,
  anatomic_site_concept_id integer,
  wadors_uri varchar(10000),
  local_path varchar(10000),
  image_occurrence_date date NOT NULL,
  image_study_uid varchar(10000) NOT NULL,
  image_series_uid varchar(10000) NOT NULL,
  modality_concept_id integer NOT NULL
);


CREATE TABLE image_feature(
  image_feature_id integer NOT NULL,
  person_id integer NOT NULL,
  image_occurrence_id integer NOT NULL,
  image_feature_event_field_concept_id integer,
  image_feature_event_id integer,
  image_feature_concept_id integer NOT NULL,
  image_feature_type_concept_id integer NOT NULL,
  image_finding_concept_id integer,
  image_finding_id integer,
  anatomic_site_concept_id integer,
  alg_system varchar(10000),
  alg_datetime timestamp
);


--rollback DROP TABLE image_occurrence;
--rollback DROP TABLE image_feature