"""Cache file-path resolution.

`duckdb_data_folder` is a Prefect variable, and a Prefect variable that was seeded
from an unset env var exists with a null value rather than not existing at all
(alp-dataflow-gen-init posts `value: undefined`, which Prefect stores as null). So
`Variable.get` hands back None, and every path built from it used to die inside
`Path()` with "argument should be a str ... not 'NoneType'" before the flow did any
work. These pin the fallback that keeps a cache build going instead.
"""

import pytest

from create_cachedb_file_plugin.paths import (
    DEFAULT_DUCKDB_DATA_FOLDER,
    resolve_duckdb_data_folder,
    resolve_duckdb_file_path,
)


@pytest.mark.parametrize("missing", [None, "", "   "])
def test_missing_variable_falls_back_to_the_mounted_cache_folder(missing):
    assert resolve_duckdb_data_folder(missing) == DEFAULT_DUCKDB_DATA_FOLDER


def test_configured_variable_wins():
    assert resolve_duckdb_data_folder("/somewhere/else") == "/somewhere/else"


def test_surrounding_whitespace_is_ignored():
    assert resolve_duckdb_data_folder("  /app/duckdb_data/cache \n") == "/app/duckdb_data/cache"


def test_file_path_is_the_catalog_name_under_the_folder():
    assert (
        resolve_duckdb_file_path("_90124d2f", "/app/duckdb_data/cache")
        == "/app/duckdb_data/cache/_90124d2f.db"
    )


def test_file_path_survives_a_null_folder():
    assert (
        resolve_duckdb_file_path("_90124d2f", None)
        == f"{DEFAULT_DUCKDB_DATA_FOLDER}/_90124d2f.db"
    )
