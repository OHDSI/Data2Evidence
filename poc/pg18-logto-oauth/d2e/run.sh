#!/bin/sh
# Start the D2E variant of the PoC: D2E Logto <-> JupyterHub <-> PostgreSQL 18.
# D2E must be running (d2e CLI). Safe to run again.
#   sh run.sh            # set up and start
#   sh run.sh --remove   # stop, and remove the PoC users/roles/app from D2E Logto
set -eu
cd "$(dirname "$0")"
poc="$(cd .. && pwd)"

export LOGTO_M2M_ID="$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_ID)"
export LOGTO_M2M_SECRET="$(docker exec d2e-logto-1 printenv LOGTO_API_M2M_CLIENT_SECRET)"
setup() {
  docker run --rm --network d2e_alp -v "$poc:/w:ro" -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET \
    python:3.12-alpine python /w/d2e/d2e_setup.py "$@"
}

if [ "${1:-}" = "--remove" ]; then
  docker compose --env-file .env.d2e down -v 2>/dev/null || docker compose down -v
  for c in $(docker ps -aq --filter 'name=^jupyter-'); do docker rm -f "$c" >/dev/null; done
  setup --remove
  rm -f .env.d2e
  exit 0
fi

# 1. D2E Logto: roles, users, hub app -> .env.d2e (gitignored)
umask 077
key="$(grep '^POC_HUB_CRYPT_KEY=' .env.d2e 2>/dev/null | cut -d= -f2- || true)"
[ -n "$key" ] || key="$(openssl rand -hex 32)"
{ setup; echo "POC_HUB_CRYPT_KEY=$key"; } > .env.d2e.new && mv .env.d2e.new .env.d2e

# 2. build what the plain images lack, once
[ -f "$poc/validator/out/pg_oidc_validator.so" ] || docker build --output "$poc/validator/out" "$poc/validator"
docker image inspect pgoauth-notebook:local >/dev/null 2>&1 || docker build -t pgoauth-notebook:local "$poc/notebook"

# 3. start pg18 and the hub
docker compose --env-file .env.d2e up -d --build
echo "open http://localhost:8000 (accept the https://localhost certificate first)"
