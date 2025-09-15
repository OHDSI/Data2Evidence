# Load required libraries
.libPaths(c(.libPaths(), "/usr/lib/R/site-library"))
library(DatabaseConnector)
library(PhenotypeLibrary)

#' Create result tables from cohort data
#'
#' @param cohortschema_name Cohort schema name
#' @param cohorttable_name Cohort table name
#' @param cohort_definitions R dataframe with cohort definitions
#' @return Nothing (creates tables in database)
create_result_tables <- function(cohortschema_name, 
                                cohorttable_name, 
                                cohort_definitions) {
    
    connection <- DatabaseConnector::connect(connectionDetails)
    
    tryCatch({
        cohorts_id <- cohort_definitions$cohortId
        
        # Query to create result table with phenotype_result_id as primary key
        sql <- paste0(
            "SELECT ROW_NUMBER() OVER (ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID) AS phenotype_result_id, ",
            "SUBJECT_ID as person_id, ",
            "COHORT_DEFINITION_ID as phenotype_id, ",
            "cohort_start_date, ",
            "cohort_end_date ",
            "FROM ", cohortschema_name, ".", cohorttable_name, " ",
            "ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID"
        )
        
        result_df <- DatabaseConnector::querySql(connection = connection, sql = sql)
        
        # Remove raw cohort tables
        DatabaseConnector::dbRemoveTable(
            conn = connection,
            name = cohorttable_name,
            databaseSchema = cohortschema_name
        )

        # Save result_df
        DatabaseConnector::insertTable(
            connection = connection,
            databaseSchema = cohortschema_name,
            tableName = paste0(cohorttable_name, "_result_all"),
            data = result_df,
            createTable = TRUE,
            tempTable = FALSE
        )
        
        # Add primary key constraint
        sql <- paste0(
            "ALTER TABLE ", cohortschema_name, ".", cohorttable_name, 
            "_result_all ADD PRIMARY KEY (phenotype_result_id);"
        )
        DatabaseConnector::executeSql(connection = connection, sql = sql)

        # Save master table, showHidden=TRUE, display each required cohort in master table
        master_table <- data.frame(getPhenotypeLog(cohorts_id, showHidden = TRUE))
        DatabaseConnector::insertTable(
            connection = connection,
            databaseSchema = cohortschema_name,
            tableName = paste0(cohorttable_name, "_result_master"),
            data = master_table,
            createTable = TRUE,
            tempTable = FALSE
        )
        
    }, finally = {
        DatabaseConnector::disconnect(connection)
    })
}
