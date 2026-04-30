
import requests
import pandas as pd
from pathlib import Path
from shutil import rmtree
from zipfile import ZipFile

from prefect import task, get_run_logger

from _shared_flow_utils.dao.DBDao import DBDao

from .constants import BASE_URL, DATA_DIR, ZIP_PATH, EXTRACT_DIR

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
