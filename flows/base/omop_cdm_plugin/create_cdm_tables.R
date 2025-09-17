# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CommonDataModel)

#' Create CDM tables in the database
#' @param set_db_driver_env_string R code string to set DB driver environment
#' @param set_connection_string R code string to set connection details
#' @param cdmVersion CDM version (e.g., "5.3", "5.4")
#' @param schemaName Name of the CDM schema
#' @return None

create_cdm_tables <- function(
    set_db_driver_env_string,
    set_connection_string,
    cdmVersion,
    schemaName
) { 
    # Setup environment and connection details
    eval(parse(text = set_db_driver_env_string))
    eval(parse(text = set_connection_string))
    
    CommonDataModel::executeDdl(connectionDetails = connectionDetails, cdmVersion = cdmVersion, cdmDatabaseSchema = schemaName, executeDdl = TRUE, executePrimaryKey = TRUE, executeForeignKey = FALSE)
}