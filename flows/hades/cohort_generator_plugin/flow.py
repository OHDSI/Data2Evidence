import json
from rpy2 import robjects
import os
from prefect import flow, task
from prefect.logging import get_run_logger

from .types import CohortGeneratorOptionsType

from _shared_flow_utils.types import UserType
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.AnalyticsSvcAPI import AnalyticsSvcAPI
os.environ['plugin_name'] = 'cohort_generator_plugin'

@flow(log_prints=True, persist_result=True)
def cohort_generator_plugin(options: CohortGeneratorOptionsType):
    logger = get_run_logger()
    logger.info('Running Cohort Generator')

    database_code = options.databaseCode
    schema_name = options.schemaName
    vocab_schema_name = options.vocabSchemaName
    cohort_json = options.cohortJson
    dataset_id = options.datasetId
    description = options.description
    use_cache_db = options.use_cache_db
    cohort_definition_id = options.cohortDefinitionId
    
    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code)

    analytics_svc_api = AnalyticsSvcAPI()

    cohort_json_expression = json.dumps(cohort_json.expression)
    cohort_name = cohort_json.name

    # Only create cohort definition if cohort_definition_id is not provided in flow options
    if cohort_definition_id == None:
        cohort_definition_id = create_cohort_definition(
            analytics_svc_api,
            dataset_id,
            description,
            cohort_json_expression,
            cohort_name,
        )

    create_cohort(dbdao,
                  UserType.ADMIN_USER,
                  schema_name,
                  cohort_definition_id,
                  cohort_json_expression,
                  cohort_name,
                  vocab_schema_name)


@task(log_prints=True)
def create_cohort_definition(analytics_svc_api, dataset_id: str, description: str,
                             cohort_json_expression: str, cohort_name: str):

    result = analytics_svc_api.create_cohort_definition(
        datasetId=dataset_id,
        description=description,
        syntax=cohort_json_expression,
        name=cohort_name
    )
    return result


@task(log_prints=True)
def create_cohort(dbdao, admin_user, schema_name: str, cohort_definition_id: int,
                  cohort_json_expression: str, cohort_name: str, vocab_schema_name: str):

    set_db_driver_env_string = dbdao.set_db_driver_env()

    set_connection_string = dbdao.get_database_connector_connection_string(
        user_type=admin_user
    )
    create_script_path = os.path.join(os.path.dirname(__file__), 'create_cohort.R')
    with robjects.conversion.localconverter(robjects.default_converter):
        robjects.r(f"source('{create_script_path}')")
        r_create_cohort = robjects.r['create_cohort']
    
        r_create_cohort(
            set_db_driver_env_string=set_db_driver_env_string,
            set_connection_string=set_connection_string,
            schemaName=schema_name,
            cohortId=cohort_definition_id,
            cohortJson=cohort_json_expression,
            cohortName=cohort_name,
            vocabSchemaName=vocab_schema_name)
