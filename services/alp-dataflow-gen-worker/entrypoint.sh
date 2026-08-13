#!/usr/bin/env bash
# Worker entrypoint: optional HANA JDBC driver download (the SAP-licensed jar
# cannot ship in the image), optional BigQuery JDBC driver download (same
# reason — the Simba driver is proprietary, not Apache-2.0), background env
# pre-warm loop, then the worker process. Mirrors install_hana_drivers.sh
# warn-and-continue semantics so the worker still starts without internet;
# flow runs needing the missing driver then fail with a specific error at
# execution time.
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

# BigQuery JDBC driver for direct-source Achilles runs (webapi datasets). The
# Simba BigQuery driver is proprietary (not Apache-2.0) and must not be
# redistributed in the published image, so — same pattern as the HANA ngdbc
# jar above — the deployer opts in by setting D2E_BIGQUERY_JDBC_URL (their
# own license acceptance) and the driver is fetched at container start into
# /app/inst/drivers, the same directory DatabaseConnector looks in. Unset var
# means the deployment doesn't use BigQuery: no-op. Air-gapped alternative:
# volume-mount a pre-fetched jar into /app/inst/drivers, same as ngdbc.
bq_jdbc_url="${D2E_BIGQUERY_JDBC_URL:-}"
bq_driver_dir="${BIGQUERY_JDBC_DRIVER_DIR:-/app/inst/drivers}"
if [ -n "$bq_jdbc_url" ]; then
  if ls "$bq_driver_dir" 2>/dev/null | grep -qi bigquery; then
    echo "BigQuery JDBC driver already present in $bq_driver_dir."
  else
    echo "Downloading BigQuery JDBC driver from $bq_jdbc_url..."
    mkdir -p "$bq_driver_dir"
    bq_tmp_zip="$(mktemp)"
    if curl -fLsS --retry 3 -o "$bq_tmp_zip" "$bq_jdbc_url" \
        && unzip -oq "$bq_tmp_zip" -d "$bq_driver_dir"; then
      rm -f "$bq_tmp_zip"
      echo "BigQuery JDBC driver provisioned from $bq_jdbc_url."
    else
      rm -f "$bq_tmp_zip"
      echo "WARNING: BigQuery JDBC driver download failed; flow runs needing it will fail with a pathToDriver error." >&2
    fi
  fi
fi

# Re-provision baked plugin dirs in the background: no-ops unless a stamp
# delta applies (e.g. the HANA driver top-up when the runtime flag differs
# from build time). Must not block worker startup — flow runs submitted
# right after a container (re)start would sit Pending; run-flow.sh performs
# the same per-dir check itself, and provision_dir holds a per-dir flock.
(
  for dir in "${D2E_FLOWS_CACHE:-/var/lib/d2e-flows}"/*/baked; do
    [ -f "$dir/pyproject.toml" ] && /app/provision-envs.sh --dir "$dir" || true
  done
) &

/app/provision-envs.sh --watch &

exec "$@"
