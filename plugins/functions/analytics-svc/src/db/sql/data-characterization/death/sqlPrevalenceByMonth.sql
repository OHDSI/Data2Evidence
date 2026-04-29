SELECT 
  num.stratum_1                                      AS "X_CALENDAR_MONTH", 
  1000 * (1.0 * num.count_value / denom.count_value) AS y_Prevalence_1000Pp 
FROM 
  (SELECT * 
   FROM @results_database_schema.achilles_results WHERE analysis_id = 502) num 
  INNER JOIN 
  (SELECT * 
   FROM @results_database_schema.achilles_results WHERE analysis_id = 117) denom 
    ON num.stratum_1 = denom.stratum_1

