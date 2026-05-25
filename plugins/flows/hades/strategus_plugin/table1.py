import json

from rpy2 import robjects as ro
from rpy2.robjects.packages import importr

from .flowutils import convert_py_to_R, convert_R_to_py, validate_token_study_code
from .custom_types import USE_TREX_CONNECTION
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.types import SupportedDatabaseDialects
from _shared_flow_utils.rutils import set_trex_env_var
from _shared_flow_utils.logger.logger import Logger

from prefect import flow
try:
    from prefect.artifacts import create_table_artifact
except ImportError:
    def create_table_artifact(*args, **kwargs):
        logger = Logger()
        logger.warning("Prefect artifacts not available in this Prefect version.")

class Table1Generator:
    def __init__(self, token_study_code, dataset_id, cohort_ids, database_code, cdm_schema_name):
        self.logger = Logger()
        self.token_study_code = validate_token_study_code(token_study_code)
        self.dataset_id = dataset_id
        self.cohort_ids = cohort_ids
        self.database_code = database_code
        self.cdm_schema_name = cdm_schema_name
        self.results = {}

    def _get_r_db_connection(self):
        # Code to establish R database connection using self.database_code
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rDatabaseConnector = importr('DatabaseConnector')
                databaseConnectorJarFolder = '/app/inst/drivers'

                dbdao = DBDao(
                    dialect=SupportedDatabaseDialects.TREX if USE_TREX_CONNECTION else None,
                    use_cache_db=False,
                    database_code=self.database_code
                )
                db_credentials = dbdao.tenant_configs
                rConnectionDetails = rDatabaseConnector.createConnectionDetails(
                    dbms=dbdao.get_database_connector_dbms_val(), 
                    connectionString=dbdao.get_database_connector_connection_string(),
                    user=db_credentials.adminUser,
                    password=db_credentials.adminPassword.get_secret_value(),
                    pathToDriver=databaseConnectorJarFolder
                )
            except Exception as e:
                raise RuntimeError(f"Error establishing R DB connection: {e}")
        return rConnectionDetails

    def _get_r_db_covariate_data(self, rConnectionDetails):
        # Code to retrieve covariate data from R database connection
        self.logger.info(f"Retrieving covariate data for cdm_schema={self.cdm_schema_name}, cohort_ids={self.cohort_ids}")
        with ro.default_converter.context():
            try:
                rFeatureExtraction = importr('FeatureExtraction')

                covariateData = rFeatureExtraction.getDbCovariateData(
                    connectionDetails = rConnectionDetails,
                    cdmDatabaseSchema = self.cdm_schema_name,
                    cdmVersion = "5",
                    cohortTable = "cohort",
                    cohortIds = convert_py_to_R(self.cohort_ids),
                    covariateSettings = rFeatureExtraction.createDefaultCovariateSettings(),
                    aggregated = convert_py_to_R(True),
                    rowIdField = "subject_id",
                )
                self.logger.info("Covariate data retrieved successfully")
            except Exception as e:
                raise RuntimeError(f"Error retrieving R DB covariate data: {e}")
        return covariateData
        
    def _r_create_table1(self, cohort_id, covariateData):
        # Code to create Table 1 using R
        self.logger.info(f"Creating Table 1 for cohort_id={cohort_id}")
        with ro.default_converter.context():
            try:
                rFeatureExtraction = importr('FeatureExtraction')

                table1 = rFeatureExtraction.createTable1(
                    covariateData1 = covariateData,
                    cohortId1 = convert_py_to_R(int(cohort_id)),
                    specifications = rFeatureExtraction.getDefaultTable1Specifications(),
                    output = "one column",
                    showCounts = convert_py_to_R(True),
                    showPercent = convert_py_to_R(True),
                    percentDigits = convert_py_to_R(1),
                    valueDigits = convert_py_to_R(1),
                    stdDiffDigits = convert_py_to_R(2)
                )
                self.logger.info(f"Table 1 created successfully for cohort_id={cohort_id}")
            except Exception as e:
                raise RuntimeError(f"Error creating R Table 1: {e}")
        return table1
    
    @flow
    def generate_and_save_table1(self):
        rConnectionDetails = self._get_r_db_connection()
        covariateData = self._get_r_db_covariate_data(rConnectionDetails)
        table1_results = {}
        for cohort_id in self.cohort_ids:
            table1 = self._r_create_table1(cohort_id, covariateData)
            with ro.default_converter.context():
                try:
                    rParallelLogger = importr('ParallelLogger')
                    # convert the table1 R object to JSON
                    table1_json_str = convert_R_to_py(rParallelLogger.convertSettingsToJson(table1))
                    table1_json_str = json.dumps(json.loads(table1_json_str))
                    table1_results[cohort_id] = table1_json_str
                except Exception as e:
                    raise RuntimeError(f"Error converting Table 1 to JSON for cohort_id={cohort_id}: {e}")

        self.results = table1_results
        self.save_table1_results()
        return table1_results

    def save_table1_results(self):
        # Code to save Table 1 results to the database
        self.logger.info(f"Saving Table 1 results to database for token_study_code={self.token_study_code}")
        results_schema = f'results_{self.token_study_code}'
        with ro.default_converter.context():
            try:
                rDatabaseConnector = importr('DatabaseConnector')
                conn = rDatabaseConnector.connect(self._get_r_db_connection())
                for cohort_id, table1_json_str in self.results.items():
                    self.logger.info(f"Inserting Table 1 results for cohort_id={cohort_id}")
                    # cohort_id is interpolated as a numeric literal — force to int.
                    cohort_id_int = int(cohort_id)
                    # Escape single quotes in the JSON string so it cannot terminate the SQL literal.
                    escaped_json = table1_json_str.replace("'", "''")
                    insert_sql = f"""
                    INSERT INTO {results_schema}.tb1_results (token_study_code, dataset_id, cohort_id, table1_json)
                    VALUES ('{self.token_study_code}', '{self.dataset_id}', {cohort_id_int}, '{escaped_json}')
                    ON CONFLICT (token_study_code, dataset_id, cohort_id)
                    DO UPDATE SET table1_json = EXCLUDED.table1_json;
                    """
                    rDatabaseConnector.executeSql(conn, convert_py_to_R(insert_sql))
                    self.logger.info(f"Table 1 results saved successfully for cohort_id={cohort_id}")

            except Exception as e:
                raise RuntimeError(f"Error occurred when saving Table1 results for cohort { cohort_id if 'cohort_id' in locals() else 'unknown' }: {e}")
            finally:
                if 'conn' in locals():
                    rDatabaseConnector.disconnect(conn)

        # convert self.results into a list of dicts for prefect artifact
        self.logger.info("Creating Prefect artifact for Table 1 results")
        results_list = []
        for cohort_id, table1_json_str in self.results.items():
            results_list.append({
                "token_study_code": self.token_study_code,
                "dataset_id": self.dataset_id,
                "cohort_id": cohort_id,
                "table1_json": table1_json_str
            })
        # create a prefect table artifact (if available)
        try:
            create_table_artifact(
                key="table1-results-table",
                table=results_list
            )
            self.logger.info("Prefect artifact created successfully")
        except Exception as e:
            self.logger.warning(f"Could not create Prefect artifact: {e}")
