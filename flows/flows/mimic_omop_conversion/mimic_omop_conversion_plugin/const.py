SqlDir = 'flows/mimic_omop_conversion_plugin/external'

MIMICCreateSql = f'{SqlDir}/duckdb_create_mimic.sql'
CreatVocabTable = f'{SqlDir}/vocabulary-refresh/create_vocab_input_tables.sql'

StagDir = f'{SqlDir}/staging'
StagSql = ['etl_OMOPCDM_postgresql_5.3_ddl_adapted_no_vocab.sql', 
                'st_core.sql',
                'st_hosp.sql',
                'st_icu.sql',
                'voc_copy_to_target_dataset.sql']

CustomVocabDir = f'{SqlDir}/vocabulary-refresh/'
CustomVocabSqls = ['create_voc_from_tmp.sql', 
                'custom_mapping_load.sql',
                'custom_vocabularies.sql',
                'vocabulary_cleanup.sql']


ETLDir = f'{SqlDir}/etl'
ETLSqls = ['cdm_location.sql',
            'cdm_care_site.sql',
            'cdm_person.sql',
            'cdm_death.sql',
            'lk_vis_part_1.sql',
            'lk_meas_unit.sql',
            # ULLIF(regexp_extract(),'') replace postgres(regexp_match)
            'lk_meas_chartevents.sql',
            'lk_meas_labevents.sql',
            'lk_meas_specimen.sql',
            'lk_vis_part_2.sql',
            'cdm_visit_occurrence.sql',
            'cdm_visit_detail.sql',
            'lk_cond_diagnoses.sql',
            'lk_procedure.sql',
            'lk_observation.sql',
            'cdm_condition_occurrence.sql',
            'cdm_procedure_occurrence.sql',
            'cdm_specimen.sql',
            'cdm_measurement.sql',
            'lk_drug.sql',
            'cdm_drug_exposure.sql',
            'cdm_device_exposure.sql',
            'cdm_observation.sql',
            'cdm_observation_period.sql',
            'cdm_finalize_person.sql',
            'cdm_fact_relationship.sql',
            'cdm_condition_era.sql',
            'cdm_drug_era.sql',
            'cdm_dose_era.sql',
            'ext_d_itemid_to_concept.sql',
            'cdm_cdm_source.sql',
            'extra_cdm_tables.sql']

CdmDir = f'{SqlDir}/unload/'
CdmSqls = ['OMOPCDM_duckdb_5.3_ddl_adapted.sql',
            'unload_to_atlas_gen.sql']

# Compare from OHDSI, the ddl of duckdb and postgres are the same
PostgresDDL = f'{CdmDir}export_postgresql_5.3_ddl_adapted.sql'
HANADDL = f'{CdmDir}export_hana_5.3_ddl_adapted.sql'