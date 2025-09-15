# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(CommonDataModel)

#' Create CDM tables in the database
#' @param cdmVersion CDM version (e.g., "5.3", "5.4")
#' @param schemaName Name of the CDM schema
#' @return None

create_cdm_tables <- function(cdmVersion, schemaName) { 
    CommonDataModel::executeDdl(connectionDetails = connectionDetails, cdmVersion = cdmVersion, cdmDatabaseSchema = schemaName, executeDdl = TRUE, executePrimaryKey = TRUE, executeForeignKey = FALSE)
}