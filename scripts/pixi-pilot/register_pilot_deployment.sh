#!/usr/bin/env bash
# Phase 0 pilot helper (throwaway; removed at cutover): registers a copy of the
# loyalty_score_plugin deployment on the parallel process-pool, bypassing trex.
# Usage:
#   register_pilot_deployment.sh                      # baked-cache pilot
#   register_pilot_deployment.sh <artifact-json>      # artifact-delivery pilot
set -euo pipefail

API="${PREFECT_API_URL:-http://localhost:41120/d2e/api}"
ARTIFACT_JSON="${1:-}"

FLOW_ID=$(curl -sf -X POST "$API/flows/" -H 'Content-Type: application/json' \
  -d '{"name": "loyalty_score_plugin"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

JOB_VARIABLES=$(python3 - "$ARTIFACT_JSON" <<'EOF'
import json, sys
jv = {"command": "/app/run-flow.sh loyalty-score-flow"}
if len(sys.argv) > 1 and sys.argv[1]:
    jv["plugin_artifact"] = json.loads(sys.argv[1])
print(json.dumps(jv))
EOF
)

curl -sf -X POST "$API/deployments/" -H 'Content-Type: application/json' -d @- <<EOF | python3 -c 'import sys,json; d=json.load(sys.stdin); print("deployment:", d["id"])'
{
  "name": "pixi_pilot",
  "flow_id": "$FLOW_ID",
  "entrypoint": "flows.loyalty_score_plugin.flow.loyalty_score_plugin",
  "work_pool_name": "process-pool",
  "enforce_parameter_schema": false,
  "job_variables": $JOB_VARIABLES
}
EOF
