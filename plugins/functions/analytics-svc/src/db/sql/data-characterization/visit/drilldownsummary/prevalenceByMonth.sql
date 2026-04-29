SELECT
  c1.concept_id                                      AS concept_id,
  c1.concept_name                                    AS concept_name,
  num.stratum_2                                      AS "X_CALENDAR_MONTH",
  1000 * (1.0 * num.count_value / denom.count_value) AS y_prevalence_1000_pp 
FROM 
  (SELECT *
   FROM @results_database_schema.achilles_results WHERE analysis_id = 202) num
  INNER JOIN 
  (SELECT *
   FROM @results_database_schema.achilles_results WHERE analysis_id = 117) denom ON num.stratum_2 = denom.stratum_1
  INNER JOIN  @vocab_database_schema.concept c1 ON CAST(CASE WHEN num.analysis_id = 202 THEN num.stratum_1 ELSE null END AS INT) = c1.concept_id

