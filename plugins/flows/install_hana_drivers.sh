#!/usr/bin/env bash
# Installs SAP HANA driver components into a running flow container when
# INSTALL_SQLALCHEMY_HANA=true. Both components are SAP-licensed and cannot
# be redistributed in the public image, so they are fetched on demand:
#   * sqlalchemy-hana (Apache-2.0 wrapper, depends on the proprietary
#     hdbcli wheel from PyPI)
#   * ngdbc-<version>.jar (SAP HANA JDBC driver, fetched from Maven Central)
#
# Env vars:
#   INSTALL_SQLALCHEMY_HANA       true|false  gate for both components
#   SQLALCHEMY_HANA_VERSION       default 2.2.0
#   HANA_JDBC_DRIVER_VERSION      default 2.24.7
#   HANA_JDBC_DRIVER_PATH         default /app/inst/drivers/ngdbc-latest.jar
#   HANA_JDBC_DRIVER_URL          full override; if unset, computed from the
#                                  version + Maven Central
#   HANA_INSTALL_MAX_ATTEMPTS     default 3   retry budget per component
#
# Each install step retries up to $HANA_INSTALL_MAX_ATTEMPTS times. If all
# retries fail (typically: no internet), the script logs a warning and
# continues so the container still starts; HANA-dependent flow runs will
# fail with a more specific error at execution time. Any extra args are
# exec'd as the final command.
set -uo pipefail

install_hana="${INSTALL_SQLALCHEMY_HANA:-false}"
sqlalchemy_hana_version="${SQLALCHEMY_HANA_VERSION:-2.2.0}"
jdbc_version="${HANA_JDBC_DRIVER_VERSION:-2.24.7}"
jdbc_path="${HANA_JDBC_DRIVER_PATH:-/app/inst/drivers/ngdbc-latest.jar}"
jdbc_url="${HANA_JDBC_DRIVER_URL:-https://repo1.maven.org/maven2/com/sap/cloud/db/jdbc/ngdbc/${jdbc_version}/ngdbc-${jdbc_version}.jar}"
max_attempts="${HANA_INSTALL_MAX_ATTEMPTS:-3}"

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

install_sqlalchemy_hana() {
  uv pip install "sqlalchemy-hana==$sqlalchemy_hana_version"
}

download_jdbc() {
  local tmp_path="${jdbc_path}.partial"
  mkdir -p "$(dirname "$jdbc_path")" || return 1
  curl --fail --location --silent --show-error --output "$tmp_path" "$jdbc_url" || return 1
  mv "$tmp_path" "$jdbc_path" || return 1
  printf '%s' "$jdbc_version" > "${jdbc_path}.version" || return 1
}

if [ "$install_hana" = "true" ]; then
  installed_version="$(uv pip show sqlalchemy-hana 2>/dev/null | awk '/^Version:/ {print $2}' || true)"
  if [ "$installed_version" = "$sqlalchemy_hana_version" ]; then
    echo "sqlalchemy-hana==$sqlalchemy_hana_version already installed."
  else
    echo "Installing sqlalchemy-hana==$sqlalchemy_hana_version..."
    retry "sqlalchemy-hana install" install_sqlalchemy_hana || true
  fi

  installed_jdbc_version=""
  if [ -f "${jdbc_path}.version" ]; then
    installed_jdbc_version="$(cat "${jdbc_path}.version")"
  fi
  if [ -s "$jdbc_path" ] && [ "$installed_jdbc_version" = "$jdbc_version" ]; then
    echo "HANA JDBC driver $jdbc_version already present at $jdbc_path."
  else
    echo "Downloading SAP HANA JDBC driver $jdbc_version from $jdbc_url..."
    retry "HANA JDBC driver download" download_jdbc \
      && echo "HANA JDBC driver $jdbc_version installed at $jdbc_path." \
      || true
  fi
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
