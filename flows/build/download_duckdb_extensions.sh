#!/bin/bash
# Purpose: Download DuckDB extensions for a specified version
# Note: The duckdb_version must match the version in pyproject.toml and uv.lock
# Usage: ./download_duckdb_extensions.sh <duckdb_version> <extensions>
set -e


DUCKDB_VERSION="$1"
EXTENSIONS="$2"

if [ -z "$DUCKDB_VERSION" ] || [ -z "$EXTENSIONS" ]; then
  echo "Usage: $0 <duckdb_version> <extensions>"
  echo "Example: $0 0.10.0 'postgres_scanner,fts'"
  exit 1
fi

IFS=',' read -ra EXT_ARR <<< "$EXTENSIONS"
for ext in "${EXT_ARR[@]}"; do
  wget "https://extensions.duckdb.org/v${DUCKDB_VERSION}/linux_amd64/${ext}.duckdb_extension.gz"
  gzip -d "${ext}.duckdb_extension.gz"
done
