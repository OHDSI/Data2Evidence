import json
from rpy2 import robjects

from prefect import flow, task
from prefect.variables import Variable
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
    competing_outcome_cohort_definition_id = options.competingOutcomeCohortDefinitionId

    dbdao = DBDao(
        use_cache_db=use_cache_db, database_code=database_code, schema_name=schema_name
    )

    generate_cohort_survival_data(
        dbdao,
        target_cohort_definition_id,
        outcome_cohort_definition_id,
        analysis_type,
        competing_outcome_cohort_definition_id,
    )


@task()
def generate_cohort_survival_data(
    dbdao,
    target_cohort_definition_id: int,
    outcome_cohort_definition_id: int,
    analysis_type: str = "single_event",
    competing_outcome_cohort_definition_id: int = None,
):
    # Validate parameters
    if (
        analysis_type == "competing_risk"
        and competing_outcome_cohort_definition_id is None
    ):
        raise ValueError(
            "competing_outcome_cohort_definition_id is required for competing_risk analysis"
        )
    # Get credentials for database code
    db_credentials = dbdao.tenant_configs

    with robjects.conversion.localconverter(robjects.default_converter):
        result = robjects.r(
            f"""
            .libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
            library(CDMConnector)
            library(CohortSurvival)
            library(dplyr)
            library(ggplot2)
            library(rjson)
            library(tools)
            library(RPostgres)

            # VARIABLES
            target_cohort_definition_id <- {target_cohort_definition_id}
            outcome_cohort_definition_id <- {outcome_cohort_definition_id}
            analysis_type <- "{analysis_type}"
            competing_outcome_cohort_definition_id <- {competing_outcome_cohort_definition_id if competing_outcome_cohort_definition_id is not None else 'NULL'}
            pg_host <- "{db_credentials.host}"
            pg_port <- "{db_credentials.port}"
            pg_dbname <- "{db_credentials.databaseName}"
            pg_user <- "{db_credentials.readUser}"
            pg_password <- "{db_credentials.readPassword.get_secret_value()}"
            pg_schema <- "{dbdao.schema_name}"

            con <- NULL
            tryCatch(
                {{
                    pg_con <- DBI::dbConnect(RPostgres::Postgres(),
                        dbname = pg_dbname,
                        host = pg_host,
                        user = pg_user,
                        password = pg_password,
                        options=sprintf("-c search_path=%s", pg_schema))

                    # Begin transaction to run below 2 queries as is required for cohort survival but are not needed to be commited to database
                    DBI::dbBegin(pg_con)

                    # cdm_from_con is from CDMConnection
                    cdm <- CDMConnector::cdm_from_con(
                        con = pg_con,
                        write_schema = pg_schema,
                        cdm_schema = pg_schema,
                        cohort_tables = c("cohort"),
                        .soft_validation = TRUE
                    )

                    # Choose the appropriate survival analysis method based on analysis_type
                    if (analysis_type == "competing_risk") {{
                        survival <- estimateCompetingRiskSurvival(cdm,
                            targetCohortId = target_cohort_definition_id,
                            outcomeCohortId = outcome_cohort_definition_id,
                            targetCohortTable = "cohort",
                            outcomeCohortTable = "cohort",
                            competingOutcomeCohortTable = "cohort",
                            competingOutcomeCohortId = competing_outcome_cohort_definition_id,
                            estimateGap = 30
                        )
                        plot <- plotSurvival(survival, cumulativeFailure = TRUE)
                    }} else {{
                        survival <- estimateSingleEventSurvival(cdm,
                            targetCohortId = target_cohort_definition_id,
                            outcomeCohortId = outcome_cohort_definition_id,
                            targetCohortTable = "cohort",
                            outcomeCohortTable = "cohort",
                            estimateGap = 30
                        )
                        plot <- plotSurvival(survival)
                    }}
                    
                    # Rollback queries done above after cohort survival is done
                    DBI::dbRollback(pg_con)

                    
                    plot_data <- ggplot_build(plot)$data[[1]]
                    # Convert data to a list if not already
                    plot_data <- as.list(plot_data)

                    # Add a key to the list
                    plot_data[["status"]] <- "SUCCESS"
                    plot_data_json <- toJSON(plot_data)

                    print(plot_data_json)
                    cdm_disconnect(cdm)
                    return(plot_data_json) }},
                error = function(e) {{ print(e)
                    data <- list(status = "ERROR", e$message)
                    return(toJSON(data)) }},
                finally = {{ if (!is.null(con)) {{ DBI::dbDisconnect(con)
                    print("Disconnected the database.") }}
                }}
            )
            """
        )
        # Parsing the json from R and returning to prevent double serialization
        # of the string
        result_dict = json.loads(str(result[0]))

        # Create an artifact to store the result
        create_markdown_artifact(
            key="cohort_survival_result",
            markdown=json.dumps(result_dict)
        )

        return result_dict
