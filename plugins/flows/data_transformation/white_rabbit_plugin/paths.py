"""Filesystem preconditions for the WhiteRabbit plugin.

Deliberately free of Prefect imports so these can be unit-tested without a
flow-run harness. The WhiteRabbit dist is provisioned into the
dataflow-gen-worker image (see services/alp-dataflow-gen-worker/Dockerfile);
these helpers make the flow tasks self-sufficient and make a misprovisioned
worker report itself clearly.
"""

from pathlib import Path


def ensure_whiterabbit_dirs(dir_path: str, csv_dir: str) -> None:
    """Create the WhiteRabbit working directories if they are absent.

    open(path, "w") creates a file but never its parent, which is why a missing
    directory previously surfaced as a FileNotFoundError naming config.ini.
    """
    Path(dir_path).mkdir(parents=True, exist_ok=True)
    Path(csv_dir).mkdir(parents=True, exist_ok=True)


def require_whiterabbit_dist(bin_path: str) -> None:
    """Fail fast, and honestly, when the WhiteRabbit distribution is absent."""
    if not Path(bin_path).exists():
        raise RuntimeError(
            f"WhiteRabbit distribution not found at {bin_path}. "
            "The dist is provisioned into the dataflow-gen-worker image from "
            "the whiterabbit OCI stage; a worker built without it cannot run "
            "scans."
        )


def clear_csv_working_dir(csv_dir: str) -> int:
    """Remove CSV files left in the shared scan working directory.

    Every node's CSVs are downloaded into this one flat directory and scans run
    with tables_to_scan="*", so without this a scan would report tables
    belonging to previous scans and to other ETL nodes. Only *.csv is removed:
    the directory is also the working folder WhiteRabbit writes ScanReport.xlsx
    into.

    Returns the number of files removed.
    """
    directory = Path(csv_dir)
    if not directory.is_dir():
        return 0

    removed = 0
    for entry in directory.iterdir():
        if entry.is_file() and entry.suffix.lower() == ".csv":
            entry.unlink()
            removed += 1
    return removed
