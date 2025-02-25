from pathlib import Path

from prefect import task
from prefect.logging import get_run_logger

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from flows.omop_cdm_plugin.types import OmopCDMPluginOptions, CDMVersion

from shared_utils.dao.DBDao import DBDao



def update_omop_cdm_dataset_flow(options: OmopCDMPluginOptions):
    logger = get_run_logger()
    database_code = options.database_code
    schema_name = options.schema_name
    use_cache_db = options.use_cache_db

    schema_dao = DBDao(use_cache_db=use_cache_db,
                       database_code=database_code, 
                       schema_name=schema_name)
    
    # check schema exists
    schema_exists = schema_dao.check_schema_exists()
    if schema_exists is False:
        raise ValueError(f"Schema '{schema_dao.schema_name}' does not exist in database '{schema_dao.database_code}'")
    
    cdm_version = schema_dao.get_value(table_name="cdm_source", column_name="cdm_version")
    
    match cdm_version:
        case CDMVersion.OMOP53:
            run_update_migration_script(schema_dao, logger)
            # update indexes
        case CDMVersion.OMOP54:
            logger.info(f"Schema '{cdm_version}' already updated at CDM Version '{cdm_version}'!")
        case _:
            raise ValueError(f"CDM Version '{cdm_version}' for schema '{schema_name}' not valid")


@task(log_prints=True,
      task_run_name="run_update_migration_script-{schema_dao.schema_name}")
def run_update_migration_script(schema_dao, logger):
    # Inlcudes update of cdm version
    
    script_directory = Path(f"flows/omop_cdm_plugin/update_scripts/{schema_dao.dialect}")
    ddl_script_file_path = script_directory / "OMOPCDM_5.4.1_ddl.sql"
    pk_script_file_path = script_directory / "OMOPCDM_5.4.1_primary_keys.sql"
    idx_script_file_path = script_directory / "OMOPCDM_5.4.1_indices.sql"
    

    with open(ddl_script_file_path, "r") as ddl, open(pk_script_file_path) as pk, open(idx_script_file_path) as idx:
        # Read SQL Script from file
        logger.info(f"Reading script from '{ddl_script_file_path}'..")
        ddl_script = ddl.read()
        logger.info(f"Reading script from '{pk_script_file_path}'..")
        pk_script = pk.read()
        logger.info(f"Reading script from '{idx_script_file_path}'..")
        idx_script = idx.read()

    Session = sessionmaker(bind=schema_dao.engine)
    session = Session()
    try:
        # Begin a transaction
        with session.begin():
            logger.info(f"Executing update to cdm_version 5.4 for '{schema_dao.schema_name}'..")
            # Execute migration script
            session.execute(text(f"""SET session search_path = '{schema_dao.schema_name}'"""))
            session.execute(text(ddl_script))
            session.execute(text(pk_script))
            session.execute(text(idx_script))
            #session.commit() 
    except Exception as e:
        logger.error(f"Failed to execute update to cdm_version 5.4: {e}")
        # Rollback transaction
        logger.info(f"Executing rollback")
        session.rollback()
        raise
    finally:
        # Close session
        session.close()
