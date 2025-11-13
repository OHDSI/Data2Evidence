# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(DatabaseConnector)
library(PhenotypeLibrary)

#' Create result tables from cohort data
#' @param cohortschemaName Cohort schema name
#' @param cohorttableName Cohort table name
#' @param cohortDefinitions R dataframe with cohort definitions
#' @return Nothing (creates tables in database)
#' @param set_db_driver_env_string R code string to set DB driver environment
#' @param set_connection_string R code string to set connection details

create_result_tables <- function(
    set_db_driver_env_string, 
    set_connection_string, 
    cohortschemaName, 
    cohorttableName, 
    cohortDefinitions) {

    # Setup environment and connection details
    eval(parse(text = set_db_driver_env_string))
    eval(parse(text = set_connection_string))
    connection <- DatabaseConnector::connect(connectionDetails)
    
    tryCatch({
        cohorts_id <- cohortDefinitions$cohortId
        
        # Query to create result table with phenotype_result_id as primary key
        sql <- paste0(
            "SELECT ROW_NUMBER() OVER (ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID) AS phenotype_result_id, ",
            "SUBJECT_ID as person_id, ",
            "COHORT_DEFINITION_ID as phenotype_id, ",
            "cohort_start_date, ",
            "cohort_end_date ",
            "FROM ", cohortschemaName, ".", cohorttableName, " ",
            "ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID"
        )
        
        result_df <- DatabaseConnector::querySql(connection = connection, sql = sql)
        
        # Remove raw cohort tables
        DatabaseConnector::dbRemoveTable(
            conn = connection,
            name = cohorttableName,
            databaseSchema = cohortschemaName
        )

        # Save result_df
        DatabaseConnector::insertTable(
            connection = connection,
            databaseSchema = cohortschemaName,
            tableName = paste0(cohorttableName, "_result_all"),
            data = result_df,
            createTable = TRUE,
            tempTable = FALSE
        )
        
        # Add primary key constraint
        sql <- paste0(
            "ALTER TABLE ", cohortschemaName, ".", cohorttableName, 
            "_result_all ADD PRIMARY KEY (phenotype_result_id);"
        )
        DatabaseConnector::executeSql(connection = connection, sql = sql)

        # Save master table, showHidden=TRUE, display each required cohort in master table
        master_table <- data.frame(getPhenotypeLog(cohorts_id, showHidden = TRUE))
        DatabaseConnector::insertTable(
            connection = connection,
            databaseSchema = cohortschemaName,
            tableName = paste0(cohorttableName, "_result_master"),
            data = master_table,
            createTable = TRUE,
            tempTable = FALSE
        )
        
    }, finally = {
        DatabaseConnector::disconnect(connection)
    })
}
