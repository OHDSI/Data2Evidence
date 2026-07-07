#!/usr/bin/env bash
# Installs Google BigQuery Simba JDBC driver into the drivers folder.
#   * SimbaJDBCDriverforGoogleBigQuery (proprietary, fetched from Google storage)
#
# Env vars:
#   ENV_FILE                          default .env
#   BIGQUERY_JDBC_DRIVER_VERSION      default 1.7.0.1001
#   BIGQUERY_JDBC_DRIVER_PATH         default ./plugins/flows/drivers
#   BIGQUERY_JDBC_DRIVER_URL          full override; if unset, computed from the
#                                      version
#   BIGQUERY_INSTALL_MAX_ATTEMPTS     default 3   retry budget
#
# Each install step retries up to $BIGQUERY_INSTALL_MAX_ATTEMPTS times. If all
# retries fail (typically: no internet), the script logs a warning and
# continues so the container still starts; BigQuery-dependent flow runs will
# fail with a more specific error at execution time. Any extra args are
# exec'd as the final command.
set -uo pipefail

env_file="${ENV_FILE:-.env}"
jdbc_version="${BIGQUERY_JDBC_DRIVER_VERSION:-1.7.0.1001}"
jdbc_path="${BIGQUERY_JDBC_DRIVER_PATH:-./plugins/flows/drivers}"
jdbc_url="${BIGQUERY_JDBC_DRIVER_URL:-https://storage.googleapis.com/simba-bq-release/jdbc/SimbaJDBCDriverforGoogleBigQuery42_${jdbc_version}.zip}"
max_attempts="${BIGQUERY_INSTALL_MAX_ATTEMPTS:-3}"

retry() {
  local label="$1"; shift
  local attempt=1
  while [ "$attempt" -le "$max_attempts" ]; do
    if "$@"; then
      return 0
    fi
    echo "WARNING: $label failed (attempt $attempt/$max_attempts)." >&2
    attempt=$((attempt + 1))
  done
  echo "WARNING: $label failed after $max_attempts attempts; continuing without it." >&2
  return 1
}

download_and_unzip_jdbc() {
  local tmp_zip="${jdbc_path}.zip"
  curl --fail --location --silent --show-error --output "$tmp_zip" "$jdbc_url" || return 1
  unzip -q -o -d "$jdbc_path" "$tmp_zip" || return 1
  rm -f "$tmp_zip" || return 1
}

echo "Downloading Google BigQuery Simba JDBC driver $jdbc_version from $jdbc_url..."
retry "BigQuery JDBC driver download" download_and_unzip_jdbc \
  && echo "BigQuery JDBC driver $jdbc_version installed at $jdbc_path." \
  || true


add_drivers_volume_mapping_to_prefect() {
  PROJECT_NAME=$(docker ps --format '{{.Names}}' | grep minerva | head -n 1 | cut -d'-' -f1)
  echo "Project Name: $PROJECT_NAME"

  local key="PREFECT_DOCKER_VOLUMES_CUSTOM"
  local drivers_abs_path="$(realpath "${jdbc_path}")"
  local value="[\"${PROJECT_NAME}_trex:/app/duckdb_data\",\"${drivers_abs_path}:/app/inst/drivers\"]"
  local entry="${key}='${value}'"

  # Check if last line is a newline
  if [ -f "$env_file" ] && [ -s "$env_file" ]; then
    local last_byte
    last_byte="$(tail -c 1 "$env_file" | od -An -t u1 | tr -d '[:space:]')"
    if [ "$last_byte" != "10" ]; then
      printf '\n' >> "$env_file"
    fi
  fi

  # Add/update env variable to env file
  if grep -q "^${key}=" "$env_file" 2>/dev/null; then
    awk -v key="$key" -v entry="$entry" \
      '$0 ~ "^"key"=" {print entry; next} {print}' "$env_file" > "${env_file}.tmp" \
      && mv "${env_file}.tmp" "$env_file"
  else
    echo "$entry" >> "$env_file"
  fi
  echo "Added ${entry} to ${env_file}"
}

add_drivers_volume_mapping_to_prefect

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
