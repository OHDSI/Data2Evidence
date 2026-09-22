"""Where a cache file goes.

Deliberately free of prefect so the pure test suite can import it.
"""

from pathlib import Path


# The cache volume as a flow's container sees it. trex mounts the same volume at
# /usr/src/data and only ever attaches cache catalogs from /usr/src/data/cache, so a
# cache file written anywhere else is invisible to every cache consumer.
DEFAULT_DUCKDB_DATA_FOLDER = "/app/duckdb_data/cache"


def resolve_duckdb_data_folder(variable_value) -> str:
    """The folder cache files are written into, given the `duckdb_data_folder` variable.

    alp-dataflow-gen-init seeds that Prefect variable from DUCKDB__DATA_FOLDER. When the
    env var is not set in the seeding runtime the variable is still created, with a null
    value -- seed.ts posts `value: undefined`, which Prefect stores as null -- so
    `Variable.get` returns None rather than raising. Callers then handed None to `Path()`
    and the flow died with "argument should be a str or an os.PathLike object where
    __fspath__ returns a str, not 'NoneType'" before doing any work, which is how a
    missing env var surfaced as an unreadable cache-build failure. Fall back to the mount
    both compose and the Helm worker actually have.
    """
    if isinstance(variable_value, str) and variable_value.strip():
        return variable_value.strip()
    return DEFAULT_DUCKDB_DATA_FOLDER


def resolve_duckdb_file_path(duckdb_database_name: str, folder_path) -> str:
    """
    Returns the full path to the DuckDB database file
    """
    return str(Path(resolve_duckdb_data_folder(folder_path)) / f"{duckdb_database_name}.db")
