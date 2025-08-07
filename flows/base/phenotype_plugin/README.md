### Phenotype Flow
There are two modes:
- materialize = true, cohorts are built based on cohort id. Two tables are created.
  >phenotypes_result_all: cohort ids for each subject in EVA data model are populated into it
  phenotypes_result_master: cohorts definitions details are populated into it.
- materialize = false, only cohort definition bookmarks are created in d2e cohort portal.

#### Examples of parameters:
- materialize: either to create cohorts or create cohort definitions, default is false -> create cohort definitions
- cohorts_id: e.g. '25,3,4' or 'default', if set "default" the flow will run through all cohorts from 
##### Materialize = False (default)
- user_name: user name who create the cohort definiation
- dataset_id: dataset ID for creating the cohort definiation
##### Materialize = True


- database_code: database name
- cdmschema_name: patient schema name for materializing cohort
- cohortschema_name: schema name to store the cohort result
`PhenotypeLibrary::getPhenotypeLog()`
- vocabschema_name: schema name of vocabulary



#### Table to be created
- cohort ids for each subject in EVA data model are populated into {cohorttableName}_result_all table
- {cohorttableName}_result_master table stores the details of each cohort definitions.