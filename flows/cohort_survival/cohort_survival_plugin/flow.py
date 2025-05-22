import json
import os
from rpy2 import robjects

from prefect import flow, task
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .types import CohortSurvivalOptionsType

from _shared_flow_utils.dao.DBDao import DBDao


@flow(log_prints=True)
def cohort_survival_plugin(options: CohortSurvivalOptionsType):
    logger = get_run_logger()
    logger.info("Running Cohort Survival")

    database_code = options.databaseCode
    schema_name = options.schemaName
    use_cache_db = options.use_cache_db
    target_cohort_definition_id = options.targetCohortDefinitionId
    outcome_cohort_definition_id = options.outcomeCohortDefinitionId
    analysis_type = options.analysisType
    competing_outcome_cohort_definition_id = (
        options.competingOutcomeCohortDefinitionId
    )
    strata_cohorts = options.strataCohorts

    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)

    generate_cohort_survival_data(
        dbdao,
        schema_name,
        target_cohort_definition_id,
        outcome_cohort_definition_id,
        analysis_type,
        competing_outcome_cohort_definition_id,
        strata_cohorts,
    )


@task()
def generate_cohort_survival_data(
    dbdao,
    schema_name: str,
    target_cohort_definition_id: int,
    outcome_cohort_definition_id: int,
    analysis_type: str = "single_event",
    competing_outcome_cohort_definition_id: int = None,
    strata_cohorts: list = [],
):
    # Validate parameters
    if (
        analysis_type == "competing_risk"
        and competing_outcome_cohort_definition_id is None
    ):
        raise ValueError(
            "competing_outcome_cohort_definition_id is required "
            "for competing_risk analysis"
        )
    # Get credentials for database code
    db_credentials = dbdao.tenant_configs

    # Load R script from file
    script_dir = os.path.dirname(__file__)
    r_script_path = os.path.join(script_dir, 'cohort_survival.R')

    # Call the R function with parameters
    with robjects.conversion.localconverter(robjects.default_converter):
        # Source the R script to load the function
        robjects.r(f'source("{r_script_path}")')

        # Convert None to R's NULL
        competing_outcome_value = (
            robjects.r('NULL')
            if competing_outcome_cohort_definition_id is None
            else competing_outcome_cohort_definition_id
        )

        # Convert strata_cohorts to proper R list structure
        if len(strata_cohorts) == 0:
            strata_cohorts_value = robjects.r('NULL')
        else:
            # Create a list of lists with id and name components
            r_list_code = "list("
            for i, cohort in enumerate(strata_cohorts):
                cohort_id = cohort.get('id')
                cohort_name = cohort.get('name', '')
                r_list_code += f'list(id = {cohort_id}, name = "{cohort_name}")'
                if i < len(strata_cohorts) - 1:
                    r_list_code += ", "
            r_list_code += ")"
            strata_cohorts_value = robjects.r(r_list_code)

        # Get the R function
        run_cohort_survival_r = robjects.r['run_cohort_survival']

        # Call the function with parameters
        result = run_cohort_survival_r(
            target_cohort_definition_id=target_cohort_definition_id,
            outcome_cohort_definition_id=outcome_cohort_definition_id,
            analysis_type=analysis_type,
            competing_outcome_cohort_definition_id=competing_outcome_value,
            strata_cohorts=strata_cohorts_value,
            pg_host=db_credentials.host,
            pg_port=db_credentials.port,
            pg_dbname=db_credentials.databaseName,
            pg_user=db_credentials.readUser,
            pg_password=db_credentials.readPassword.get_secret_value(),
            pg_schema=schema_name
        )

        # Parse the JSON result
        result_dict = json.loads(str(result[0]))

        # Create an artifact to store the result
        create_markdown_artifact(
            key="cohort-survival-result",
            markdown=json.dumps(result_dict)
        )

        return result_dict
