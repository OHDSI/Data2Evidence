# Execution order of ETL SQL scripts

The below lists gives the execution order of the SQL script files in this directory.
THe execution order must be observed since some transformation steps depend on CDM or auxiliary tables created by other steps.
It is taken directly from the [configuration file for the ETL step](https://github.com/OHDSI/MIMIC/blob/master/conf/workflow_etl.conf) in the [repository for the standard OHDSI MIMIC-to-OMOP conversion tool](https://github.com/OHDSI/MIMIC). 
Bracketed file names correspond to files that manipulate data not included in our transformation workflow (e.g. waveform data) - these will most likely lead to errors if run.

1. cdm_location.sql
2. cdm_care_site.sql
3. cdm_person.sql
4. cdm_death.sql
5. lk_vis_part_1.sql
6. lk_meas_unit.sql
7. lk_meas_chartevents.sql
8. lk_meas_labevents.sql
9. lk_meas_specimen.sql
10. (lk_meas_waveform.sql)
    * skipped since only relevant for waveforms
11. lk_vis_part_2.sql 
    * waveform part commented out
12. cdm_visit_occurrence.sql
13. cdm_visit_detail.sql
14. lk_cond_diagnoses.sql
15. lk_procedure.sql
    * on my local machine, this required me to use the `--shm-size` flag for `docker run` to
16. lk_observation.sql
17. cdm_condition_occurrence.sql
18. cdm_procedure_occurrence.sql
19. cdm_specimen.sql
20. cdm_measurement.sql
    * waveform part commented out
21. lk_drug.sql
22. cdm_drug_exposure.sql
23. cdm_device_exposure.sql
24. cdm_observation.sql
25. cdm_observation_period.sql
26. cdm_finalize_person.sql
27. cdm_fact_relationship.sql
28. cdm_condition_era.sql
29. cdm_drug_era.sql
30. cdm_dose_era.sql
31. ext_d_itemid_to_concept.sql
32. cdm_cdm_source.sql
