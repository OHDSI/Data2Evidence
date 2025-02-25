from rpy2 import robjects
from functools import partial

from prefect import flow, task
from prefect.variables import Variable
from prefect.context import FlowRunContext
from prefect.logging import get_run_logger
from prefect.serializers import JSONSerializer
from prefect.filesystems import RemoteFileSystem as RFS

from flows.data_characterization_plugin.hooks import *
from flows.data_characterization_plugin.types import *

from shared_utils.dao.DBDao import DBDao
from shared_utils.create_dataset_tasks import *
from shared_utils.types import UserType, SupportedDatabaseDialects, LiquibaseAction


@flow(log_prints=True, 
      persist_result=True,
      timeout_seconds=3600
      )
def data_characterization_plugin(options: DCOptionsType):
    logger = get_run_logger()
    schema_name = options.schemaName
    database_code = options.databaseCode
    cdm_version_number = options.cdmVersionNumber
    vocab_schema_name = options.vocabSchemaName
    release_date = options.releaseDate
    results_schema = options.resultsSchema
    flow_name = options.flowName
    changelog_file = options.changelogFile
    use_cache_db = options.use_cache_db

    # comma separated values in a string
    exclude_analysis_ids = options.excludeAnalysisIds

    flow_run_context = FlowRunContext.get().flow_run.dict()
    flow_run_id = str(flow_run_context.get("id"))
    output_folder = f"/output/{flow_run_id}"
    
    admin_user = UserType.ADMIN_USER
    read_user = UserType.READ_USER
    
    results_schema_dao = DBDao(use_cache_db=use_cache_db,
                               database_code=database_code, 
                               schema_name=results_schema)
    
    dialect = results_schema_dao.dialect
    
    match dialect:
        case SupportedDatabaseDialects.POSTGRES:
            results_schema = results_schema.lower()
            vocab_schema_name = vocab_schema_name.lower()
            schema_name = schema_name.lower()
        case SupportedDatabaseDialects.HANA:
            results_schema = results_schema.upper()
            vocab_schema_name = vocab_schema_name.upper()
            schema_name = schema_name.upper()      
    
    dc_schema = create_data_characterization_schema(
        vocab_schema_name,
        flow_name,
        changelog_file,
        results_schema_dao,
        logger
    )

    if dc_schema:
        r_libs_user_directory = Variable.get("r_libs_user")
        
        set_admin_connection_string = results_schema_dao.get_database_connector_connection_string(
            user_type=admin_user,
            release_date=release_date
        )
        
        set_read_connection_string = results_schema_dao.get_database_connector_connection_string(
            user_type=read_user,
            release_date=release_date
        )       

        dc_status = execute_data_characterization(schema_name=schema_name,
                                                  cdm_version_number=cdm_version_number,
                                                  vocab_schema_name=vocab_schema_name,
                                                  results_schema_dao=results_schema_dao,
                                                  exclude_analysis_ids=exclude_analysis_ids,
                                                  output_folder=output_folder,
                                                  r_libs_user_directory=r_libs_user_directory,
                                                  set_connection_string=set_admin_connection_string,
                                                  flow_run_id=flow_run_id
                                                  )

        if dc_status:
            msg = dc_status.get("error_message")
            raise Exception(f"An error occurred while executing data characterization: {msg}")

        execute_export_to_ares(schema_name=schema_name, 
                               vocab_schema_name=vocab_schema_name,
                               results_schema_dao=results_schema_dao,
                               output_folder=output_folder,
                               r_libs_user_directory=r_libs_user_directory,
                               set_connection_string=set_read_connection_string,
                               flow_run_id=flow_run_id)


def create_data_characterization_schema(vocab_schema_name: str,
                                        flow_name: str,
                                        changelog_file: str,
                                        results_schema_dao,
                                        logger):
    try:
        plugin_classpath = get_plugin_classpath(flow_name)
        dialect = results_schema_dao.dialect
        tenant_configs = results_schema_dao.tenant_configs
        
        # create results schema
        create_schema_task(results_schema_dao)
        
        # create result tables with liquibase
        create_tables_wo = run_liquibase_update_task.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=results_schema_dao))])
        
        create_tables_wo(action=LiquibaseAction.UPDATE,
                         data_model=CHARACTERIZATION_DATA_MODEL,
                         dialect=dialect,
                         changelog_file=changelog_file,
                         schema_name=results_schema_dao.schema_name,
                         vocab_schema=vocab_schema_name,
                         tenant_configs=tenant_configs,
                         plugin_classpath=plugin_classpath,
                         )

        # task
        enable_audit_policies_wo = enable_and_create_audit_policies_task.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=results_schema_dao))])
        
        enable_audit_policies_wo(results_schema_dao)

        # task 
        create_and_assign_roles_wo = create_and_assign_roles_task.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=results_schema_dao))])
        
        create_and_assign_roles_wo(results_schema_dao)

        logger.info(f"Data Characterization results schema '{results_schema_dao.schema_name}' successfully created and privileges assigned!")

    except Exception as e:
        logger.error(e)
        raise e
    else:
        return True


@task(log_prints=True,
      result_storage=RFS.load(Variable.get("flows_results_sb_name")),
      result_storage_key="{flow_run.id}_persist_data_characterization.json",
      result_serializer=JSONSerializer(),
      persist_result=True)
def execute_data_characterization(schema_name: str,
                                  cdm_version_number: str,
                                  vocab_schema_name: str,
                                  results_schema_dao,
                                  exclude_analysis_ids: str,
                                  output_folder: str,
                                  r_libs_user_directory: str,
                                  set_connection_string: str,
                                  flow_run_id: str):
    try:
        logger = get_run_logger()
        threads = int(Variable.get("achilles_thread_count"))
        logger.info(f'Running achilles on thread count: {threads}')
        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(f'''
                    library('Achilles')
                    {results_schema_dao.set_db_driver_env()}
                    {set_connection_string}
                    cdmVersion <- '{cdm_version_number}'
                    cdmDatabaseSchema <- '{schema_name}'
                    vocabDatabaseSchema <- '{vocab_schema_name}'
                    resultsDatabaseSchema <- '{results_schema_dao.schema_name}'
                    outputFolder <- '{output_folder}'
                    numThreads <- {threads}
                    createTable <- TRUE
                    sqlOnly <- FALSE
                    excludeAnalysisIds <- c({exclude_analysis_ids})
                    Achilles::achilles( connectionDetails = connectionDetails, cdmVersion = cdmVersion, cdmDatabaseSchema = cdmDatabaseSchema, createTable = createTable, resultsDatabaseSchema = resultsDatabaseSchema, outputFolder = outputFolder, sqlOnly=sqlOnly, numThreads=numThreads, excludeAnalysisIds=excludeAnalysisIds)''')
    except Exception as e:
        logger.error(f"execute_data_characterization task failed")
        result_json = {}
        with open(f'{output_folder}/errorReportR.txt', 'rt') as f:
            error_message = f.read()
        logger.error(error_message)
        
        # drop schema
        logger.info(f"Dropping schema")
        results_schema_dao.drop_schema()

        error_result = {
            "flow_run_id": flow_run_id,
            "result": result_json,
            "error": True,
            "error_message": error_message
        }
        return error_result
        
        
        
    
@task(result_storage=RFS.load(Variable.get("flows_results_sb_name")),
      result_storage_key="{flow_run.id}_export_to_ares.json",
      result_serializer=JSONSerializer(),
      persist_result=True)
def execute_export_to_ares(schema_name: str,
                                 vocab_schema_name: str,
                                 results_schema_dao,
                                 output_folder: str,
                                 r_libs_user_directory: str,
                                 set_connection_string: str,
                                 flow_run_id: str
                                 ):
    try:
        logger = get_run_logger()
        logger.info('Running exportToAres')

        results_schema_name = results_schema_dao.schema_name 
        results_schema_dao.schema_name = schema_name
        cdm_source_abbreviation = results_schema_dao.get_value(table_name="cdm_source", 
                                                               column_name="cdm_source_abbreviation")
        
        # Get name of folder created by at {outputFolder/cdm_source_abbreviation}
        ares_path = os.path.join(output_folder, cdm_source_abbreviation[:25] if len(cdm_source_abbreviation) > 25 \
                                 else cdm_source_abbreviation)

        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(f'''
                    library('Achilles')
                    {results_schema_dao.set_db_driver_env()}
                    {set_connection_string}
                    cdmDatabaseSchema <- '{schema_name}'
                    vocabDatabaseSchema <- '{vocab_schema_name}'
                    resultsDatabaseSchema <- '{results_schema_name}'
                    outputPath <- '{output_folder}'
                    Achilles::exportToAres(
                        connectionDetails = connectionDetails,
                        cdmDatabaseSchema = cdmDatabaseSchema,
                        resultsDatabaseSchema = resultsDatabaseSchema,
                        vocabDatabaseSchema = vocabDatabaseSchema,
                        outputPath,
                        reports = c()
                    )
            ''')
            return get_export_to_ares_results_from_file(ares_path)
    except Exception as e:
        logger.error(f"execute_export_to_ares task failed")
        error_message = get_export_to_ares_execute_error_message_from_file(ares_path)
        logger.error(error_message)
        
        logger.info(f"Dropping Data Characterization results schema '{results_schema_name}'..")
        results_schema_dao.drop_schema()
        
        raise Exception(f"An error occurred while executing export to ares: {error_message}") 