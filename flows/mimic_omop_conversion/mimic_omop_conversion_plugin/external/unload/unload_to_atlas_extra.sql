-- Unload to ATLAS
-- extra tables (d_items to concept)

DROP TABLE IF EXISTS cdm.d_items_to_concept;
CREATE TABLE cdm.d_items_to_concept AS 
SELECT
    *
FROM mimic_etl.d_items_to_concept
;

DROP TABLE IF EXISTS cdm.d_labitems_to_concept;
CREATE TABLE cdm.d_labitems_to_concept AS 
SELECT
    *
FROM mimic_etl.d_labitems_to_concept
;

DROP TABLE IF EXISTS cdm.d_micro_to_concept;
CREATE TABLE cdm.d_micro_to_concept AS 
SELECT
    *
FROM mimic_etl.d_micro_to_concept
;

