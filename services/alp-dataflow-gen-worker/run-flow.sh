#!/usr/bin/env bash
# Per-flow-run launcher for the D2E process worker. The worker execs this
# directly as the flow run's command (argv[0]); it must end in `exec` so
# Prefect signals reach the engine.
#
# Usage: run-flow.sh <plugin-short-name> [environment]
#   e.g. "run-flow.sh loyalty-score-flow", "run-flow.sh data-transformation-flow ner"
#
# Resolution order for the plugin's code+env:
#   1. The flow run's deployment carries job_variables.plugin_artifact
#      -> ensure that artifact is provisioned locally, run from its dir.
#   2. No artifact ref -> newest provisioned dir in the local cache
#      (baked release plugins land there at image build).
set -uo pipefail

name="${1:?usage: run-flow.sh <plugin-short-name> [environment]}"
env_override="${2:-}"
cache_root="${D2E_FLOWS_CACHE:-/var/lib/d2e-flows}"

plugin_dir=""
artifact_json=""
if [ -n "${PREFECT__FLOW_RUN_ID:-}" ] && [ -n "${PREFECT_API_URL:-}" ]; then
  artifact_json="$(python3 - <<'EOF'
import json, os, urllib.request

def get(path):
    req = urllib.request.Request(os.environ["PREFECT_API_URL"] + path)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)

try:
    run = get("/flow_runs/" + os.environ["PREFECT__FLOW_RUN_ID"])
    dep_id = run.get("deployment_id")
    if dep_id:
        dep = get("/deployments/" + dep_id)
        artifact = (dep.get("job_variables") or {}).get("plugin_artifact")
        if artifact:
            print(json.dumps(artifact))
except Exception as e:
    import sys
    print(f"run-flow: deployment lookup failed ({e}); using local cache", file=sys.stderr)
EOF
)"
fi

if [ -n "$artifact_json" ]; then
  if /app/provision-envs.sh --artifact "$artifact_json"; then
    sha="$(printf '%s' "$artifact_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["sha256"][:12])')"
    plugin_dir="$cache_root/$name/$sha"
  else
    echo "run-flow: artifact provisioning failed; falling back to local cache" >&2
  fi
fi

if [ -z "$plugin_dir" ] || [ ! -f "$plugin_dir/.d2e-env-ready" ]; then
  plugin_dir="$(ls -1dt "$cache_root/$name"/*/ 2>/dev/null | while read -r d; do
    [ -f "$d/.d2e-env-ready" ] && echo "${d%/}" && break
  done)"
fi

# Re-provision before running: a no-op when the ready-marker matches, but it
# applies stamp deltas — e.g. the HANA driver top-up when the image was baked
# without INSTALL_SQLALCHEMY_HANA and the worker runs with it enabled.
# The base stamp comes from the dir's own marker (artifact sha for artifact
# dirs, lockfile hash for baked dirs), minus any :hana suffix provision_dir
# re-derives from the current flag.
if [ -n "$plugin_dir" ] && [ -f "$plugin_dir/pyproject.toml" ] && [ -f "$plugin_dir/.d2e-env-ready" ]; then
  stamp="$(sed 's/:hana$//' "$plugin_dir/.d2e-env-ready")"
  /app/provision-envs.sh --dir "$plugin_dir" "$stamp" || {
    echo "ERROR: provisioning check failed for $plugin_dir" >&2; exit 1; }
fi

if [ -z "$plugin_dir" ]; then
  echo "ERROR: no provisioned environment found for plugin '$name' under $cache_root" >&2
  exit 1
fi

manifest="$plugin_dir/pyproject.toml"
# HANA support lives inside the default env (provision-envs pip-installs the
# driver there); named env overrides (e.g. ner) come from the deployment command.
env_name="${env_override:-default}"

cd "$plugin_dir"
exec pixi run --frozen -e "$env_name" --manifest-path "$manifest" prefect flow-run execute
