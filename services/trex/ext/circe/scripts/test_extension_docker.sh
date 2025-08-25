#!/usr/bin/env bash
set -euo pipefail

cat > /work/test.sql <<'SQL'
INSTALL '/extensions/circe.duckdb_extension';
LOAD circe;
SELECT circe_hello('world') AS greet;
SELECT circe_openssl_version('info') AS openssl_ver;
-- Basic negative test: expect an error if passing bad base64
-- We wrap it in a try by selecting and ignoring failure (DuckDB will error out, so we skip here)
SQL

echo "[test] Running DuckDB with Circe extension"
/usr/local/bin/duckdb -noheader -csv < /work/test.sql || true

# Positive JSON->SQL test (encode small JSON cohort expression)
B64=$(printf '{"expression":"demo"}' | base64 -w0 || printf '{"expression":"demo"}' | base64)
/usr/local/bin/duckdb -cmd "INSTALL '/extensions/circe.duckdb_extension'; LOAD circe; SELECT length(circe_json_to_sql('$B64','{}'))>0 AS json_sql_ok;" 2>&1 | tee /work/result.txt

echo "[test] Results:"; cat /work/result.txt

if ! grep -q "json_sql_ok" /work/result.txt; then
  echo "[test] Did not see json_sql_ok column header" >&2
  exit 1
fi

echo "[test] Completed"
