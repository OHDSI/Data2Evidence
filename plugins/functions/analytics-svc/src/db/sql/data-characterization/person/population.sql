(SELECT
   aa1.analysis_name AS "ATTRIBUTE_NAME",
   ar1.stratum_1     AS "ATTRIBUTE_VALUE" 
 FROM @results_database_schema.ACHILLES_analysis aa1 
INNER JOIN 
@results_database_schema.achilles_results ar1 
ON aa1.analysis_id = ar1.analysis_id
                   WHERE aa1.analysis_id = 0 

 UNION 

SELECT
  aa1.analysis_name                AS "ATTRIBUTE_NAME",
  cast(ar1.count_value AS VARCHAR) AS "ATTRIBUTE_VALUE" 
FROM @results_database_schema.ACHILLES_analysis aa1 
INNER JOIN 
@results_database_schema.achilles_results ar1 
ON aa1.analysis_id = ar1.analysis_id 
WHERE aa1.analysis_id = 1
) 
ORDER BY "ATTRIBUTE_NAME" DESC
