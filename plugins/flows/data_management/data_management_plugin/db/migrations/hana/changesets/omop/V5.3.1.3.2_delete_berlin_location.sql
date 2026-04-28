--liquibase formatted sql
--changeset alp:V5.3.1.3.2__delete_berlin_location.sql
DELETE FROM "LOCATION" 
WHERE "COUNTY" IS NULL
AND "ADDRESS_1" IS NULL
AND "ADDRESS_2" IS NULL
AND "STATE" IS NULL
AND "CITY" IS NULL
AND "LOCATION_ID" BETWEEN 1 AND 202
AND "ZIP" BETWEEN 10115 AND 14199
AND "LOCATION_SOURCE_VALUE" IN ('Mitte', 'Pankow', 'Friedrichshain-Kreuzberg', 'Lichtenberg', 'Charlottenburg-Wilmersdorf', 'Neukölln', 'Tempelhof-Schöneberg', 'Steglitz-Zehlendorf', 'Treptow-Köpenick', 'Marzahn-Hellersdorf', 'Reinickendorf', 'Spandau', 'Schönefeld bei Berlin')