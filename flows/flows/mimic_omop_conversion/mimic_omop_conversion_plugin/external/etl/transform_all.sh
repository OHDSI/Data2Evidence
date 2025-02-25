# Script the uses psql to do all ETL transformations in the right order
#
# The script assumes the following:
# 1. The DB host, DB user, DB port, and database name are set in the environment (env vars PGHOST, PGUSER, PGPORT, and PGDATABASE)
# 2. psql commands can be executed without a password prompt (e.g. though use of a .pgpass password file)

echo "Running cdm_location.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_location.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db 
echo "Running cdm_care_site.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_care_site.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_person.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_person.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_death.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_death.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_vis_part_1.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_vis_part_1.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_meas_unit.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_meas_unit.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
# ZHI MIN: ULLIF(regexp_extract(),'') replace postgres(regexp_match)
echo "Running lk_meas_chartevents.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_meas_chartevents.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_meas_labevents.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_meas_labevents.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_meas_specimen.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_meas_specimen.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_vis_part_2.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_vis_part_2.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_visit_occurrence.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_visit_occurrence.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_visit_detail.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_visit_detail.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_cond_diagnoses.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_cond_diagnoses.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_procedure.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_procedure.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_observation.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_observation.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_condition_occurrence.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_condition_occurrence.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_procedure_occurrence.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_procedure_occurrence.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_specimen.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_specimen.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_measurement.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_measurement.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running lk_drug.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < lk_drug.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_drug_exposure.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_drug_exposure.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_device_exposure.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_device_exposure.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_observation.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_observation.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_observation_period.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_observation_period.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_finalize_person.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_finalize_person.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_fact_relationship.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_fact_relationship.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_condition_era.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_condition_era.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_drug_era.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_drug_era.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_dose_era.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_dose_era.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running ext_d_itemid_to_concept.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < ext_d_itemid_to_concept.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
echo "Running cdm_cdm_source.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db"
../../duckdb < cdm_cdm_source.sql /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db
