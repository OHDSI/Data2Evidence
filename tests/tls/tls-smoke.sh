#!/usr/bin/env bash
#
# Internal-TLS smoke tests.
#
# Two things only:
#   A. Every internal TLS endpoint completes a handshake that verifies BOTH the
#      certificate chain (against the internal CA) AND the hostname. A cert whose
#      SAN does not cover the name being dialled fails here.
#   B. No deployment manifest or running container disables TLS verification.
#
# Requires a running stack. Read-only: probes existing containers, changes nothing.
#
#   ./tests/tls/tls-smoke.sh                  # uses .env.local, else .env
#   ./tests/tls/tls-smoke.sh -n .env          # explicit env file
#   PROBE_CONTAINER=alp-trex ./tests/tls/tls-smoke.sh
#
# Exit 0 = all checks passed. Exit 1 = at least one failed.
set -uo pipefail

cd "$(dirname "$0")/../.." || exit 2
REPO_ROOT=$PWD

ENV_FILE=""
while [ $# -gt 0 ]; do
  case "$1" in
    -n|--env-file) ENV_FILE="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$ENV_FILE" ] || { for f in .env.local .env; do [ -f "$f" ] && ENV_FILE=$f && break; done; }

pass=0; fail=0; skip=0
ok()   { printf '  PASS  %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  FAIL  %s%s\n' "$1" "${2:+  -> $2}"; fail=$((fail+1)); }
na()   { printf '  SKIP  %s%s\n' "$1" "${2:+  -> $2}"; skip=$((skip+1)); }
hdr()  { printf '\n== %s\n' "$1"; }

# Read a variable from the env file without sourcing it (the file holds PEM
# blocks and quoted values that a plain `source` would mangle).
env_get() {
  [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ] || return 1
  sed -n "s/^$1=//p" "$ENV_FILE" | head -1 | sed "s/^['\"]//; s/['\"]$//"
}

PROJECT_NAME=${PROJECT_NAME:-$(env_get PROJECT_NAME)}; PROJECT_NAME=${PROJECT_NAME:-d2e}
DOMAIN=${TLS__INTERNAL__DOMAIN:-$(env_get TLS__INTERNAL__DOMAIN)}; DOMAIN=${DOMAIN:-d2e.local}
PROBE_CONTAINER=${PROBE_CONTAINER:-${PROJECT_NAME}-trex}
CA_IN_PROBE=${CA_IN_PROBE:-/usr/src/cert/ca.pem}

echo "internal-TLS smoke tests"
echo "  env file:  ${ENV_FILE:-<none>}"
echo "  project:   $PROJECT_NAME"
echo "  domain:    $DOMAIN"
echo "  probe via: $PROBE_CONTAINER (CA at $CA_IN_PROBE)"

command -v docker >/dev/null 2>&1 || { echo "docker not found" >&2; exit 2; }
if ! docker exec "$PROBE_CONTAINER" sh -c "test -s $CA_IN_PROBE" 2>/dev/null; then
  echo
  echo "cannot probe: $PROBE_CONTAINER is not running, or has no CA at $CA_IN_PROBE." >&2
  echo "start the stack first (npm run start), or set PROBE_CONTAINER / CA_IN_PROBE." >&2
  exit 2
fi

# Run openssl s_client inside the probe container. -verify_hostname is what makes
# a SAN mismatch fail; -servername alone only sets SNI and verifies nothing.
handshake() {
  docker exec "$PROBE_CONTAINER" sh -c \
    "printf '' | openssl s_client -connect $1:$2 -servername $1 -verify_hostname $1 \
       -verify_return_error -CAfile $CA_IN_PROBE 2>&1" 2>/dev/null
}

# ---------------------------------------------------------------------------
hdr "A. internal TLS endpoints verify chain AND hostname"

# Discover endpoints from the compose files rather than hardcoding them, so the
# list cannot rot as services move. Matches https://<project>-<svc>.<domain>:<port>.
endpoints=$(grep -hoE 'https://\$\{PROJECT_NAME:-[a-z0-9]+\}-[a-z0-9-]+\.\$\{TLS__INTERNAL__DOMAIN:-[a-z0-9.]+\}:[0-9]+' \
              docker-compose.yml docker-compose-local.yml 2>/dev/null |
            sed -E "s|https://\\\$\{PROJECT_NAME:-[a-z0-9]+\}-|${PROJECT_NAME}-|; \
                    s|\.\\\$\{TLS__INTERNAL__DOMAIN:-[a-z0-9.]+\}|.${DOMAIN}|" |
            sort -u)

if [ -z "$endpoints" ]; then
  na "endpoint discovery" "no https://…\${TLS__INTERNAL__DOMAIN} endpoints found in the compose files"
else
  reachable=""
  for ep in $endpoints; do
    host=${ep%:*}; port=${ep##*:}
    out=$(handshake "$host" "$port")
    if grep -q 'Verify return code: 0 (ok)' <<<"$out"; then
      [ -n "$reachable" ] || reachable=$ep
      ok "$host:$port verifies (chain + hostname)"
    elif grep -qE 'Connection refused|name resolution|resolve' <<<"$out"; then
      # Not deployed in this profile — not a TLS failure.
      na "$host:$port" "not reachable (service not running in this profile)"
    else
      bad "$host:$port should verify" "$(grep -E 'verify error|Verify return code' <<<"$out" | head -1)"
    fi
  done
fi

# Negative control: a name the cert cannot cover must FAIL, otherwise the checks
# above prove nothing. Must use a *reachable* endpoint — against an unreachable one
# the connection fails first and the control would report a false failure.
if [ -z "${reachable:-}" ]; then
  na "negative control" "no reachable TLS endpoint to test it against"
else
  fhost=${reachable%:*}; fport=${reachable##*:}
  wrong="${fhost%%.*}.invalid-domain.test"
  # Dial the real host but verify the wrong name — the wrong name has no DNS entry,
  # and we want the verification to fail, not the connection.
  out=$(docker exec "$PROBE_CONTAINER" sh -c \
        "printf '' | openssl s_client -connect $fhost:$fport -servername $wrong -verify_hostname $wrong \
           -verify_return_error -CAfile $CA_IN_PROBE 2>&1" 2>/dev/null)
  if grep -qE 'hostname mismatch|Verify return code: (6[0-9]|[1-9][0-9])' <<<"$out"; then
    ok "negative control: '$wrong' is correctly rejected (checks have teeth)"
  else
    bad "negative control failed" "verification did NOT reject '$wrong' — the checks above are meaningless"
  fi
fi

# ---------------------------------------------------------------------------
hdr "B. no TLS-verification bypass"

# B1. Running containers must not carry NODE_TLS_REJECT_UNAUTHORIZED=0.
offenders=""
for c in $(docker ps --format '{{.Names}}' | grep "^${PROJECT_NAME}-" || true); do
  if docker inspect "$c" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null |
       grep -q '^NODE_TLS_REJECT_UNAUTHORIZED=0$'; then
    offenders="$offenders $c"
  fi
done
if [ -n "$offenders" ]; then bad "no container may set NODE_TLS_REJECT_UNAUTHORIZED=0" "${offenders# }"
else ok "no running container sets NODE_TLS_REJECT_UNAUTHORIZED=0"; fi

# B2. Same, in the deployment manifests (catches it before anything starts).
man_hits=$(grep -rn 'NODE_TLS_REJECT_UNAUTHORIZED' docker-compose.yml docker-compose-local.yml charts/ 2>/dev/null |
             grep -vE '^\s*#|:\s*#' | grep -E '"0"|=0|: *0' || true)
if [ -n "$man_hits" ]; then bad "no manifest may disable TLS verification" "$(head -1 <<<"$man_hits")"
else ok "no compose/chart manifest disables TLS verification"; fi

# Deliberately not asserted here: `rejectUnauthorized: false` in code. Most
# occurrences are Postgres SSL under sslmode=require, where "encrypt without
# verifying" is libpq's defined behaviour rather than a defect, plus vendored
# node_modules defaults. Auditing those needs per-call-site judgement, not a grep.
#
# Informational only: host-side helper scripts set NODE_TLS_REJECT_UNAUTHORIZED.
# They run on the developer's machine, not in the platform, so they are reported
# but not failed.
helper_hits=$(grep -rln 'NODE_TLS_REJECT_UNAUTHORIZED' scripts/ tests/ 2>/dev/null | grep -v '^tests/tls/' || true)
if [ -n "$helper_hits" ]; then
  printf '  NOTE  host-side helpers still set NODE_TLS_REJECT_UNAUTHORIZED (not a platform bypass):\n'
  printf '          %s\n' $helper_hits
fi

printf '\n== summary: %d passed, %d failed, %d skipped\n' "$pass" "$fail" "$skip"
[ "$fail" -eq 0 ]
