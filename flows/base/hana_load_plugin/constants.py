from pathlib import Path

# Constants
DATASET = "GiBleed"
CDM_VERSION = "5.3"

# Root folder where constant.py lives
BASE_DIR = Path(__file__).resolve().parent

BASE_URL = f"https://github.com/OHDSI/EunomiaDatasets/raw/main/datasets/{DATASET}/{DATASET}_{CDM_VERSION}.zip"

DATA_DIR = BASE_DIR / DATASET
ZIP_PATH = DATA_DIR / f"{DATASET}_{CDM_VERSION}.zip"
EXTRACT_DIR = DATA_DIR / f"{DATASET}_{CDM_VERSION}"

CREATE_SCRIPT_DIR = BASE_DIR / "db"

# Hana does not support foreign keys, so we skip hana_constraints.sql
SQL_FILES_ORDER = [
    "hana_ddl.sql",
    # "hana_primarykey.sql", #usage of primary key is skipped due to duplicated primary keys in the dataset
    "hana_indices.sql"
    # "hana_constraints.sql",
]
