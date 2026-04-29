## Loyalty Score Plugin

The loyalty score plugin is implemented according to [Klann JG, Henderson DW, Morris M, et al. A broadly applicable approach to enrich electronic-health-record cohorts by identifying patients with complete data: a multisite evaluation.](https://academic.oup.com/jamia/article/30/12/1985/7251531)

#### Two tables are neccessary for the implementation: 
- **coefficients.json** contains default coefficients of 20 variables and intercept for loyal score calculation. Users are able to use their own coeffecients if provide "coeff_table_name"
**ref**: [Lin KJ, Rosenthal GE, Murphy SN, et al. External Validation of an Algorithm to Identify Patients with High Data-Completeness in Electronic Health Records for Comparative Effectiveness Research.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7007793/)
- **concept_ls_Standard.csv** includes four columns: "concept_id_1" represents OMOP concepts matched with "concept_code" and "vocabulary_id" used to identify 20 loyalty variables. Since the OMOP CDM employs standard OMOP concepts, these concepts are further mapped to their corresponding "standard_concept" identifiers, which are used in the plugins.
The table may be updated in the future to reflect updates to OMOP concepts and to incorporate additional domain knowledge.
    **ref**: SI of [Klann JG, Henderson DW, Morris M, et al. A broadly applicable approach to enrich electronic-health-record cohorts by identifying patients with complete data: a multisite evaluation.](https://academic.oup.com/jamia/article/30/12/1985/7251531)

### Parameters explaination
#### Plugin Mode 1：calculate loyalty score
```
{
  "options": {
    "config": {
      "index_date": "2011-11-11", # Required: from which date to look back to compute the loyalty score
      "schema_name": "cdmdefault", # Required: schema name of source data
      "database_code": "alpdev_pg", # Required: database name of source data
      "lookback_years": 2, # Required: years to look back to compute the loyalty score
      "coeff_table_name": null, # Optional: coefficient table used to compute loyalty score. "null" uses default coefficients from paper; or provide string, plugin will use provided table to calculate.
      "loyalty_cohort_table_name": "debug_1" # Required: table name to store the loyalty score.
    }
  }
}
```
Output table includes **20 variables** and calculated **loyalty score**


#### Plugin Mode 2：retrain the loyal score algorithm
``` 
{
  "options": {
    "config": {
      "index_date": "2011-11-11", # Required: from which date to look back to compute the loyalty score
      "test_ratio": 0.2, # Required: split a portion of the data as testdataset
      "schema_name": "cdmdefault", # Required: schema name of source data
      "return_years": 1, # Required: years to look back to extract return rate.
      "database_code": "alpdev_pg", # Required: database name of source data
      "train_years": 2, # Required: years to look back to calculate the loyalty variables
      "retraincoeff_table_name": "debug_1_retrain_coeff", # Required: table name to store the retrained coefficients.
    }
  }
}
```
Result includes **retrained coefficients** table and **AUC ROC metric** table
