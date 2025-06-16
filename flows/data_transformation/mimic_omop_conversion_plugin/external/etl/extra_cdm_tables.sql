-- These tables are not filled by the conversion workflow, but are created to
-- a) ensure a complete set of CDM tables in the final schema (avoid DQD errors), and
-- b) allow a simple unload script the assume all target tables to be present

-- In 'mimic-etl' schema

DROP TABLE IF EXISTS mimic_etl.voc_source_to_concept_map;
CREATE TABLE mimic_etl.voc_source_to_concept_map
(
    source_code             text   not null,
    source_concept_id       bigint not null,
    source_vocabulary_id    text   not null,
    source_code_description text,
    target_concept_id       bigint not null,
    target_vocabulary_id    text   not null,
    valid_start_DATE        DATE   not null,
    valid_end_DATE          DATE   not null,
    invalid_reason          text
)
;

DROP TABLE IF EXISTS mimic_etl.cdm_cohort_definition;
CREATE TABLE mimic_etl.cdm_cohort_definition
(
    cohort_definition_id          bigint not null,
    cohort_definition_name        text   not null,
    cohort_definition_description text,
    definition_type_concept_id    bigint not null,
    cohort_definition_syntax      text,
    subject_concept_id            bigint not null,
    cohort_initiation_date        DATE
)
;

DROP TABLE IF EXISTS mimic_etl.cdm_attribute_definition;
CREATE TABLE mimic_etl.cdm_attribute_definition
(
    attribute_definition_id   bigint not null,
    attribute_name            text   not null,
    attribute_description     text,
    attribute_type_concept_id bigint not null,
    attribute_syntax          text
)
;

DROP TABLE IF EXISTS mimic_etl.cdm_metadata;
CREATE TABLE mimic_etl.cdm_metadata
(
    metadata_concept_id      bigint not null,
    metadata_type_concept_id bigint not null,
    name                     text   not null,
    value_as_string          text,
    value_as_concept_id      bigint,
    metadata_date            DATE,
    metadata_datetime        timestamp
)
;

--HINT DISTRIBUTE_ON_KEY(person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_note;
CREATE TABLE mimic_etl.cdm_note
(
    note_id               bigint not null,
    person_id             bigint not null,
    note_date             DATE   not null,
    note_datetime         timestamp,
    note_type_concept_id  bigint not null,
    note_class_concept_id bigint not null,
    note_title            text,
    note_text             text,
    encoding_concept_id   bigint not null,
    language_concept_id   bigint not null,
    provider_id           bigint,
    visit_occurrence_id   bigint,
    visit_detail_id       bigint,
    note_source_value     text
)
;

DROP TABLE IF EXISTS mimic_etl.cdm_note_nlp;
CREATE TABLE mimic_etl.cdm_note_nlp
(
    note_nlp_id                bigint,
    note_id                    bigint,
    section_concept_id         bigint,
    snippet                    text,
    "offset"                   text,
    lexical_variant            text not null,
    note_nlp_concept_id        bigint,
    note_nlp_source_concept_id bigint,
    nlp_system                 text,
    nlp_date                   DATE not null,
    nlp_datetime               timestamp,
    term_exists                text,
    term_temporal              text,
    term_modifiers             text
)
;

--HINT DISTRIBUTE_ON_KEY(subject_id)
DROP TABLE IF EXISTS mimic_etl.cdm_cohort;
CREATE TABLE mimic_etl.cdm_cohort
(
  cohort_definition_id  bigint   not null ,
  subject_id            bigint   not null ,
  cohort_start_date     DATE      not null ,
  cohort_end_date       DATE      not null
)
;

DROP TABLE IF EXISTS mimic_etl.cdm_cohort_attribute;
CREATE TABLE mimic_etl.cdm_cohort_attribute
(
    cohort_definition_id    bigint not null,
    subject_id              bigint not null,
    cohort_start_date       DATE   not null,
    cohort_end_date         DATE   not null,
    attribute_definition_id bigint not null,
    value_as_number         double precision,
    value_as_concept_id     bigint
)
;

--HINT DISTRIBUTE ON RANDOM
DROP TABLE IF EXISTS mimic_etl.cdm_cost;
CREATE TABLE mimic_etl.cdm_cost
(
    cost_id                   bigint      NOT NULL,
    cost_event_id             bigint      NOT NULL,
    cost_domain_id            varchar(20) NOT NULL,
    cost_type_concept_id      bigint      NOT NULL,
    currency_concept_id       bigint      NULL,
    total_charge              DECIMAL(30,12)     NULL,
    total_cost                DECIMAL(30,12)     NULL,
    total_paid                DECIMAL(30,12)     NULL,
    paid_by_payer             DECIMAL(30,12)     NULL,
    paid_by_patient           DECIMAL(30,12)     NULL,
    paid_patient_copay        DECIMAL(30,12)     NULL,
    paid_patient_coinsurance  DECIMAL(30,12)     NULL,
    paid_patient_deductible   DECIMAL(30,12)     NULL,
    paid_by_primary           DECIMAL(30,12)     NULL,
    paid_ingredient_cost      DECIMAL(30,12)     NULL,
    paid_dispensing_fee       DECIMAL(30,12)     NULL,
    payer_plan_period_id      bigint      NULL,
    amount_allowed            DECIMAL(30,12)     NULL,
    revenue_code_concept_id   bigint      NULL,
    revenue_code_source_value varchar(50) NULL,
    drg_concept_id            bigint      NULL,
    drg_source_value          varchar(3)  NULL
);

--HINT DISTRIBUTE ON KEY (person_id)
DROP TABLE IF EXISTS mimic_etl.cdm_payer_plan_period;
CREATE TABLE mimic_etl.cdm_payer_plan_period
(
    payer_plan_period_id          bigint      NOT NULL,
    person_id                     bigint      NOT NULL,
    payer_plan_period_start_date  date        NOT NULL,
    payer_plan_period_end_date    date        NOT NULL,
    payer_concept_id              bigint      NULL,
    payer_source_value            varchar(50) NULL,
    payer_source_concept_id       bigint      NULL,
    plan_concept_id               bigint      NULL,
    plan_source_value             varchar(50) NULL,
    plan_source_concept_id        bigint      NULL,
    sponsor_concept_id            bigint      NULL,
    sponsor_source_value          varchar(50) NULL,
    sponsor_source_concept_id     bigint      NULL,
    family_source_value           varchar(50) NULL,
    stop_reason_concept_id        bigint      NULL,
    stop_reason_source_value      varchar(50) NULL,
    stop_reason_source_concept_id bigint      NULL
);

--HINT DISTRIBUTE ON RANDOM
DROP TABLE IF EXISTS mimic_etl.cdm_provider;
CREATE TABLE mimic_etl.cdm_provider
(
    provider_id                 bigint       NOT NULL,
    provider_name               varchar(255) NULL,
    npi                         varchar(20)  NULL,
    dea                         varchar(20)  NULL,
    specialty_concept_id        bigint       NULL,
    care_site_id                bigint       NULL,
    year_of_birth               integer      NULL,
    gender_concept_id           bigint       NULL,
    provider_source_value       varchar(50)  NULL,
    specialty_source_value      varchar(50)  NULL,
    specialty_source_concept_id bigint       NULL,
    gender_source_value         varchar(50)  NULL,
    gender_source_concept_id    bigint       NULL
);
