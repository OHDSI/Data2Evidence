#!/usr/bin/env bash
# Plugin asset: DuckDB loadable extensions, version-matched to the duckdb pin
# in pyproject.toml/pixi.lock. cwd = plugin dir; flows resolve
# <cwd>/duckdb_extensions.
set -euo pipefail
DUCKDB_VERSION="1.4.4"
EXTENSIONS="postgres_scanner fts"
mkdir -p duckdb_extensions
for ext in $EXTENSIONS; do
  [ -f "duckdb_extensions/${ext}.duckdb_extension" ] && continue
  curl -fLsS --retry 3 -o "duckdb_extensions/${ext}.duckdb_extension.gz" \
    "https://extensions.duckdb.org/v${DUCKDB_VERSION}/linux_amd64/${ext}.duckdb_extension.gz"
  gzip -d "duckdb_extensions/${ext}.duckdb_extension.gz"
done

# ADBC Snowflake driver: the native .so the DuckDB `snowflake` community extension
ADBC_VERSION="1.8.0"
libdir="${CONDA_PREFIX:-$PWD}/lib"
if [ ! -f "$libdir/libadbc_driver_snowflake.so" ]; then
  case "$(uname -m)" in
    x86_64)  ADBC_WHL="https://files.pythonhosted.org/packages/b8/6f/ff6d76ca035f0f2308733e7c7e96aeb094d2927a1de1e1a1721593286d3e/adbc_driver_snowflake-${ADBC_VERSION}-py3-none-manylinux1_x86_64.manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_5_x86_64.whl" ;;
    aarch64) ADBC_WHL="https://files.pythonhosted.org/packages/a4/14/7f448f5be225a3c596aa1a14a704fb4d8a2871e306d8725f98028af4265f/adbc_driver_snowflake-${ADBC_VERSION}-py3-none-manylinux2014_aarch64.manylinux_2_17_aarch64.whl" ;;
    *) echo "setup_assets: unsupported arch $(uname -m) for ADBC snowflake driver" >&2; exit 1 ;;
  esac
  mkdir -p "$libdir"
  tmp="$(mktemp -d)"
  curl -fLsS --retry 3 -o "$tmp/adbc.whl" "$ADBC_WHL"
  python3 -m zipfile -e "$tmp/adbc.whl" "$tmp/x"
  cp "$(find "$tmp/x" -name 'libadbc_driver_snowflake.so' | head -n1)" "$libdir/"
  rm -rf "$tmp"
fi
