#!/usr/bin/env bash
# Plugin asset: DuckDB loadable extensions, version-matched to the duckdb pin
# in pyproject.toml/pixi.lock. cwd = plugin dir; flows resolve
# <cwd>/duckdb_extensions.
set -euo pipefail
DUCKDB_VERSION="1.4.0"
EXTENSIONS="postgres_scanner fts"
mkdir -p duckdb_extensions
for ext in $EXTENSIONS; do
  [ -f "duckdb_extensions/${ext}.duckdb_extension" ] && continue
  curl -fLsS --retry 3 -o "duckdb_extensions/${ext}.duckdb_extension.gz" \
    "https://extensions.duckdb.org/v${DUCKDB_VERSION}/linux_amd64/${ext}.duckdb_extension.gz"
  gzip -d "duckdb_extensions/${ext}.duckdb_extension.gz"
done
