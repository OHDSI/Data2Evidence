--- OVERALL CHANGES RELATIVE TO ORIGINAL OHDSI-GENERATED FILE
--- 1. Schema name "cdm" substituted for placeholder & explicitly generated
--- 2. The type of all fields ending with _id/_id_1/_id_2 has been changed from integer to bigint
--- Further, table-specific changes are noted in comments above the DDL for those tables.

--postgresql CDM DDL Specification for OMOP Common Data Model 5.3

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_PERSON (
			person_id bigint NOT NULL,
			gender_concept_id bigint NOT NULL,
			year_of_birth integer NOT NULL,
			month_of_birth integer NULL,
			day_of_birth integer NULL,
			birth_datetime TIMESTAMP NULL,
			race_concept_id bigint NOT NULL,
			ethnicity_concept_id bigint NOT NULL,
			location_id bigint NULL,
			provider_id bigint NULL,
			care_site_id bigint NULL,
			person_source_value varchar(50) NULL,
			gender_source_value varchar(50) NULL,
			gender_source_concept_id bigint NULL,
			race_source_value varchar(50) NULL,
			race_source_concept_id bigint NULL,
			ethnicity_source_value varchar(50) NULL,
			ethnicity_source_concept_id bigint NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_OBSERVATION_PERIOD (
			observation_period_id bigint NOT NULL,
			person_id bigint NOT NULL,
			observation_period_start_date date NOT NULL,
			observation_period_end_date date NOT NULL,
			period_type_concept_id bigint NOT NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_VISIT_OCCURRENCE (
			visit_occurrence_id bigint NOT NULL,
			person_id bigint NOT NULL,
			visit_concept_id bigint NOT NULL,
			visit_start_date date NOT NULL,
			visit_start_datetime TIMESTAMP NULL,
			visit_end_date date NOT NULL,
			visit_end_datetime TIMESTAMP NULL,
			visit_type_concept_id Integer NOT NULL,
			provider_id bigint NULL,
			care_site_id bigint NULL,
			visit_source_value varchar(50) NULL,
			visit_source_concept_id bigint NULL,
			admitting_source_concept_id bigint NULL,
			admitting_source_value varchar(50) NULL,
			discharge_to_concept_id bigint NULL,
			discharge_to_source_value varchar(50) NULL,
			preceding_visit_occurrence_id bigint NULL );

-- CHANGES RELATIVE TO VANILLA VERSION:
-- 1. Position of multiple columns has be changed
-- 2. Type of the column visit_detail_source_value was changed from VARCHAR(50) to VARCHAR(100)
--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_VISIT_DETAIL (
			visit_detail_id bigint NOT NULL,
			person_id bigint NOT NULL,
			visit_detail_concept_id bigint NOT NULL,
			visit_detail_start_date date NOT NULL,
			visit_detail_start_datetime TIMESTAMP NULL,
			visit_detail_end_date date NOT NULL,
			visit_detail_end_datetime TIMESTAMP NULL,
			visit_detail_type_concept_id bigint NOT NULL,
			provider_id bigint NULL,
			care_site_id bigint NULL,
			admitting_source_concept_id Integer NULL,
			discharge_to_concept_id bigint NULL,
			preceding_visit_detail_id bigint NULL,
            visit_detail_source_value varchar(100) NULL,
            visit_detail_source_concept_id Integer NULL,
            admitting_source_value Varchar(50) NULL,
            discharge_to_source_value Varchar(50) NULL,
			visit_detail_parent_id bigint NULL,
			visit_occurrence_id bigint NOT NULL );

-- CHANGES RELATIVE TO VANILLA VERSION:
-- 1. Column condition_status_concept_id has been moved to end
--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_CONDITION_OCCURRENCE (
			condition_occurrence_id bigint NOT NULL,
			person_id bigint NOT NULL,
			condition_concept_id bigint NOT NULL,
			condition_start_date date NOT NULL,
			condition_start_datetime TIMESTAMP NULL,
			condition_end_date date NULL,
			condition_end_datetime TIMESTAMP NULL,
			condition_type_concept_id bigint NOT NULL,
			stop_reason varchar(20) NULL,
			provider_id bigint NULL,
			visit_occurrence_id bigint NULL,
			visit_detail_id bigint NULL,
			condition_source_value varchar(50) NULL,
			condition_source_concept_id bigint NULL,
			condition_status_source_value varchar(50) NULL,
            condition_status_concept_id bigint NULL );

-- CHANGES RELATIVE TO VANILLA VERSION:
-- 1. Type of the column drug_source_value was changed from VARCHAR(50) to VARCHAR(100)
--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_DRUG_EXPOSURE (
			drug_exposure_id bigint NOT NULL,
			person_id bigint NOT NULL,
			drug_concept_id bigint NOT NULL,
			drug_exposure_start_date date NOT NULL,
			drug_exposure_start_datetime TIMESTAMP NULL,
			drug_exposure_end_date date NOT NULL,
			drug_exposure_end_datetime TIMESTAMP NULL,
			verbatim_end_date date NULL,
			drug_type_concept_id bigint NOT NULL,
			stop_reason varchar(20) NULL,
			refills integer NULL,
			quantity NUMERIC NULL,
			days_supply integer NULL,
			sig TEXT NULL,
			route_concept_id bigint NULL,
			lot_number varchar(50) NULL,
			provider_id bigint NULL,
			visit_occurrence_id bigint NULL,
			visit_detail_id bigint NULL,
			drug_source_value varchar(100) NULL,
			drug_source_concept_id bigint NULL,
			route_source_value varchar(50) NULL,
			dose_unit_source_value varchar(50) NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_PROCEDURE_OCCURRENCE (
			procedure_occurrence_id bigint NOT NULL,
			person_id bigint NOT NULL,
			procedure_concept_id bigint NOT NULL,
			procedure_date date NOT NULL,
			procedure_datetime TIMESTAMP NULL,
			procedure_type_concept_id bigint NOT NULL,
			modifier_concept_id bigint NULL,
			quantity integer NULL,
			provider_id bigint NULL,
			visit_occurrence_id bigint NULL,
			visit_detail_id bigint NULL,
			procedure_source_value varchar(50) NULL,
			procedure_source_concept_id bigint NULL,
			modifier_source_value varchar(50) NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_DEVICE_EXPOSURE (
			device_exposure_id bigint NOT NULL,
			person_id bigint NOT NULL,
			device_concept_id bigint NOT NULL,
			device_exposure_start_date date NOT NULL,
			device_exposure_start_datetime TIMESTAMP NULL,
			device_exposure_end_date date NULL,
			device_exposure_end_datetime TIMESTAMP NULL,
			device_type_concept_id bigint NOT NULL,
			unique_device_id varchar(50) NULL,
			quantity integer NULL,
			provider_id bigint NULL,
			visit_occurrence_id bigint NULL,
			visit_detail_id bigint NULL,
			device_source_value varchar(50) NULL,
			device_source_concept_id bigint NULL );

-- CHANGES RELATIVE TO VANILLA VERSION:
-- 1. Type of column measurement_source_value has been changed from VARCHAR(50) to VARCHAR(255)
-- 2. Type of column unit_source_value has been changed from VARCHAR(50) to VARCHAR(255)
-- 3. Type of column value_source_value has been changed from VARCHAR(50) to VARCHAR(255)
--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_MEASUREMENT (
			measurement_id bigint NOT NULL,
			person_id bigint NOT NULL,
			measurement_concept_id bigint NOT NULL,
			measurement_date date NOT NULL,
			measurement_datetime TIMESTAMP NULL,
			measurement_time varchar(10) NULL,
			measurement_type_concept_id bigint NOT NULL,
			operator_concept_id bigint NULL,
			value_as_number NUMERIC NULL,
			value_as_concept_id bigint NULL,
			unit_concept_id bigint NULL,
			range_low NUMERIC NULL,
			range_high NUMERIC NULL,
			provider_id bigint NULL,
			visit_occurrence_id bigint NULL,
			visit_detail_id bigint NULL,
			measurement_source_value varchar(255) NULL,
			measurement_source_concept_id bigint NULL,
			unit_source_value varchar(255) NULL,
			value_source_value varchar(255) NULL );

-- CHANGES RELATIVE TO VANILLA VERSION:
-- 1. Type of column value_as_string has been changed from VARCHAR(60) to VARCHAR(100)
--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_OBSERVATION (
			observation_id bigint NOT NULL,
			person_id bigint NOT NULL,
			observation_concept_id bigint NOT NULL,
			observation_date date NOT NULL,
			observation_datetime TIMESTAMP NULL,
			observation_type_concept_id bigint NOT NULL,
			value_as_number NUMERIC NULL,
			value_as_string varchar(100) NULL,
			value_as_concept_id Integer NULL,
			qualifier_concept_id bigint NULL,
			unit_concept_id bigint NULL,
			provider_id bigint NULL,
			visit_occurrence_id bigint NULL,
			visit_detail_id bigint NULL,
			observation_source_value varchar(50) NULL,
			observation_source_concept_id bigint NULL,
			unit_source_value varchar(50) NULL,
			qualifier_source_value varchar(50) NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_DEATH (
			person_id bigint NOT NULL,
			death_date date NOT NULL,
			death_datetime TIMESTAMP NULL,
			death_type_concept_id bigint NULL,
			cause_concept_id bigint NULL,
			cause_source_value varchar(50) NULL,
			cause_source_concept_id bigint NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_NOTE (
			note_id bigint NOT NULL,
			person_id bigint NOT NULL,
			note_date date NOT NULL,
			note_datetime TIMESTAMP NULL,
			note_type_concept_id bigint NOT NULL,
			note_class_concept_id bigint NOT NULL,
			note_title varchar(250) NULL,
			note_text TEXT NOT NULL,
			encoding_concept_id bigint NOT NULL,
			language_concept_id bigint NOT NULL,
			provider_id bigint NULL,
			visit_occurrence_id bigint NULL,
			visit_detail_id bigint NULL,
			note_source_value varchar(50) NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_NOTE_NLP (
			note_nlp_id bigint NOT NULL,
			note_id bigint NOT NULL,
			section_concept_id bigint NULL,
			snippet varchar(250) NULL,
			"offset" varchar(50) NULL,
			lexical_variant varchar(250) NOT NULL,
			note_nlp_concept_id bigint NULL,
			note_nlp_source_concept_id bigint NULL,
			nlp_system varchar(250) NULL,
			nlp_date date NOT NULL,
			nlp_datetime TIMESTAMP NULL,
			term_exists varchar(1) NULL,
			term_temporal varchar(50) NULL,
			term_modifiers varchar(2000) NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_SPECIMEN (
			specimen_id bigint NOT NULL,
			person_id bigint NOT NULL,
			specimen_concept_id bigint NOT NULL,
			specimen_type_concept_id bigint NOT NULL,
			specimen_date date NOT NULL,
			specimen_datetime TIMESTAMP NULL,
			quantity NUMERIC NULL,
			unit_concept_id bigint NULL,
			anatomic_site_concept_id bigint NULL,
			disease_status_concept_id bigint NULL,
			specimen_source_id varchar(50) NULL,
			specimen_source_value varchar(50) NULL,
			unit_source_value varchar(50) NULL,
			anatomic_site_source_value varchar(50) NULL,
			disease_status_source_value varchar(50) NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_FACT_RELATIONSHIP (
			domain_concept_id_1 integer NOT NULL,
			fact_id_1 bigint NOT NULL,
			domain_concept_id_2 integer NOT NULL,
			fact_id_2 bigint NOT NULL,
			relationship_concept_id bigint NOT NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_LOCATION (
			location_id bigint NOT NULL,
			address_1 varchar(50) NULL,
			address_2 varchar(50) NULL,
			city varchar(50) NULL,
			state varchar(2) NULL,
			zip varchar(9) NULL,
			county varchar(20) NULL,
			location_source_value varchar(50) NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_CARE_SITE (
			care_site_id bigint NOT NULL,
			care_site_name varchar(255) NULL,
			place_of_service_concept_id bigint NULL,
			location_id bigint NULL,
			care_site_source_value varchar(50) NULL,
			place_of_service_source_value varchar(50) NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_PROVIDER (
			provider_id bigint NOT NULL,
			provider_name varchar(255) NULL,
			npi varchar(20) NULL,
			dea varchar(20) NULL,
			specialty_concept_id bigint NULL,
			care_site_id bigint NULL,
			year_of_birth integer NULL,
			gender_concept_id bigint NULL,
			provider_source_value varchar(50) NULL,
			specialty_source_value varchar(50) NULL,
			specialty_source_concept_id bigint NULL,
			gender_source_value varchar(50) NULL,
			gender_source_concept_id bigint NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_PAYER_PLAN_PERIOD (
			payer_plan_period_id bigint NOT NULL,
			person_id bigint NOT NULL,
			payer_plan_period_start_date date NOT NULL,
			payer_plan_period_end_date date NOT NULL,
			payer_concept_id bigint NULL,
			payer_source_value varchar(50) NULL,
			payer_source_concept_id bigint NULL,
			plan_concept_id bigint NULL,
			plan_source_value varchar(50) NULL,
			plan_source_concept_id bigint NULL,
			sponsor_concept_id bigint NULL,
			sponsor_source_value varchar(50) NULL,
			sponsor_source_concept_id bigint NULL,
			family_source_value varchar(50) NULL,
			stop_reason_concept_id bigint NULL,
			stop_reason_source_value varchar(50) NULL,
			stop_reason_source_concept_id bigint NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_COST (
			cost_id bigint NOT NULL,
			cost_event_id bigint NOT NULL,
			cost_domain_id varchar(20) NOT NULL,
			cost_type_concept_id bigint NOT NULL,
			currency_concept_id bigint NULL,
			total_charge NUMERIC NULL,
			total_cost NUMERIC NULL,
			total_paid NUMERIC NULL,
			paid_by_payer NUMERIC NULL,
			paid_by_patient NUMERIC NULL,
			paid_patient_copay NUMERIC NULL,
			paid_patient_coinsurance NUMERIC NULL,
			paid_patient_deductible NUMERIC NULL,
			paid_by_primary NUMERIC NULL,
			paid_ingredient_cost NUMERIC NULL,
			paid_dispensing_fee NUMERIC NULL,
			payer_plan_period_id bigint NULL,
			amount_allowed NUMERIC NULL,
			revenue_code_concept_id bigint NULL,
			revenue_code_source_value varchar(50) NULL,
			drg_concept_id bigint NULL,
			drg_source_value varchar(3) NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_DRUG_ERA (
			drug_era_id bigint NOT NULL,
			person_id bigint NOT NULL,
			drug_concept_id bigint NOT NULL,
			drug_era_start_date date NOT NULL,
			drug_era_end_date date NOT NULL,
			drug_exposure_count integer NULL,
			gap_days integer NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_DOSE_ERA (
			dose_era_id bigint NOT NULL,
			person_id bigint NOT NULL,
			drug_concept_id bigint NOT NULL,
			unit_concept_id bigint NOT NULL,
			dose_value NUMERIC NOT NULL,
			dose_era_start_date date NOT NULL,
			dose_era_end_date date NOT NULL );

--HINT DISTRIBUTE ON KEY (person_id)
CREATE TABLE mimic_etl.src_CONDITION_ERA (
			condition_era_id bigint NOT NULL,
			person_id bigint NOT NULL,
			condition_concept_id bigint NOT NULL,
			condition_era_start_date date NOT NULL,
			condition_era_end_date date NOT NULL,
			condition_occurrence_count integer NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_METADATA (
			metadata_concept_id bigint NOT NULL,
			metadata_type_concept_id bigint NOT NULL,
			name varchar(250) NOT NULL,
			value_as_string varchar(250) NULL,
			value_as_concept_id bigint NULL,
			metadata_date date NULL,
			metadata_datetime TIMESTAMP NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_CDM_SOURCE (
			cdm_source_name varchar(255) NOT NULL,
			cdm_source_abbreviation varchar(25) NULL,
			cdm_holder varchar(255) NULL,
			source_description TEXT NULL,
			source_documentation_reference varchar(255) NULL,
			cdm_etl_reference varchar(255) NULL,
			source_release_date date NULL,
			cdm_release_date date NULL,
			cdm_version varchar(10) NULL,
			vocabulary_version varchar(20) NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_COHORT_DEFINITION (
			cohort_definition_id bigint NOT NULL,
			cohort_definition_name varchar(255) NOT NULL,
			cohort_definition_description TEXT NULL,
			definition_type_concept_id bigint NOT NULL,
			cohort_definition_syntax TEXT NULL,
			subject_concept_id bigint NOT NULL,
			cohort_initiation_date date NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_etl.src_ATTRIBUTE_DEFINITION (
			attribute_definition_id bigint NOT NULL,
			attribute_name varchar(255) NOT NULL,
			attribute_description TEXT NULL,
			attribute_type_concept_id bigint NOT NULL,
			attribute_syntax TEXT NULL );