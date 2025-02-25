from __future__ import annotations

from rpy2 import robjects
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, String

from shared_utils.types import UserType
from shared_utils.dao.DBDao import DBDao
from shared_utils.create_dataset_tasks import *

from prefect import task
from prefect.variables import Variable
from prefect_shell import ShellOperation
from prefect.cache_policies import NONE

if TYPE_CHECKING:
    from shared_utils.dao.daobase import DaoBase

from flows.omop_cdm_plugin.types import CDMVersion, RELEASE_VERSION_MAPPING

    
@task(log_prints=True, 
      timeout_seconds=1800,
      cache_policy=NONE,
      task_run_name="create_datamodel_parent_task-{schema_dao.schema_name}")
def create_datamodel_parent_task(cdm_version: str, 
                                 schema_dao: DaoBase,
                                 vocab_schema: str):
    '''
    Parent task to run R package to create tables and assign permissions
    '''
    logger = get_run_logger()
    tables_created = create_cdm_tables(schema_dao, cdm_version, logger)
    if tables_created:
        create_concept_recommended_table(schema_dao, logger)
    create_and_assign_roles_task(dbdao=schema_dao)
    if cdm_version == CDMVersion.OMOP54:
        # v5.3 does not have cohort table
        # Grant write cohort and cohort_definition table privileges to read role
        grant_cohort_write_privileges(schema_dao, logger)

    if schema_dao.schema_name != vocab_schema:
        
        # Insert CDM Version
        schema_dao.vocab_schema_name = vocab_schema
        
        insert_cdm_version(
            cdm_version=cdm_version,
            dbdao=schema_dao
        )
        
    else:
        # If creating schemas without vocab data
        # Todo: Add insertion of cdm version to update flow
        logger.info(f"Inserting dummy CDM Version '{cdm_version}'. Please update after loading vocabulary data.")
        insert_cdm_version(
            cdm_version=cdm_version,
            dbdao=schema_dao,
            use_placeholder_values=True
        )

     
@task(log_prints=True,
      task_run_name="create_cdm_tables-{dbdao.schema_name}")
def create_cdm_tables(dbdao: DaoBase, cdm_version: str, logger) -> bool:
    # currently only supports pg dialect
    r_libs_user_directory = Variable.get("r_libs_user")

    admin_user =  UserType.ADMIN_USER
    set_connection_string = dbdao.get_database_connector_connection_string(
        user_type=admin_user
    )
    set_db_driver_env_string = dbdao.set_db_driver_env()
    
    logger.info(f"Running CommonDataModel version '{cdm_version}' on schema '{dbdao.schema_name}' in database '{dbdao.database_code}'")
    try:
        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(
                f'''
                .libPaths(c('{r_libs_user_directory}',.libPaths()))
                library('CommonDataModel', lib.loc = '{r_libs_user_directory}')
                {set_db_driver_env_string}
                {set_connection_string}
                cdm_version <- "{cdm_version}"
                schema_name <- "{dbdao.schema_name}"
                CommonDataModel::executeDdl(connectionDetails = connectionDetails, cdmVersion = cdm_version, cdmDatabaseSchema = schema_name, executeDdl = TRUE, executePrimaryKey = TRUE, executeForeignKey = FALSE)
                '''
            )
        logger.info(f"Succesfully ran CommonDataModel version '{cdm_version}' on schema '{dbdao.schema_name}' in database '{dbdao.database_code}'")
    except Exception as e:
        logger.error(f"Failed to run CommonDataModel version '{cdm_version}' on schema '{dbdao.schema_name}' in database '{dbdao.database_code}'")
        raise e
    
    return True


@task(log_prints=True,
      task_run_name="create_concept_recommended_table-{dbdao.schema_name}")
def create_concept_recommended_table(dbdao: DaoBase, logger):
    table_name = "concept_recommended"
    columns_to_create = {
            "concept_id_1": BigInteger,
            "concept_id_2": BigInteger,
            "relationship_id": String(20)
    }
    logger.info(f"Creating '{table_name}' table..")
    dbdao.create_table(table_name, columns_to_create)
    logger.info(f"Sucessfully created '{table_name}' table!")


@task(log_prints=True,
      task_run_name="grant_cohort_write_privileges-{userdao.schema_name}")
def grant_cohort_write_privileges(userdao: DaoBase, logger):
    logger.info(f"Granting cohort write privileges to '{userdao.read_role}' role")
    userdao.grant_cohort_write_privileges(userdao.read_role)

@task(log_prints=True)
def insert_cdm_version(cdm_version: str, dbdao: DaoBase, use_placeholder_values=False):  
    logger = get_run_logger() 
    
    # Populate 'cdm_version_concept_id' and 'vocabulary_version' values from vocab
    # https://ohdsi.github.io/CommonDataModel/cdm54.html#cdm_source

    cdm_concept_code = "CDM " + RELEASE_VERSION_MAPPING.get(cdm_version)
    
    if not use_placeholder_values:
            cdm_version_concept_id = dbdao.get_cdm_version_concept_id(cdm_concept_code)
            logger.info(f"Retrieved cdm_version_concept_id '{cdm_version_concept_id}' from vocab schema '{dbdao.vocab_schema_name}' with cdm_concept_code '{cdm_concept_code}'..")
            vocabulary_version = dbdao.get_vocabulary_version()
            logger.info(f"Retrieved vocabulary_version '{vocabulary_version}' from vocab schema '{dbdao.vocab_schema_name}' with cdm_concept_code '{cdm_concept_code}'..")
    else:
        # Scenario where vocab schema is empty and seeding with omop5-4 as default
        cdm_version_concept_id = "798878"
        vocabulary_version = "v5.0 30-AUG-24"

    values_to_insert = {
        "cdm_source_name": dbdao.schema_name,
        "cdm_source_abbreviation": dbdao.schema_name[0:25],
        "cdm_holder": "D4L",
        "source_release_date": datetime.now(),
        "cdm_release_date": datetime.now(),
        "cdm_version": cdm_version,
        "vocabulary_version": vocabulary_version,
    }
    if cdm_version == CDMVersion.OMOP54:
        # v5.3 does not have 'cdm_version_concept_id' column
        values_to_insert["cdm_version_concept_id"] = cdm_version_concept_id
    
    logger.info(f"Inserting CDM Version into 'cdm_source' table..")
    dbdao.insert_values_into_table("cdm_source", values_to_insert)
    