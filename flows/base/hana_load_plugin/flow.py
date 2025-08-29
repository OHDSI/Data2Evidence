import pandas as pd
from sqlalchemy import text
import sqlalchemy_hana
from zipfile import ZipFile
import requests
from pathlib import Path
from _shared_flow_utils.dao.DBDao import DBDao
from prefect import flow, task, get_run_logger

from .types import DataloadOptions
from .constants import (
    BASE_URL,
    DATA_DIR,
    ZIP_PATH,
    EXTRACT_DIR,
    CREATE_SCRIPT_DIR,
    SQL_FILES_ORDER
)

# flows
@flow(log_prints=True)
def hana_load_plugin(options: DataloadOptions):
    logger = get_run_logger()
    database_code = options.database_code
    use_cache_db = options.use_cache_db
    schema = options.schema_name
    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)
    dbdao.create_schema(schema)

    # Only create download task if zip is missing
    if not ZIP_PATH.exists():
        zip_path = download_eunomia()
    else:
        logger.info("Zip already exists, skipping download.")
        zip_path = ZIP_PATH

    # Only create unzip task if folder is missing/empty
    if not (EXTRACT_DIR.exists() and any(EXTRACT_DIR.iterdir())):
        folder = unzip_dataset(zip_path)
    else:
        logger.info("Extracted folder already exists, skipping unzip.")
        folder = EXTRACT_DIR

    run_create_scripts(schema, dbdao)
    load_csvs_to_hana(folder, schema, dbdao)


# tasks
@task(log_prints=True)
def download_eunomia():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
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
def run_create_scripts(schema: str, dbdao: DBDao):
    logger = get_run_logger()
    
    for sql_file in SQL_FILES_ORDER:
        file_path = CREATE_SCRIPT_DIR / sql_file

        if not file_path.exists():
            logger.warning(f"Skipping {sql_file}, file not found.")
            continue

        logger.info(f"Running {sql_file} ...")
        sql_text = file_path.read_text()

        # Replace OHDSI placeholders
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
        df.to_sql(
            table_name,
            dbdao.engine,
            schema=schema,
            if_exists="replace",
            index=False
        )
