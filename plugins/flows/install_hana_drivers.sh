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
#
# Idempotent: each step is a no-op if the artifact is already at the target
# version. Any extra args are exec'd as the final command.
set -euo pipefail

install_hana="${INSTALL_SQLALCHEMY_HANA:-false}"
sqlalchemy_hana_version="${SQLALCHEMY_HANA_VERSION:-2.2.0}"
jdbc_version="${HANA_JDBC_DRIVER_VERSION:-2.24.7}"
jdbc_path="${HANA_JDBC_DRIVER_PATH:-/app/inst/drivers/ngdbc-latest.jar}"
jdbc_url="${HANA_JDBC_DRIVER_URL:-https://repo1.maven.org/maven2/com/sap/cloud/db/jdbc/ngdbc/${jdbc_version}/ngdbc-${jdbc_version}.jar}"

if [ "$install_hana" = "true" ]; then
  installed_version="$(uv pip show sqlalchemy-hana 2>/dev/null | awk '/^Version:/ {print $2}' || true)"
  if [ "$installed_version" = "$sqlalchemy_hana_version" ]; then
    echo "sqlalchemy-hana==$sqlalchemy_hana_version already installed."
  else
    echo "Installing sqlalchemy-hana==$sqlalchemy_hana_version..."
    uv pip install "sqlalchemy-hana==$sqlalchemy_hana_version"
  fi

  jdbc_version_marker="${jdbc_path}.version"
  installed_jdbc_version=""
  if [ -f "$jdbc_version_marker" ]; then
    installed_jdbc_version="$(cat "$jdbc_version_marker")"
  fi
  if [ -s "$jdbc_path" ] && [ "$installed_jdbc_version" = "$jdbc_version" ]; then
    echo "HANA JDBC driver $jdbc_version already present at $jdbc_path."
  else
    echo "Downloading SAP HANA JDBC driver $jdbc_version from $jdbc_url..."
    mkdir -p "$(dirname "$jdbc_path")"
    tmp_path="${jdbc_path}.partial"
    curl --fail --location --silent --show-error --output "$tmp_path" "$jdbc_url"
    mv "$tmp_path" "$jdbc_path"
    printf '%s' "$jdbc_version" > "$jdbc_version_marker"
    echo "HANA JDBC driver $jdbc_version installed at $jdbc_path."
  fi
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
