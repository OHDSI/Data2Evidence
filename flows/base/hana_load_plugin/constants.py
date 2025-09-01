from pathlib import Path

# Constants
DATASET = "GiBleed"
CDM_VERSION = "5.3"

BASE_URL = f"https://github.com/OHDSI/EunomiaDatasets/raw/main/datasets/{DATASET}/{DATASET}_{CDM_VERSION}.zip"

DATA_DIR = Path("flows") / "base" / "hana_ingestion" / DATASET
ZIP_PATH = DATA_DIR / f"{DATASET}_{CDM_VERSION}.zip"
EXTRACT_DIR = DATA_DIR / f"{DATASET}_{CDM_VERSION}"

CREATE_SCRIPT_DIR = Path("/app/flows/hana_load_plugin/create_script")

# Hana does not support foreign keys, so we skip hana_constraints.sql
SQL_FILES_ORDER = [
    "hana_ddl.sql",
    "hana_primarykey.sql",
    "hana_indices.sql"
    # "hana_constraints.sql",
]
