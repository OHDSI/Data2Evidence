--- Truncate all vocabulary tables
TRUNCATE TABLE mimic_staging.tmp_drug_strength;
TRUNCATE TABLE mimic_staging.tmp_concept;
TRUNCATE TABLE mimic_staging.tmp_concept_relationship;
TRUNCATE TABLE mimic_staging.tmp_concept_ancestor;
TRUNCATE TABLE mimic_staging.tmp_concept_synonym;
TRUNCATE TABLE mimic_staging.tmp_vocabulary;
TRUNCATE TABLE mimic_staging.tmp_relationship;
TRUNCATE TABLE mimic_staging.tmp_concept_class;
TRUNCATE TABLE mimic_staging.tmp_domain;

--- Adopted from the Postgres load scripts available in the OHDSI CDM GitHub repository under the 5.3.1 tag
--- (https://github.com/OHDSI/CommonDataModel/tree/v5.3.1)
--- The 'E' before the delimiter/quote characters is needed to indicate the presence of escaped characters (interpret '\t' as a tab character)
COPY mimic_staging.tmp_drug_strength FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/DRUG_STRENGTH.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_concept FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/CONCEPT_utf-8.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_concept_relationship FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/CONCEPT_RELATIONSHIP.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_concept_ancestor FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/CONCEPT_ANCESTOR.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_concept_synonym FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/CONCEPT_SYNONYM.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_vocabulary FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/VOCABULARY.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_relationship FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/RELATIONSHIP.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_concept_class FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/CONCEPT_CLASS.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;
COPY mimic_staging.tmp_domain FROM '/Users/zhi.mindata4life-asia.care/Documents/Projects/mimic/vocabulary_download_v5_with_full_cpt_20250108/DOMAIN.csv' (DATEFORMAT '%Y%m%d', DELIMITER '\t', FORMAT CSV, HEADER, QUOTE '"') ;