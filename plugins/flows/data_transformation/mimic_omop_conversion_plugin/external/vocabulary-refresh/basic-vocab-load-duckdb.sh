# This script uses psql to carry out the commands in basic-vocab-load.sql, but uses the psql \copy meta-command rather
# than the SQL COPY ... FROM ... command. This has the advantage that the read privileges on the files are that of
# the local user executing the command, sidestepping the need for superuser DB privileges.

# Truncate all vocabulary tables
./duckdb /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db -c "\
TRUNCATE TABLE mimic_staging.tmp_drug_strength;                                  
TRUNCATE TABLE mimic_staging.tmp_concept;
TRUNCATE TABLE mimic_staging.tmp_concept_relationship;
TRUNCATE TABLE mimic_staging.tmp_concept_ancestor;
TRUNCATE TABLE mimic_staging.tmp_concept_synonym;
TRUNCATE TABLE mimic_staging.tmp_vocabulary;
TRUNCATE TABLE mimic_staging.tmp_relationship;
TRUNCATE TABLE mimic_staging.tmp_concept_class;
TRUNCATE TABLE mimic_staging.tmp_domain;"

# Adopted from the Postgres load scripts available in the OHDSI CDM GitHub repository under the 5.3.1 tag
# (https://github.com/OHDSI/CommonDataModel/tree/v5.3.1)
# concept.csv has mismatch line, so use pandas to re-create the csv:
# Method1: df = pd.read_csv('CONCEPT.csv', na_filter=False, sep='\t')
#           df.to_csv('CONCEPT_utf-8.csv', sep='\t', encoding='utf-8', index=False)
# Use Method2: mkdir transformed
#           for CSV_FILE in *.csv; do sed "s/\"/\"\"/g;s/\t/\"\t\"/g;s/\(.*\)/\"\1\"/" $CSV_FILE >> ./transformed/$CSV_FILE; done

./duckdb /Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/mimiciv-demo-22.db -c "\
COPY mimic_staging.tmp_drug_strength FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/DRUG_STRENGTH.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_concept FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/CONCEPT.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_concept_relationship FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/CONCEPT_RELATIONSHIP.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_concept_ancestor FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/CONCEPT_ANCESTOR.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_concept_synonym FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/CONCEPT_SYNONYM.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_vocabulary FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/VOCABULARY.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_relationship FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/RELATIONSHIP.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_concept_class FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/CONCEPT_CLASS.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;
COPY mimic_staging.tmp_domain FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/transformed/DOMAIN.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '\"') ;"
