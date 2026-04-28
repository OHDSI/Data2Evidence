from datetime import datetime
from sqlalchemy import text, BigInteger, String

from prefect import task, get_run_logger

from _shared_flow_utils.dao.DBDao import DBDao

from .types import CDMVersion, RELEASE_VERSION_MAPPING
from .constants import CREATE_SCRIPT_DIR, SQL_FILES_ORDER, CDM_VERSION_CONCEPT_CODE_MAPPING


@task(log_prints=True,
      task_run_name="create_cdm_tables-{schema}")
def create_cdm_tables(schema: str, data_model: CDMVersion, dbdao: DBDao):
    logger = get_run_logger()

    for sql_file in SQL_FILES_ORDER:
        file_path = CREATE_SCRIPT_DIR / data_model / sql_file
        
        if not file_path.exists():
            logger.error(f"Skipping {sql_file}, file not found at: {file_path}")
            raise FileNotFoundError(f"SQL file not found: {file_path}")

        logger.info(f"Executing {sql_file}...")
        sql_text = file_path.read_text()
        sql_text = sql_text.replace("@cdmDatabaseSchema", schema)

        try:
            with dbdao.engine.connect() as conn:
                trans = conn.begin()
                try:                    
                    # Split SQL file into individual statements and filter out comments
                    raw_statements = sql_text.split(";")
                    statements = []
                    
                    for stmt in raw_statements:
                        # Remove comment lines but keep the SQL code
                        lines = [line for line in stmt.split("\n") 
                                if line.strip() and not line.strip().startswith("--")]
                        cleaned_stmt = "\n".join(lines).strip()
                        if cleaned_stmt:
                            statements.append(cleaned_stmt)
                    
                    logger.debug(f"Found {len(statements)} statements to execute in {sql_file}")
                    
                    for i, stmt in enumerate(statements, 1):
                        logger.debug(f"Executing statement {i}/{len(statements)}: {stmt[:100]}...")
                        conn.execute(text(stmt))
                    
                    trans.commit()
                    logger.info(f"Transaction committed for {sql_file}")
                except Exception:
                    trans.rollback()
                    logger.info(f"Transaction rolled back for {sql_file}")
                    raise
        except Exception as e:
            logger.error(f"Failed to execute {sql_file}: {e}")
            raise
            
        logger.info(f"Completed {sql_file}")


@task(log_prints=True,
      task_run_name="create_concept_recommended_table-{schema}")
def create_concept_recommended_table(dbdao: DBDao, schema: str):
    logger = get_run_logger()
    table_name = "CONCEPT_RECOMMENDED"
    columns_to_create = {
            "concept_id_1": BigInteger,
            "concept_id_2": BigInteger,
            "relationship_id": String(20)
    }
    logger.info(f"Creating '{table_name}' table..")
    dbdao.create_table(schema, table_name, columns_to_create)
    logger.info(f"Successfully created '{table_name}' table!")


@task(log_prints=True, task_run_name="insert_cdm_version-{cdm_schema}-{cdm_version}")
def insert_cdm_version(cdm_version: str, dbdao: DBDao, cdm_schema: str):  
    logger = get_run_logger() 

    cdm_version_concept_code = RELEASE_VERSION_MAPPING.get(cdm_version)

    cdm_version_concept_id = CDM_VERSION_CONCEPT_CODE_MAPPING.get("CDM " + cdm_version_concept_code)

    vocabulary_version = "v5.0 30-AUG-24"    

    values_to_insert = {
        "cdm_source_name": cdm_schema,
        "cdm_source_abbreviation": cdm_schema[0:25],
        "cdm_holder": "D4L",
        "source_release_date": datetime.now(),
        "cdm_release_date": datetime.now(),
        "cdm_version": cdm_version_concept_code,
        "vocabulary_version": vocabulary_version,
    }
    if cdm_version == CDMVersion.OMOP54:
        # v5.3 does not have 'cdm_version_concept_id' column
        values_to_insert["cdm_version_concept_id"] = cdm_version_concept_id
    
    logger.info(f"Inserting CDM Version into 'cdm_source' table..")
    dbdao.insert_values_into_table(cdm_schema, "cdm_source", values_to_insert)