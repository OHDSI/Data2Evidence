--- OVERALL CHANGES RELATIVE TO ORIGINAL OHDSI-GENERATED FILE
--- 1. Schema name "cdm" substituted for placeholder
--- 2. The type of all fields ending with _id/_id_1/_id_2 has been changed from integer to bigint

--postgresql CDM DDL Specification for OMOP Common Data Model 5.3

-- CHANGES RELATIVE TO VANILLA VERSION:
-- 1. Type of column concept_name has been changed from VARCHAR(255) to VARCHAR(511)
-- 2. Type of column concept_code has been changed from VARCHAR(50) to VARCHAR(511)
-- 3. Type of column vocabulary_id has been changed from VARCHAR(20) to VARCHAR(50)
--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_concept (
			concept_id bigint NOT NULL,
			concept_name varchar(511) NOT NULL,
			domain_id varchar(20) NOT NULL,
			vocabulary_id varchar(50) NOT NULL,
			concept_class_id varchar(20) NOT NULL,
			standard_concept varchar(1) NULL,
			concept_code varchar(511) NOT NULL,
			valid_start_date varchar(20) NOT NULL,
			valid_end_date varchar(20) NOT NULL,
			invalid_reason varchar(1) NULL );

-- CHANGES RELATIVE TO VANILLA VERSION:
-- 1. Type of column vocabulary_id has been changed from VARCHAR(20) to VARCHAR(50)
--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_vocabulary (
			vocabulary_id varchar(50) NOT NULL,
			vocabulary_name varchar(255) NOT NULL,
			vocabulary_reference varchar(255) NOT NULL,
			vocabulary_version varchar(255) NULL,
			vocabulary_concept_id bigint NOT NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_domain (
			domain_id varchar(20) NOT NULL,
			domain_name varchar(255) NOT NULL,
			domain_concept_id bigint NOT NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_concept_class (
			concept_class_id varchar(20) NOT NULL,
			concept_class_name varchar(255) NOT NULL,
			concept_class_concept_id bigint NOT NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_concept_relationship (
			concept_id_1 integer NOT NULL,
			concept_id_2 integer NOT NULL,
			relationship_id varchar(20) NOT NULL,
			valid_start_date date NOT NULL,
			valid_end_date date NOT NULL,
			invalid_reason varchar(1) NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_relationship (
			relationship_id varchar(20) NOT NULL,
			relationship_name varchar(255) NOT NULL,
			is_hierarchical varchar(1) NOT NULL,
			defines_ancestry varchar(1) NOT NULL,
			reverse_relationship_id varchar(20) NOT NULL,
			relationship_concept_id bigint NOT NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_concept_synonym (
			concept_id bigint NOT NULL,
			concept_synonym_name varchar(1000) NOT NULL,
			language_concept_id bigint NOT NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_concept_ancestor (
			ancestor_concept_id bigint NOT NULL,
			descendant_concept_id bigint NOT NULL,
			min_levels_of_separation integer NOT NULL,
			max_levels_of_separation integer NOT NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_source_to_concept_map (
			source_code varchar(50) NOT NULL,
			source_concept_id bigint NOT NULL,
			source_vocabulary_id varchar(20) NOT NULL,
			source_code_description varchar(255) NULL,
			target_concept_id bigint NOT NULL,
			target_vocabulary_id varchar(20) NOT NULL,
			valid_start_date date NOT NULL,
			valid_end_date date NOT NULL,
			invalid_reason varchar(1) NULL );

--HINT DISTRIBUTE ON RANDOM
CREATE TABLE mimic_staging.tmp_drug_strength (
			drug_concept_id bigint NOT NULL,
			ingredient_concept_id bigint NOT NULL,
			amount_value DECIMAL(30,12) NULL,
			amount_unit_concept_id bigint NULL,
			numerator_value DECIMAL(30,12) NULL,
			numerator_unit_concept_id bigint NULL,
			denominator_value DECIMAL(30,12) NULL,
			denominator_unit_concept_id bigint NULL,
			box_size integer NULL,
			valid_start_date date NOT NULL,
			valid_end_date date NOT NULL,
			invalid_reason varchar(1) NULL );
