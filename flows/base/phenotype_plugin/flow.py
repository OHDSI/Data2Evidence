import os, logging
from rpy2.rinterface_lib.callbacks import logger as rpy2_logger
from rpy2.robjects import pandas2ri, numpy2ri
from rpy2 import robjects

from prefect import flow, task
from prefect.logging import get_run_logger

from .types import PhenotypeOptionsType
from _shared_flow_utils.types import UserType
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.PhenotypeAPI import PhenotypeAPI

os.environ["plugin_name"] = "phenotype_plugin"


@task(log_prints=True)
def validate_integer_string(input_string: str) -> bool:
    """
    Validates that the input string contains only comma-separated integers.

    Args:
        input_string (str): A string containing comma-separated integers or 'default'.
        Example: '3,4,25' or 'default'

    Returns:
        bool: True if validation passes
    """
    logger = get_run_logger()
    if input_string == "default":
        logger.info(
            "Cohorts ID is set to 'default', retrieving all cohorts from the Phenotype."
        )
        logger.warning("Cohort 921 is not supported currently, it will be skipped.")
        return True
    else:
        input_string = input_string.strip()
        logger = get_run_logger()
        numbers = input_string.split(",")
        for num in numbers:
            num = num.strip()  # Remove any surrounding whitespace
            if not num.isdigit():
                error_message = f"""Input CohortsId: {input_string} is not supported, use ',' as seperator, e.g.: '3,4,25' """
                logger.error(error_message)
                raise ValueError(error_message)
            if num.strip() == "921":
                logger.warning(
                    "Cohort 921 is not supported currently, it will be skipped."
                )
        return True


@task(log_prints=True)
def get_cohort_definitions(cohorts_id: str, vocabschema_name: str, materialize: bool):
    """
    Retrieve cohort definitions from the Phenotype Library.
    Args:
        cohorts_id (str): Comma-separated string of cohort IDs or 'default'.
        vocabschema_name (str): The name of the vocabulary schema.
    Returns:
        list: List of cohort definitions with cohortId, cohortName, json, and sql.
    """
    pandas2ri.activate()
    numpy2ri.activate()
    r_script_path = os.path.join(os.path.dirname(__file__), 'get_cohort_definitions.R')

    with robjects.conversion.localconverter(robjects.default_converter):
        
        # Source the R script to load the function
        robjects.r(f'source("{r_script_path}")')
        
        # Get the R function
        r_get_cohort_definitions = robjects.r['get_cohort_definitions']
        
        # Call the function through R
        result = r_get_cohort_definitions(
            cohortsID=cohorts_id,
            vocabschemaName=vocabschema_name,
            materialize = materialize)
        
        if materialize:
            return result
        else:
            # TODO, simplify this part
            # Convert R result to Python list
            cohort_definitions = []
            for i in range(0, len(result)):
                cohort_def = {
                    "cohortId": int(result[i].rx2("cohortId")[0]),
                    "cohortName": str(result[i].rx2("cohortName")[0]),
                    "json": str(result[i].rx2("json")[0]),
                    "sql": str(result[i].rx2("sql")[0]),
                }
                cohort_definitions.append(cohort_def)
            return cohort_definitions


@task(log_prints=True)
def atlas_cohort_definitions(
    cohort_definitions: list, dataset_id: str, user_name: str
) -> list:
    """
    Create cohort definitions using the REST API.
    Args:
        cohort_definitions (list): List of cohort definition dictionaries containing
                                  cohortId, cohortName, json, and sql keys
        dataset_id (str): Unique identifier for the target dataset
        user_name (str): Username of the person creating the cohorts

    Returns:
        list: List of API response objects for successfully created cohorts

    """
    logger = get_run_logger()
    phenotype_api = PhenotypeAPI()
    created_cohorts = []

    for cohort_def in cohort_definitions:
        try:
            result = phenotype_api.create_single_cohort_definition(
                cohort_def, dataset_id, user_name
            )
            created_cohorts.append(result)
        except Exception as e:
            error_message = (
                f"Failed to create cohort {cohort_def['cohortId']}: {str(e)}"
            )
            logger.error(error_message)
            raise Exception(error_message) from e
    return created_cohorts


@task(log_prints=True)
def materialize_cohort_definitions(
    dbdao: DBDao,
    cohort_definitions,
    cdmschema_name: str,
    cohortschema_name: str,
    cohorttable_name: str,
    user: UserType,
):
    """
    Materialize cohort definitions into the database.
    """
    logger = get_run_logger()
    
    # Setup database connection for R
    set_db_driver_env_string = dbdao.set_db_driver_env()
    set_connection_string = dbdao.get_database_connector_connection_string(
        user_type=user
    )

    # Load R scripts from files
    script_dir = os.path.dirname(__file__)
    materialize_script_path = os.path.join(script_dir, 'materialize_cohorts.R')
    result_tables_script_path = os.path.join(script_dir, 'create_result_tables.R')

    with robjects.conversion.localconverter(robjects.default_converter):
        # Source the R scripts to load the functions
        robjects.r(f"""
            {set_db_driver_env_string}
            {set_connection_string}
            source("{materialize_script_path}")
            source("{result_tables_script_path}")
            """)
        
        # Get the R functions
        r_materialize_cohorts = robjects.r['materialize_cohorts']
        r_create_result_tables = robjects.r['create_result_tables']
        
        # Call materialize_cohorts function
        logger.info("Materializing cohorts to database...")
        r_materialize_cohorts(
            cohortDefinitions=cohort_definitions,
            cdmschemaName=cdmschema_name,
            cohortschemaName=cohortschema_name,
            cohorttableName=cohorttable_name
        )
        
        # Call create_result_tables function
        logger.info("Creating result tables...")
        r_create_result_tables(
            cohortschemaName=cohortschema_name,
            cohorttableName=cohorttable_name,
            cohortDefinitions=cohort_definitions
        )
        
        logger.info("Cohort materialization completed successfully.")


@flow(log_prints=True)
def phenotype_plugin(options: PhenotypeOptionsType):
    # Setup rpy2 logger
    logging.basicConfig()
    rpy2_logger.setLevel(logging.DEBUG)
    logger = get_run_logger()
    logger.info("******************* Running Phenotype Plugin *******************")

    database_code = options.database_code
    cdmschema_name = options.cdmschema_name
    cohortschema_name = options.cohortschema_name
    cohorttable_name = "phenotypes"  # Fixed the prefix of the phenotype result tables
    vocabschema_name = options.vocabschema_name
    cohorts_id = options.cohorts_id
    materialize = options.materialize
    dataset_id = options.dataset_id
    user_name = options.user_name
    use_cache_db = options.use_cache_db
    user = UserType.ADMIN_USER

    # Validate cohorts_id if not default
    if not validate_integer_string(cohorts_id):
        error_message = f"Invalid cohorts_id: {cohorts_id}. It should be a comma-separated string of integers or 'default'."
        logger.error(error_message)
        raise ValueError(error_message)
    
    cohort_definitions = get_cohort_definitions(
        cohorts_id=cohorts_id,
        vocabschema_name=vocabschema_name,
        materialize=materialize,
    )
    logger.info(
        "******************* Complete Retrieving Cohort Definition Sets *******************"
    )

    if materialize:
        logger.info("Materializing cohort definitions to database")
        # Setup database connection only when needed for materialization
        dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)

        materialize_cohort_definitions(
            cohort_definitions=cohort_definitions,
            dbdao=dbdao,
            cdmschema_name=cdmschema_name,
            cohortschema_name=cohortschema_name,
            cohorttable_name=cohorttable_name,
            user=user,
        )
        logger.info(
            "******************* Complete Materializing Cohort *******************"
        )
    else:
        logger.info("Creating cohort definitions")
        created_cohorts = atlas_cohort_definitions(
            cohort_definitions=cohort_definitions,
            dataset_id=dataset_id,
            user_name=user_name,
        )
        logger.info(
            "******************* Complete Creating Cohort Definition Sets *******************"
        )
        logger.info(f"{len(created_cohorts)} cohorts created successfully.")
