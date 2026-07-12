#!/usr/bin/env bash
# Environment provisioner for D2E flow plugins.
#
# Modes:
#   --artifact '<json>'   Provision one plugin from a plugin_artifact reference
#                         {path|url, sha256, name, version}. Fetches the tarball
#                         (TREX_STORAGE_URL/object/<path>, or the absolute url),
#                         verifies sha256, extracts, installs the pixi env from
#                         the committed lockfile, runs the plugin's setup tasks.
#   --dir <dir>           Provision an already-extracted plugin dir in place
#                         (used at image build for the baked release cache).
#   --watch               Poll the Prefect API for deployments carrying
#                         plugin_artifact refs and pre-warm any not yet cached.
#
# Provisioning is lockfile-only (pixi --frozen): no resolution at run time.
# A .d2e-env-ready marker (artifact sha256, or lockfile hash for --dir) makes
# every mode idempotent.
set -uo pipefail

cache_root="${D2E_FLOWS_CACHE:-/var/lib/d2e-flows}"

log() { echo "provision-envs: $*" >&2; }

install_env() { # $1 = plugin dir
  local dir="$1" manifest="$1/pyproject.toml"
  [ -f "$manifest" ] || { log "no pyproject.toml in $dir"; return 1; }
  pixi install --frozen --manifest-path "$manifest" || return 1
  # HANA driver goes INTO the default env (a separate pixi env would have its
  # own empty R library — renv restores only into default). Same runtime-install
  # semantics as install_hana_drivers.sh in the docker-pool images.
  if [ "${INSTALL_SQLALCHEMY_HANA:-false}" = "true" ] && grep -q 'sqlalchemy-hana' "$manifest"; then
    pixi run --frozen --manifest-path "$manifest" \
      pip install --quiet "sqlalchemy-hana==${SQLALCHEMY_HANA_VERSION:-2.2.0}" || return 1
  fi
  # Additional named environments some plugins declare (e.g. the NER stack's
  # self-contained env in data_transformation).
  if grep -qE '^ner *= \{' "$manifest"; then
    pixi install --frozen -e ner --manifest-path "$manifest" || return 1
  fi
  if grep -q '^setup-assets' "$manifest"; then
    (cd "$dir" && pixi run --frozen --manifest-path "$manifest" setup-assets) || return 1
  fi
  if grep -q '^setup-r' "$manifest"; then
    (cd "$dir" && pixi run --frozen --manifest-path "$manifest" setup-r) || return 1
  fi
}

provision_dir() { # $1 = extracted plugin dir, $2 = marker value
  local dir="$1" stamp="$2"
  # The hana env is part of the provisioned state: an image baked without it
  # must re-provision (cheap: hardlinks + two pypi packages) when the worker
  # runs with INSTALL_SQLALCHEMY_HANA=true.
  if [ "${INSTALL_SQLALCHEMY_HANA:-false}" = "true" ] && grep -q 'sqlalchemy-hana' "$dir/pyproject.toml" 2>/dev/null; then
    stamp="$stamp:hana"
  fi
  if [ "$(cat "$dir/.d2e-env-ready" 2>/dev/null)" = "$stamp" ]; then
    return 0
  fi
  log "provisioning $dir"
  install_env "$dir" || return 1
  printf '%s' "$stamp" > "$dir/.d2e-env-ready"
  log "ready: $dir"
}

provision_artifact() { # $1 = plugin_artifact json
  local json="$1"
  local name sha url
  name="$(printf '%s' "$json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')" || return 1
  sha="$(printf '%s' "$json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["sha256"])')" || return 1
  url="$(printf '%s' "$json" | python3 -c '
import json, sys, os
a = json.load(sys.stdin)
if a.get("url"):
    print(a["url"])
else:
    base = os.environ.get("TREX_STORAGE_URL", "")
    if not base:
        raise SystemExit("no url in artifact and TREX_STORAGE_URL unset")
    print(base.rstrip("/") + "/object/" + a["path"].lstrip("/"))
')" || return 1

  local dest="$cache_root/$name/${sha:0:12}"
  local have
  have="$(cat "$dest/.d2e-env-ready" 2>/dev/null)"
  if [ "$have" = "$sha" ] || [ "$have" = "$sha:hana" ]; then
    # Present (possibly needing only the hana env top-up) — no re-download;
    # provision_dir handles the stamp delta.
    provision_dir "$dest" "$sha"
    return $?
  fi

  log "fetching $name@${sha:0:12} from $url"
  local tmp
  tmp="$(mktemp -d)" || return 1
  trap 'rm -rf "$tmp"' RETURN
  # Both headers on purpose: trex's authContext accepts service_role keys only
  # via `apikey`, while the embedded supabase-storage validates Authorization.
  local auth=()
  [ -n "${TREX_STORAGE_SERVICE_KEY:-}" ] && auth=(-H "apikey: $TREX_STORAGE_SERVICE_KEY" -H "Authorization: Bearer $TREX_STORAGE_SERVICE_KEY")
  curl -fLsS --retry 3 "${auth[@]}" -o "$tmp/plugin.tgz" "$url" || { log "download failed: $url"; return 1; }

  local got
  got="$(sha256sum "$tmp/plugin.tgz" | cut -d' ' -f1)"
  if [ "$got" != "$sha" ]; then
    log "sha256 mismatch for $name: expected $sha got $got"
    return 1
  fi

  rm -rf "$dest.partial" && mkdir -p "$dest.partial"
  tar -xzf "$tmp/plugin.tgz" -C "$dest.partial" --strip-components=1 || { log "extract failed"; return 1; }
  rm -rf "$dest" && mv "$dest.partial" "$dest"
  provision_dir "$dest" "$sha"
}

watch_loop() {
  local interval="${PROVISION_INTERVAL:-30}"
  log "watch: pre-warming from Prefect deployments every ${interval}s"
  while true; do
    python3 - <<'EOF' | while IFS= read -r artifact; do provision_artifact "$artifact"; done
import json, os, urllib.request
try:
    req = urllib.request.Request(
        os.environ["PREFECT_API_URL"] + "/deployments/filter",
        data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        seen = set()
        for dep in json.load(r):
            a = (dep.get("job_variables") or {}).get("plugin_artifact")
            if a and a.get("sha256") and a["sha256"] not in seen:
                seen.add(a["sha256"])
                print(json.dumps(a))
except Exception as e:
    import sys
    print(f"provision-envs: deployment poll failed ({e})", file=sys.stderr)
EOF
    sleep "$interval"
  done
}

case "${1:-}" in
  --artifact) provision_artifact "$2" ;;
  --dir) provision_dir "$2" "$(cat "$2/pixi.lock" "$2/renv.lock" 2>/dev/null | sha256sum | cut -d' ' -f1)" ;;
  --watch) watch_loop ;;
  *) echo "usage: provision-envs.sh --artifact '<json>' | --dir <dir> | --watch" >&2; exit 2 ;;
esac
