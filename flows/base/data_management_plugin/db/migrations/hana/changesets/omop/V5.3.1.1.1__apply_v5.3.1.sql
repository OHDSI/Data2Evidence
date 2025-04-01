--liquibase formatted sql
--changeset alp:V5.3.1.1.1__apply_v5.3.1

CREATE TABLE visit_detail
(
  visit_detail_id                    INTEGER     NOT NULL ,
  person_id                          INTEGER     NOT NULL ,
  visit_detail_concept_id            INTEGER     NOT NULL ,
  visit_detail_start_date            DATE        NOT NULL ,
  visit_detail_start_datetime        TIMESTAMP    NULL ,
  visit_detail_end_date              DATE        NOT NULL ,
  visit_detail_end_datetime          TIMESTAMP    NULL ,
  visit_detail_type_concept_id       INTEGER     NOT NULL ,
  provider_id                        INTEGER     NULL ,
  care_site_id                       INTEGER     NULL ,
  admitting_source_concept_id        INTEGER     NULL ,
  discharge_to_concept_id            INTEGER     NULL ,
  preceding_visit_detail_id          INTEGER     NULL ,
  visit_detail_source_value          VARCHAR(50) NULL ,
  visit_detail_source_concept_id     INTEGER     NULL ,
  admitting_source_value             VARCHAR(50) NULL ,
  discharge_to_source_value          VARCHAR(50) NULL ,
  visit_detail_parent_id             INTEGER     NULL ,
  visit_occurrence_id                INTEGER     NOT NULL
)
;

CREATE TABLE metadata
(
  metadata_concept_id       INTEGER       NOT NULL ,
  metadata_type_concept_id  INTEGER       NOT NULL ,
  name                      VARCHAR(250)  NOT NULL ,
  value_as_string           TEXT  NULL ,
  value_as_concept_id       INTEGER       NULL ,
  metadata_date             DATE          NULL ,
  metadata_datetime         TIMESTAMP      NULL
)
;


alter table measurement ADD (measurement_time VARCHAR(10) NULL);
RENAME COLUMN PROCEDURE_occurrence.qualifier_source_value TO modifier_source_value;

alter table PAYER_PLAN_PERIOD 
  add (payer_concept_id              INTEGER       NULL ,
   payer_source_concept_id       INTEGER       NULL ,
   plan_concept_id               INTEGER       NULL ,
   plan_source_concept_id        INTEGER       NULL ,
   sponsor_concept_id            INTEGER       NULL ,
   sponsor_source_concept_id     INTEGER       NULL ,
   stop_reason_concept_id        INTEGER       NULL ,
   stop_reason_source_value      VARCHAR(50)      NULL ,
   stop_reason_source_concept_id INTEGER       NULL);


alter table procedure_occurrence add (visit_detail_id INTEGER NULL);
alter table drug_exposure add (visit_detail_id INTEGER NULL);
alter table device_exposure add (visit_detail_id INTEGER NULL);
alter table condition_occurrence add (visit_detail_id INTEGER NULL);
alter table measurement add (visit_detail_id INTEGER NULL);
alter table note add (visit_detail_id INTEGER NULL);
alter table observation add (visit_detail_id INTEGER NULL);

-- Unique Constraints
-- alter table concept_synonym ADD CONSTRAINT uq_concept_synonym UNIQUE (concept_id, concept_synonym_name, language_concept_id);

-- CREATE INDEX idx_visit_detail_person_id  ON visit_detail  (person_id ASC);
-- CREATE INDEX idx_visit_detail_concept_id ON visit_detail (visit_detail_concept_id ASC);