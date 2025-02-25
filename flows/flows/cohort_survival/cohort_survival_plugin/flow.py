import json
from rpy2 import robjects

from prefect import flow, task
from prefect.variables import Variable
from prefect.logging import get_run_logger
from prefect.serializers import JSONSerializer
from prefect.filesystems import RemoteFileSystem as RFS

from flows.cohort_survival_plugin.types import CohortSurvivalOptionsType

from shared_utils.dao.DBDao import DBDao


@flow(log_prints=True, persist_result=True)
def cohort_survival_plugin(options: CohortSurvivalOptionsType):
    logger = get_run_logger()
    logger.info("Running Cohort Survival")
    
    database_code = options.databaseCode
    schema_name = options.schemaName
    use_cache_db = options.use_cache_db
    target_cohort_definition_id = options.targetCohortDefinitionId
    outcome_cohort_definition_id = options.outcomeCohortDefinitionId
    
    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code, 
                  schema_name=schema_name)    
    
    generate_cohort_survival_data(
        dbdao,
        target_cohort_definition_id,
        outcome_cohort_definition_id
    )


@task(
    result_storage=RFS.load(Variable.get("flows_results_sb_name")),
    result_storage_key="{flow_run.id}_km.json",
    result_serializer=JSONSerializer(),
    persist_result=True,
)
def generate_cohort_survival_data(
    dbdao,
    target_cohort_definition_id: int,
    outcome_cohort_definition_id: int,
):
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
            pg_host <- "{db_credentials.host}"
            pg_port <- "{db_credentials.port}"
            pg_dbname <- "{db_credentials.databaseName}"
            pg_user <- "{db_credentials.adminUser}"
            pg_password <- "{db_credentials.adminPassword.get_secret_value()}"
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

                    death_survival <- estimateSingleEventSurvival(cdm,
                        targetCohortId = target_cohort_definition_id,
                        outcomeCohortId = outcome_cohort_definition_id,
                        targetCohortTable = "cohort",
                        outcomeCohortTable = "cohort",
                        estimateGap = 30
                    )
                    
                    # Rollback queries done above after cohort survival is done
                    DBI::dbRollback(pg_con)

                    plot <- plotSurvival(death_survival)
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
        return result_dict
