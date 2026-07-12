#!/usr/bin/env bash
# Worker entrypoint: optional HANA JDBC driver download (the SAP-licensed jar
# cannot ship in the image), background env pre-warm loop, then the worker
# process. Mirrors install_hana_drivers.sh warn-and-continue semantics so the
# worker still starts without internet; HANA flow runs then fail with a
# specific error at execution time.
set -uo pipefail

if [ "${INSTALL_SQLALCHEMY_HANA:-false}" = "true" ]; then
  jdbc_version="${HANA_JDBC_DRIVER_VERSION:-2.24.7}"
  jdbc_path="${HANA_JDBC_DRIVER_PATH:-/app/inst/drivers/ngdbc-latest.jar}"
  jdbc_url="${HANA_JDBC_DRIVER_URL:-https://repo1.maven.org/maven2/com/sap/cloud/db/jdbc/ngdbc/${jdbc_version}/ngdbc-${jdbc_version}.jar}"
  installed=""
  [ -f "${jdbc_path}.version" ] && installed="$(cat "${jdbc_path}.version")"
  if [ -s "$jdbc_path" ] && [ "$installed" = "$jdbc_version" ]; then
    echo "HANA JDBC driver $jdbc_version already present at $jdbc_path."
  else
    echo "Downloading SAP HANA JDBC driver $jdbc_version..."
    mkdir -p "$(dirname "$jdbc_path")"
    if curl -fLsS --retry 3 -o "${jdbc_path}.partial" "$jdbc_url"; then
      mv "${jdbc_path}.partial" "$jdbc_path"
      printf '%s' "$jdbc_version" > "${jdbc_path}.version"
      echo "HANA JDBC driver installed at $jdbc_path."
    else
      echo "WARNING: HANA JDBC driver download failed; HANA flow runs will fail." >&2
    fi
  fi
fi

/app/provision-envs.sh --watch &

exec "$@"
