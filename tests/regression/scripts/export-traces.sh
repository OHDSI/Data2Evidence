#!/usr/bin/env bash
# Export traces from Jaeger HTTP API after a k6 run.
# Writes results/traces.json for upload as a GitHub Artifact.
#
# Usage:
#   JAEGER_HOST=localhost JAEGER_PORT=16686 bash export-traces.sh
#
# Defaults: localhost:16686 (Jaeger query UI port)

set -euo pipefail

JAEGER_HOST="${JAEGER_HOST:-localhost}"
JAEGER_PORT="${JAEGER_PORT:-16686}"
SERVICE="${JAEGER_SERVICE:-analytics-svc}"
LIMIT="${JAEGER_LIMIT:-10000}"
OUT_DIR="${OUT_DIR:-$(dirname "$0")/../results}"

JAEGER_API="http://${JAEGER_HOST}:${JAEGER_PORT}/api"
OUT_FILE="${OUT_DIR}/traces.json"

mkdir -p "$OUT_DIR"

echo "Fetching services from Jaeger..."
services=$(curl -sf "${JAEGER_API}/services")
echo "$services" | python3 -m json.tool --no-ensure-ascii 2>/dev/null || echo "$services"

echo ""
echo "Exporting traces for service: ${SERVICE} (limit: ${LIMIT})"
traces=$(curl -sf "${JAEGER_API}/traces?service=${SERVICE}&limit=${LIMIT}")

if [ -z "$traces" ]; then
  echo "No traces returned from Jaeger — is OTEL enabled and were requests made?"
  exit 1
fi

echo "$traces" > "$OUT_FILE"
count=$(echo "$traces" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data', [])))" 2>/dev/null || echo "unknown")
echo "Exported ${count} trace(s) to ${OUT_FILE}"
