import os
import requests
import pandas as pd
from pathlib import Path
from shutil import rmtree
from sqlalchemy import text
from zipfile import ZipFile
from functools import partial

from prefect import flow, task, get_run_logger

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.create_dataset_tasks import *

from .types import OmopCDMPluginOptions, FlowActionType
from .constants import (
    BASE_URL,
    DATA_DIR,
    ZIP_PATH,
    EXTRACT_DIR,
    CREATE_SCRIPT_DIR,
    SQL_FILES_ORDER
)
from .versioninfo import update_dataset_metadata_flow

os.environ["plugin_name"] = "hana_load_plugin"

# flows
@flow(log_prints=True)
def hana_load_plugin(options: OmopCDMPluginOptions):
    match options.flow_action_type:
        case FlowActionType.CREATE_DATA_MODEL:
            create_datamodel(options)
        case FlowActionType.GET_VERSION_INFO:
            update_dataset_metadata_flow(options)
        case _:
            logger = get_run_logger()
            error_msg = f"Flow action type '{options.flow_action_type}' not supported, only '{[action.value for action in FlowActionType]}'"
            logger.error(error_msg)
            raise ValueError(error_msg)

def create_datamodel(options: OmopCDMPluginOptions):
    logger = get_run_logger()
    database_code = options.database_code
    use_cache_db = options.use_cache_db
    schema = options.schema_name
    results_schema = options.results_schema
    load_csvs = options.load_csvs
    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)
    folder = None

    if load_csvs: 
        # Extract dataset if folder missing or empty
        if not (EXTRACT_DIR.exists() and any(EXTRACT_DIR.iterdir())):
            # Download dataset if zip is missing
            if not ZIP_PATH.exists():
                ZIP_PATH = download_eunomia()
                folder = unzip_dataset(ZIP_PATH)
            else:
                logger.info("Zip already exists, skipping download.")
        else:
            logger.info("Extracted folder already exists, skipping unzip.")
            folder = EXTRACT_DIR

    create_schema_task(dbdao, schema)

    # Parent task with hook to drop schema on failure
    create_datamodel_wo = create_datamodel_parent.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=dbdao, schema=schema)
        )]
    )

    create_datamodel_wo(schema, dbdao, folder, load_csvs)

    # Create results schema
    create_schema_task(dbdao, results_schema)

    # Parent task with hook to drop results schema on failure
    create_results_tables = create_results_tables_parent_task.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema)
        )]
    )

    create_results_tables(dbdao, results_schema)

@task(log_prints=True)
def create_datamodel_parent(schema: str, dbdao: DBDao, folder: Path, load_csvs: bool):
    run_create_datamodel_scripts(schema, dbdao)
    if load_csvs and folder is not None:
        load_csvs_to_hana(folder, schema, dbdao)
    else:
        logger = get_run_logger()
        logger.info("Skipping CSV loading as per configuration.")

@task(log_prints=True)
def download_eunomia():
    DATA_DIR.mkdir()
    get_run_logger().info(f"Downloading {BASE_URL} ...")
    resp = requests.get(BASE_URL)
    resp.raise_for_status()
    ZIP_PATH.write_bytes(resp.content)
    return ZIP_PATH


@task(log_prints=True)
def unzip_dataset(zip_path: Path):
    get_run_logger().info(f"Extracting {zip_path} ...")
    with ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(DATA_DIR)
    return EXTRACT_DIR


@task(log_prints=True)
def run_create_datamodel_scripts(schema: str, dbdao: DBDao):
    logger = get_run_logger()
    
    for sql_file in SQL_FILES_ORDER:
        file_path = CREATE_SCRIPT_DIR / sql_file

        if not file_path.exists():
            logger.warning(f"Skipping {sql_file}, file not found.")
            continue

        logger.info(f"Running {sql_file} ...")
        sql_text = file_path.read_text()

        # Replace OHDSI placeholders with schema name
        sql_text = sql_text.replace("@cdmDatabaseSchema", schema)

        with dbdao.engine.connect() as conn:
            for stmt in sql_text.split(";"):
                stmt = stmt.strip()
                if stmt and not stmt.startswith("--"):
                    try:
                        conn.execute(text(stmt))
                    except Exception as e:
                        logger.warning(
                            f"Error executing statement from {sql_file}: {e}\nSQL: {stmt[:120]}..."
                        )
            conn.commit()
        logger.info(f"Completed {sql_file}")


@task(log_prints=True)
def load_csvs_to_hana(folder: Path, schema: str, dbdao: DBDao):
    logger = get_run_logger()
    for csv_file in folder.glob("*.csv"):
        table_name = csv_file.stem.lower()
        logger.info(f"Loading {csv_file.name} -> {schema}.{table_name}")
        df = pd.read_csv(csv_file)
        if table_name in ('vocabulary', 'concept'):
            df['VOCABULARY_ID'] = df['VOCABULARY_ID'].fillna('None')
        df.to_sql(
            table_name,
            dbdao.engine,
            schema=schema,
            if_exists="append",
            index=False
        )
    rmtree(DATA_DIR)
