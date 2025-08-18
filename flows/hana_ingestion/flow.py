from prefect import flow, task
import os
import pandas as pd

DATA_DIR = "cache/GiBleed_5.3"

@flow(log_prints=True)
def hana_ingest_flow():
    """
    Prefect flow to load Eunomia CSVs into Pandas DataFrames.
    (Later, we’ll extend this to push into SAP HANA.)
    """
    dataframes = load_all_csvs(DATA_DIR)
    print("All CSVs loaded into Pandas dictionary")
    return dataframes

@task
def load_csv(file_path: str):
    """Load a single CSV into a Pandas DataFrame."""
    df = pd.read_csv(file_path)
    print(f"Loaded {file_path} : {df.shape[0]} rows, {df.shape[1]} cols")
    return df

@task
def load_all_csvs(data_dir: str):
    """Load all CSVs in the directory into a dictionary of DataFrames."""
    dataframes = {}
    for filename in os.listdir(data_dir): # List all files in the directory
        if filename.endswith(".csv"):
            table_name = filename.replace(".csv", "").lower()
            file_path = os.path.join(data_dir, filename)
            dataframes[table_name] = load_csv.submit(file_path)
    return dataframes


if __name__ == "__main__":
    hana_ingest_flow()