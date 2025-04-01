--- Truncate all vocabulary tables

--- Set up the temporary tables needed to hold custom concepts (in the staging schema)

DROP TABLE IF EXISTS mimic_staging.tmp_custom_mapping;

CREATE TABLE mimic_staging.tmp_custom_mapping
(
    concept_name                  varchar(1024) NOT NULL,
    source_concept_id             bigint        NOT NULL,
    source_vocabulary_id          varchar(1024) NULL,
    source_domain_id              varchar(1024) NULL,
    source_concept_class_id       varchar(1024) NULL,
    standard_concept              varchar(1024) NULL,
    concept_code                  varchar(1024) NULL,
    valid_start_date              varchar(1024) NULL,
    valid_end_date                varchar(1024) NULL,
    invalid_reason                varchar(1024) NULL,
    target_concept_id             bigint        NULL,
    relationship_id               varchar(1024) NULL,
    reverese_relationship_id      varchar(1024) NULL,
    relationship_valid_start_date varchar(1024) NULL,
    relationship_end_date         varchar(1024) NULL,
    invalid_reason_cr             varchar(1024) NULL
);

--- Load extra MIMIC concepts from CSV files, copy from appends the data to whatever is already in the table already
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_cs_place_of_service.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_drug_ndc.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_drug_route.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_meas_chartevents_main_mod.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_meas_chartevents_value.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_meas_lab_loinc_mod.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_meas_unit.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_meas_waveforms.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_micro_antibiotic.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_micro_microtest.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_micro_organism.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_micro_resistance.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_micro_specimen.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_mimic_generated.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_obs_drgcodes.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_obs_insurance.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_obs_marital.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_per_ethnicity.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_proc_datetimeevents.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_proc_itemid.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_custom_mapping FROM 'flows/mimic_omop_conversion_plugin/external/custom_mapping_csv/gcpt_vis_admission.csv' (DELIMITER ',', FORMAT CSV, HEADER, QUOTE '"') ;