#### Examples of parameters:
- databaseCode: str = 'alpdev_pg' # database name
- cdmschemaName: str = 'cdmdefault' # dataset schema name
- cohortschemaName: str = 'cdmdefault' # schema name to store the cohort result
- cohortsId: str = '25,3,4' or 'default' # cohort ids to be used, if set "default" then plugin will run through all cohorts from `PhenotypeLibrary::getPhenotypeLog()`
- vocabschemaName: str = 'cdmvocab' # schema name of vocabulary
- description: str = 'project1' # label for running plugin

#### Table to be created
- cohort ids for each subject in EVA data model are populated into {cohorttableName}_result_all table
- {cohorttableName}_result_master table stores the details of each cohort definitions.